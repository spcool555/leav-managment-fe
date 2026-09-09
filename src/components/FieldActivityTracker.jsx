import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Navigation, 
  RefreshCw, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  ExternalLink,
  Users,
  Route
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const FieldActivityTracker = ({ team = 'field', userCategory }) => {
  const getTodayStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [viewMode, setViewMode] = useState('weekly'); // 'daily' | 'weekly' | 'monthly'
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [employeesList, setEmployeesList] = useState([]);
  const [trackerData, setTrackerData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  // Embedded Map Drawer State (Same page display)
  const [mapModal, setMapModal] = useState({
    open: false,
    title: '',
    coords: [],
    targetCoord: null,
    externalUrl: ''
  });

  // Fetch employees list for dropdown
  useEffect(() => {
    const fetchEmps = async () => {
      try {
        const catParam = userCategory ? `?category=${encodeURIComponent(userCategory)}` : '';
        const res = await api.get(`/admin/team/${team}/employees${catParam}`);
        if (Array.isArray(res.data)) {
          setEmployeesList(res.data);
        }
      } catch (e) {
        console.error('Failed to fetch employees for tracker filter:', e);
      }
    };
    fetchEmps();
  }, [team, userCategory]);

  const loadTrackerData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('team', team);
      if (selectedDate) params.append('date', selectedDate);
      if (employeeFilter) params.append('employee_id', employeeFilter);
      if (userCategory) params.append('category', userCategory);

      try {
        const res = await api.get(`/admin/field-activity-tracker?${params.toString()}`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          setTrackerData(res.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.debug('Dedicated endpoint unavailable, running fallback aggregation...', err?.message);
      }

      // Fallback: Query junctions endpoint if dedicated tracker endpoint 404s or returns empty
      const jParams = new URLSearchParams();
      if (employeeFilter) jParams.append('employee_id', employeeFilter);
      if (selectedDate) jParams.append('date', selectedDate);
      if (userCategory) jParams.append('category', userCategory);

      const jRes = await api.get(`/admin/team/${team}/junctions?${jParams.toString()}`);
      const rawJunctions = Array.isArray(jRes.data) ? jRes.data : [];

      if (rawJunctions.length === 0) {
        setTrackerData([]);
        setLoading(false);
        return;
      }

      // Group junctions by employee_id -> date
      const empMap = {};
      rawJunctions.forEach(j => {
        const empId = j.employee_id || 'UNKNOWN';
        if (!empMap[empId]) {
          empMap[empId] = {
            employee_id: empId,
            full_name: j.employee_name || empId,
            team: team,
            designation: 'Field Team',
            daily_logs: {}
          };
        }

        const dStr = j.date ? j.date.split('T')[0] : selectedDate;
        if (!empMap[empId].daily_logs[dStr]) {
          empMap[empId].daily_logs[dStr] = [];
        }
        empMap[empId].daily_logs[dStr].push(j);
      });

      const fallbackList = [];
      Object.keys(empMap).forEach(empId => {
        const eData = empMap[empId];
        const dailyLogsList = [];
        let totalVisits = 0;
        let totalSiteMins = 0.0;
        let totalGapMins = 0.0;
        const allStops = [];

        const sortedDates = Object.keys(eData.daily_logs).sort().reverse();
        sortedDates.forEach(dStr => {
          const dayVisits = eData.daily_logs[dStr];
          totalVisits += dayVisits.length;

          let daySiteMins = 0.0;
          let dayGapMins = 0.0;
          const events = [];

          dayVisits.forEach(v => {
            const siteM = v.time_spent_minutes || (v.completed_at && v.started_at ? Math.round((new Date(v.completed_at) - new Date(v.started_at))/60000) : 0);
            const gapM = v.travel_time_minutes || 0;
            daySiteMins += siteM;
            dayGapMins += gapM;

            const coord = v.before_location || v.after_location;
            if (coord) allStops.push(coord);

            events.push({
              type: 'visit',
              id: v.id,
              junction_name: v.junction_name,
              visit_type: v.visit_type || 'Regular Visit',
              ward: v.ward || '',
              zone: v.zone || '',
              started_at: v.started_at,
              completed_at: v.completed_at,
              status: v.status,
              time_spent_minutes: Math.round(siteM),
              travel_time_minutes: Math.round(gapM),
              before_location: v.before_location,
              after_location: v.after_location,
              remark: v.remark || '',
              before_remark: v.before_remark || ''
            });
          });

          totalSiteMins += daySiteMins;
          totalGapMins += dayGapMins;

          dailyLogsList.push({
            date: dStr,
            visits_count: dayVisits.length,
            site_mins: Math.round(daySiteMins),
            gap_mins: Math.round(dayGapMins),
            events: events,
            stops_count: events.length
          });
        });

        fallbackList.push({
          employee_id: eData.employee_id,
          full_name: eData.full_name,
          team: eData.team,
          designation: eData.designation,
          active_days: dailyLogsList.length,
          junctions_visited: totalVisits,
          total_time_on_site: Math.round(totalSiteMins),
          total_gap_travel_time: Math.round(totalGapMins),
          stops_coords: allStops,
          daily_logs: dailyLogsList
        });
      });

      setTrackerData(fallbackList);
    } catch (err) {
      console.error('Failed to load activity tracker data:', err);
      toast.error('Failed to load activity tracker data');
    } finally {
      setLoading(false);
    }
  }, [team, selectedDate, employeeFilter, userCategory]);

  useEffect(() => {
    loadTrackerData();
  }, [loadTrackerData]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, employeeFilter, team]);

  // Navigate dates
  const handlePrevDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Format date string like "Wed, 9 Sept, 2026"
  const formatDateTitle = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(year, month - 1, day);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // Format ISO time to 12-hr format (e.g. 08:41 AM)
  const formatTimeStr = (isoStr) => {
    if (!isoStr || isoStr === '—') return '—';
    try {
      const d = new Date(isoStr);
      return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  // Open embedded side drawer on the same page instead of new tab
  const openEmbeddedMap = (title, coordsArray, singleCoord = null) => {
    if ((!coordsArray || coordsArray.length === 0) && !singleCoord) {
      toast.error('No GPS coordinates available.');
      return;
    }
    const cleanCoords = singleCoord ? [singleCoord] : coordsArray.filter(c => c && c.includes(','));
    if (cleanCoords.length === 0) {
      toast.error('No valid GPS coordinates found.');
      return;
    }

    let extUrl = '';
    if (cleanCoords.length === 1) {
      extUrl = `https://www.google.com/maps?q=${encodeURIComponent(cleanCoords[0])}`;
    } else {
      const origin = cleanCoords[0];
      const destination = cleanCoords[cleanCoords.length - 1];
      const waypoints = cleanCoords.slice(1, -1).join('|');
      extUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}`;
    }

    setMapModal({
      open: true,
      title: title,
      coords: cleanCoords,
      targetCoord: cleanCoords[0],
      externalUrl: extUrl
    });
  };

  const handleExportExcel = async () => {
    try {
      const toastId = toast.loading('Exporting Activity Excel Log...');
      const params = new URLSearchParams();
      params.append('team', team);
      if (selectedDate) params.append('date', selectedDate);
      if (employeeFilter) params.append('employee_id', employeeFilter);
      if (userCategory) params.append('category', userCategory);

      const response = await api.get(`/admin/team/${team}/junctions/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `field_activity_log_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Activity Excel exported successfully!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to export activity Excel.');
    }
  };

  // Pagination Calculations
  const totalEmployees = trackerData.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalEmployees);
  const paginatedData = trackerData.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 bg-[#f4f9f7] p-4 md:p-6 rounded-2xl border border-[#d6e8e2] relative">
      
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#e1eee9] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* View Mode Pills */}
          <div className="flex items-center gap-2 bg-[#f0f7f4] p-1.5 rounded-xl border border-[#dcebe4] self-start">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
                viewMode === 'daily' ? 'bg-[#0d7a5f] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🟡 Daily View
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
                viewMode === 'weekly' ? 'bg-[#0d7a5f] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📅 Weekly View
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
                viewMode === 'monthly' ? 'bg-[#0d7a5f] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🗓️ Monthly View
            </button>
          </div>

          {/* Export Activity Excel Button */}
          <button
            onClick={handleExportExcel}
            className="bg-[#0d7a5f] hover:bg-[#095d48] text-white text-xs md:text-sm font-bold px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all self-start md:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Export Activity (Excel)</span>
          </button>
        </div>

        {/* Date & Employee Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* Select Week Date Picker */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              SELECT WEEK (ANY DATE IN WEEK)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#0d7a5f]"
              />
              <button
                onClick={handlePrevDate}
                className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextDate}
                className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              EMPLOYEE FILTER
            </label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full border border-gray-200 bg-white rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:border-[#0d7a5f]"
            >
              <option value="">All {team === 'towing' ? 'Towing' : team === 'coc' ? 'COC' : team === 'ccc' ? 'CCC' : 'Field'} Employees ({employeesList.length})</option>
              {employeesList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.id})
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <div className="flex items-end">
            <button
              onClick={loadTrackerData}
              disabled={loading}
              className="w-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tracker Status Line */}
      <div className="flex items-center justify-between text-xs text-gray-600 font-medium px-2">
        <span>Showing {totalEmployees} active {team === 'towing' ? 'towing' : team === 'coc' ? 'COC' : team === 'ccc' ? 'CCC' : 'field'} employee{totalEmployees === 1 ? '' : 's'}</span>
        <span className="text-[#0d7a5f] font-semibold flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#0d7a5f]"></span>
          Google Maps linked for each location
        </span>
      </div>

      {/* Tracker Employee Timeline Cards */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d7a5f] mx-auto mb-2"></div>
          <p className="text-sm text-gray-500 font-medium">Loading {team === 'towing' ? 'towing location' : 'activity'} timeline...</p>
        </div>
      ) : trackerData.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Route className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-base font-semibold text-gray-700">No {team === 'towing' ? 'towing location' : team === 'coc' ? 'COC activity' : team === 'ccc' ? 'CCC activity' : 'field activity'} logs found for the selected period.</p>
          <p className="text-xs text-gray-500 mt-1">Try selecting a different date or employee filter.</p>
        </div>
      ) : (
        paginatedData.map((emp) => (
          <div key={emp.employee_id} className="bg-white rounded-2xl border border-[#e1eee9] shadow-sm p-4 md:p-6 space-y-6">
            
            {/* Employee Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-full bg-[#0d7a5f] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {emp.full_name ? emp.full_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{emp.full_name}</h3>
                  <p className="text-xs text-gray-500 font-medium">ID: {emp.employee_id} • {emp.designation || (team === 'towing' ? 'Towing Team' : 'Field Team')}</p>
                </div>
              </div>

              {/* Full Route Google Maps Button (Opens Embedded Map Drawer on Same Page) */}
              {emp.stops_coords && emp.stops_coords.length > 0 && (
                <button
                  onClick={() => openEmbeddedMap(`${emp.full_name} - Full Route (${emp.stops_coords.length} stops)`, emp.stops_coords)}
                  className="bg-[#0d7a5f] hover:bg-[#095d48] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all self-start sm:self-auto"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Full Route on Google Maps ({emp.stops_coords.length} stops)</span>
                </button>
              )}
            </div>

            {/* 4 Stat Summary Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              
              <div className="border border-gray-200/80 bg-white rounded-xl p-3.5 flex items-center space-x-3 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">ACTIVE DAYS</p>
                  <p className="text-base md:text-lg font-extrabold text-gray-900">{emp.active_days} days</p>
                </div>
              </div>

              <div className="border border-gray-200/80 bg-white rounded-xl p-3.5 flex items-center space-x-3 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {team === 'towing' ? 'LOCATIONS LOGGED' : 'JUNCTIONS VISITED'}
                  </p>
                  <p className="text-base md:text-lg font-extrabold text-gray-900">{emp.junctions_visited || emp.stops_coords?.length || 0}</p>
                </div>
              </div>

              <div className="border border-gray-200/80 bg-white rounded-xl p-3.5 flex items-center space-x-3 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">TIME ON SITE</p>
                  <p className="text-base md:text-lg font-extrabold text-gray-900">{emp.total_time_on_site} min</p>
                </div>
              </div>

              <div className="border border-gray-200/80 bg-white rounded-xl p-3.5 flex items-center space-x-3 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">GAP / TRAVEL TIME</p>
                  <p className="text-base md:text-lg font-extrabold text-gray-900">{emp.total_gap_travel_time} min</p>
                </div>
              </div>

            </div>

            {/* Daily Activity Logs Section */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                DAILY ACTIVITY LOG ({emp.daily_logs.length} ACTIVE DAYS)
              </h4>

              {emp.daily_logs.map((dayLog) => {
                const dayStopsCoords = dayLog.events
                  .map(ev => ev.location || ev.before_location || ev.after_location)
                  .filter(Boolean);

                return (
                  <div key={dayLog.date} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    
                    {/* Day Group Header */}
                    <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-3 text-xs md:text-sm font-semibold text-gray-800">
                        <span className="flex items-center space-x-1.5 text-gray-900 font-bold">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span>{formatDateTitle(dayLog.date)}</span>
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
                          {dayLog.visits_count} visits
                        </span>
                        <span className="text-gray-500 text-xs font-medium">
                          Site: {dayLog.site_mins} min
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500 text-xs font-medium">
                          Gap: {dayLog.gap_mins} min
                        </span>
                      </div>

                      {dayStopsCoords.length > 0 && (
                        <button
                          onClick={() => openEmbeddedMap(`${emp.full_name} - Route (${formatDateTitle(dayLog.date)})`, dayStopsCoords)}
                          className="bg-[#0d7a5f] hover:bg-[#095d48] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Map Route ({dayStopsCoords.length})</span>
                        </button>
                      )}
                    </div>

                    {/* Events List for this day */}
                    <div className="p-4 space-y-3">
                      {dayLog.events.map((ev, idx) => {
                        if (ev.type === 'check_in') {
                          return (
                            <div key={`checkin-${idx}`} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-xl shadow-2xs">
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                  ➔
                                </div>
                                <span className="text-xs md:text-sm font-bold text-gray-900">Shift Check-In</span>
                                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold ml-2">
                                  {formatTimeStr(ev.time)}
                                </span>
                              </div>

                              {ev.location && (
                                <button
                                  onClick={() => openEmbeddedMap(`Shift Check-In GPS (${formatTimeStr(ev.time)})`, [], ev.location)}
                                  className="text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 flex items-center space-x-1 font-mono transition-all"
                                >
                                  <MapPin className="w-3 h-3 text-emerald-600" />
                                  <span className="truncate max-w-[140px] md:max-w-[200px]">GPS: {ev.location}</span>
                                  <ExternalLink className="w-3 h-3 text-gray-400" />
                                </button>
                              )}
                            </div>
                          );
                        }

                        // Junction Visit Event Card
                        const isCompleted = ev.status === 'completed';
                        const isInProgress = ev.status === 'in_progress';
                        const cardBg = isInProgress ? 'bg-sky-50/70 border-sky-200' : (idx % 2 === 0 ? 'bg-amber-50/40 border-amber-200/80' : 'bg-emerald-50/40 border-emerald-200/80');

                        return (
                          <div key={ev.id || idx} className={`p-4 rounded-xl border space-y-2.5 transition-all ${cardBg}`}>
                            
                            {/* Title & Pills */}
                            <div className="flex items-start justify-between flex-wrap gap-2">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#0d7a5f]"></span>
                                <span className="text-sm font-bold text-gray-900">{ev.junction_name}</span>
                                
                                {ev.visit_type && (
                                  <span className="bg-white border border-gray-200 text-gray-700 text-[11px] font-medium px-2 py-0.5 rounded-md shadow-2xs">
                                    {ev.visit_type}
                                  </span>
                                )}

                                {ev.ward && (
                                  <span className="bg-purple-100/80 text-purple-900 text-[11px] font-medium px-2 py-0.5 rounded-md">
                                    Ward: {ev.ward}
                                  </span>
                                )}

                                {ev.zone && (
                                  <span className="bg-teal-100/80 text-teal-900 text-[11px] font-medium px-2 py-0.5 rounded-md">
                                    Zone: {ev.zone}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Timestamps & Duration Stats */}
                            <div className="flex items-center gap-3 text-xs flex-wrap font-medium text-gray-700 pt-1">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5 text-gray-500" />
                                <span>
                                  {formatTimeStr(ev.started_at)}
                                  {isCompleted && ev.completed_at ? ` – ${formatTimeStr(ev.completed_at)}` : (isInProgress ? ' (in progress)' : '')}
                                </span>
                              </span>

                              <span className="bg-purple-100/90 text-purple-800 font-semibold px-2.5 py-0.5 rounded-full text-[11px]">
                                ⏱️ {ev.time_spent_minutes} min on site
                              </span>

                              {Boolean(ev.travel_time_minutes) && ev.travel_time_minutes > 0 && (
                                <span className="bg-amber-100/90 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full text-[11px]">
                                  🚀 {ev.travel_time_minutes} min gap
                                </span>
                              )}
                            </div>

                            {/* Arrival Location GPS Link */}
                            {(ev.before_location || ev.after_location) && (
                              <div className="pt-1">
                                <button
                                  onClick={() => openEmbeddedMap(`${ev.junction_name} Arrival GPS`, [], ev.before_location || ev.after_location)}
                                  className="text-xs text-gray-700 bg-white hover:bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 flex items-center space-x-1 font-mono shadow-2xs transition-all inline-flex"
                                >
                                  <MapPin className="w-3 h-3 text-teal-600" />
                                  <span className="truncate max-w-[220px]">Arrival Map: {ev.before_location || ev.after_location}</span>
                                  <ExternalLink className="w-3 h-3 text-gray-400" />
                                </button>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        ))
      )}

      {/* Pagination Bar */}
      {totalEmployees > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-[#e1eee9] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-xs font-medium text-gray-600">
            <span>Showing <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalEmployees}</strong> employees</span>
            <div className="flex items-center space-x-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded-lg text-xs px-2 py-1 bg-white font-bold text-gray-800 focus:outline-none"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentPage === pg ? 'bg-[#0d7a5f] text-white shadow-xs' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Embedded Side Panel Drawer for Google Maps (Same Page View) */}
      {mapModal.open && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="bg-[#0d7a5f] text-white p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base md:text-lg truncate max-w-md">{mapModal.title}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={mapModal.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all"
                  title="Open in Google Maps App"
                >
                  <span>Open App</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setMapModal({ open: false, title: '', coords: [], targetCoord: null, externalUrl: '' })}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-white font-bold text-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Embedded Map iframe */}
            <div className="relative w-full h-[380px] bg-gray-100 border-b border-gray-200 shrink-0">
              <iframe
                title="Embedded Location Map"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapModal.targetCoord || mapModal.coords[0])}&z=15&output=embed`}
                allowFullScreen
              ></iframe>
            </div>

            {/* Route Stops / Waypoints List (Check-In to Check-Out) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8faf9]">
              <div className="flex items-center justify-between text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                <span>Stops & Trajectory ({mapModal.coords.length})</span>
                <span className="text-emerald-700 font-semibold">Click stop to center map</span>
              </div>

              {mapModal.coords.map((coord, idx) => (
                <div
                  key={idx}
                  onClick={() => setMapModal(prev => ({ ...prev, targetCoord: coord }))}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    mapModal.targetCoord === coord ? 'bg-emerald-50 border-[#0d7a5f] shadow-2xs font-semibold' : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0 ? 'bg-emerald-600 text-white' : (idx === mapModal.coords.length - 1 ? 'bg-indigo-600 text-white' : 'bg-teal-100 text-teal-800')
                    }`}>
                      {idx === 0 ? 'Start' : (idx === mapModal.coords.length - 1 ? 'End' : idx + 1)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {idx === 0 ? 'Shift Check-In Location' : (idx === mapModal.coords.length - 1 ? 'Latest / Check-Out Stop' : `Stop #${idx + 1}`)}
                      </p>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">{coord}</p>
                    </div>
                  </div>

                  <span className="text-xs text-[#0d7a5f] font-semibold">Center Map ↗</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default FieldActivityTracker;
