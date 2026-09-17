import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserCheck, UserX, MapPinned, MapPin, Eye, X, Upload, Download, Building, Layers, Wrench, Monitor, Clock, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import GanttChart from './GanttChart';
import FieldActivityTracker from './FieldActivityTracker';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const TEAM_LABELS = {
  field: 'Field Team',
  coc: 'COC Team',
  ccc: 'CCC Team',
  towing: 'Towing Team',
  headoffice: 'Head Office',
};

/**
 * TeamDashboard
 * -------------
 * Add-on component. AdminDashboard already renders <TeamDashboard team={activeTab} />
 * for the 'field' / 'coc' / 'ccc' / 'towing' tabs — this file supplies that component.
 * It shows the team roster with today's attendance, and (for Field, COC & Towing,
 * who move between junctions during the day) a log of before/after
 * junction-visit photos with captured GPS locations.
 */
const TeamDashboard = ({ team, userCategory }) => {
  const { user } = useAuth();
  const userId = (user?.id || '').toLowerCase();
  const isSuperAdmin = userId === 'admin001' || (!userId.includes('admin') && user?.is_admin);

  const isProjectTab = team === 'smartcity' || team === 'iitms';
  const projectFromTab = team === 'smartcity' ? 'Smart City' : team === 'iitms' ? 'IITMS' : null;

  const [selectedTeam, setSelectedTeam] = useState('field');

  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const formatUIDate = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const formatUITime = (timeStr) => {
    if (!timeStr || timeStr === '—' || timeStr === 'None') return '—';
    try {
      const d = new Date(timeStr);
      return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '—';
    }
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedProject, setSelectedProject] = useState(projectFromTab || 'Smart City');
  const [subTab, setSubTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [junctions, setJunctions] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [junctionCurrentPage, setJunctionCurrentPage] = useState(1);
  const junctionsPerPage = 10;

  const activeTeam = isProjectTab ? selectedTeam : team;
  const activeProject = isProjectTab ? (projectFromTab || 'Smart City') : (selectedProject || userCategory || 'Smart City');
  const showsJunctions = activeTeam === 'field' || activeTeam === 'towing';

  useEffect(() => {
    if (team === 'smartcity') {
      setSelectedProject('Smart City');
      setSelectedTeam('field');
    } else if (team === 'iitms') {
      setSelectedProject('IITMS');
      setSelectedTeam('field');
    }
  }, [team]);

  useEffect(() => {
    setJunctionCurrentPage(1);
  }, [activeTeam, selectedDate, activeProject]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const projectParam = `&project=${encodeURIComponent(activeProject)}&category=${encodeURIComponent(activeProject)}`;
      const calls = [
        api.get(`/admin/team/${activeTeam}/summary?date=${selectedDate}${projectParam}`),
        api.get(`/admin/team/${activeTeam}/employees?date=${selectedDate}${projectParam}`),
      ];
      if (showsJunctions) {
        calls.push(api.get(`/admin/team/${activeTeam}/junctions?date=${selectedDate}${projectParam}`));
        calls.push(api.get(`/junction/remarks?team=${activeTeam}&date=${selectedDate}${projectParam}`));
      }

      const results = await Promise.all(calls);
      setSummary(results[0].data);
      const rawMembers = Array.isArray(results[1].data) ? results[1].data : [];
      const filteredByProj = rawMembers.filter(m => {
        const catStr = (m.project || m.category || '').toLowerCase();
        if (activeProject === 'IITMS') {
          return catStr.includes('iitms');
        } else if (activeProject === 'Smart City') {
          return !catStr.includes('iitms');
        }
        return true;
      });
      setMembers(filteredByProj);
      if (showsJunctions) {
        setJunctions(Array.isArray(results[2].data) ? results[2].data : []);
        setRemarks(Array.isArray(results[3].data) ? results[3].data : []);
      }
    } catch (_error) {
      toast.error(`Failed to load ${TEAM_LABELS[activeTeam] || activeTeam} dashboard`);
    } finally {
      setLoading(false);
    }
  }, [activeTeam, showsJunctions, selectedDate, activeProject]);

  useEffect(() => {
    setJunctionCurrentPage(1);
    setRosterFilter('all');
    setSubTab('overview');
  }, [activeTeam, selectedDate, activeProject]);

  const [rosterFilter, setRosterFilter] = useState('all'); // 'all' | 'checked_in' | 'absent' | 'active_visits'

  const filteredMembers = React.useMemo(() => {
    if (rosterFilter === 'checked_in') {
      return members.filter(m => m.checked_in_today);
    }
    if (rosterFilter === 'absent') {
      return members.filter(m => !m.checked_in_today);
    }
    if (rosterFilter === 'active_visits') {
      const activeEmployeeIds = new Set(
        junctions.map(j => j.employee_id)
      );
      return members.filter(m => activeEmployeeIds.has(m.id));
    }
    return members;
  }, [members, rosterFilter, junctions]);

  useEffect(() => {
    load();
  }, [load]);

  const [junctionFilterEmp, setJunctionFilterEmp] = useState('');
  const [junctionStartDate, setJunctionStartDate] = useState('');
  const [junctionEndDate, setJunctionEndDate] = useState('');

  const [_remarksFilterEmp, _setRemarksFilterEmp] = useState('');
  const [remarksStartDate, setRemarksStartDate] = useState('');
  const [remarksEndDate, setRemarksEndDate] = useState('');

  const handleJunctionMonthChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [year, month] = val.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setJunctionStartDate(startDate);
    setJunctionEndDate(endDate);
  };

  const _handleRemarksMonthChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [year, month] = val.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setRemarksStartDate(startDate);
    setRemarksEndDate(endDate);
  };

  const handleExportJunctionsExcel = async () => {
    try {
      const toastId = toast.loading('Exporting descriptive log...');
      const params = new URLSearchParams();
      if (junctionFilterEmp) params.append('employee_id', junctionFilterEmp);
      if (junctionStartDate) params.append('start_date', junctionStartDate);
      if (junctionEndDate) params.append('end_date', junctionEndDate);
      if (!junctionStartDate && !junctionEndDate && selectedDate) {
        params.append('date', selectedDate);
      }
      const cat = activeProject || userCategory;
      if (cat) {
        params.append('category', cat);
      }

      const response = await api.get(`/admin/team/${activeTeam}/junctions/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `descriptive_log_${activeTeam}_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Descriptive log exported successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export descriptive log.');
    }
  };

  const _handleExportRemarksExcel = async () => {
    try {
      const toastId = toast.loading('Exporting remarks log...');
      const params = new URLSearchParams();
      params.append('team', activeTeam);
      if (_remarksFilterEmp) params.append('employee_id', _remarksFilterEmp);
      if (remarksStartDate) params.append('start_date', remarksStartDate);
      if (remarksEndDate) params.append('end_date', remarksEndDate);
      if (!remarksStartDate && !remarksEndDate && selectedDate) {
        params.append('date', selectedDate);
      }
      const cat = activeProject || userCategory;
      if (cat) {
        params.append('category', cat);
      }

      const response = await api.get(`/admin/remarks/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `remarks_log_${activeTeam}_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Remarks log exported successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export remarks log.');
    }
  };

  const applyJunctionFilters = async () => {
    setJunctionCurrentPage(1);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (junctionFilterEmp) params.append('employee_id', junctionFilterEmp);
      if (junctionStartDate) params.append('start_date', junctionStartDate);
      if (junctionEndDate) params.append('end_date', junctionEndDate);
      if (!junctionStartDate && !junctionEndDate && selectedDate) {
        params.append('date', selectedDate);
      }
      const cat = activeProject || userCategory;
      if (cat) {
        params.append('category', cat);
      }
      const res = await api.get(`/admin/team/${activeTeam}/junctions?${params.toString()}`);
      setJunctions(Array.isArray(res.data) ? res.data : []);
    } catch (_err) {
      toast.error('Failed to filter junctions');
    } finally {
      setLoading(false);
    }
  };

  const _applyRemarksFilters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('team', activeTeam);
      if (_remarksFilterEmp) params.append('employee_id', _remarksFilterEmp);
      if (remarksStartDate) params.append('start_date', remarksStartDate);
      if (remarksEndDate) params.append('end_date', remarksEndDate);
      if (!remarksStartDate && !remarksEndDate && selectedDate) {
        params.append('date', selectedDate);
      }
      const cat = activeProject || userCategory;
      if (cat) {
        params.append('category', cat);
      }
      const res = await api.get(`/junction/remarks?${params.toString()}`);
      setRemarks(Array.isArray(res.data) ? res.data : []);
    } catch (_err) {
      toast.error('Failed to filter remarks');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJunctionSample = async () => {
    try {
      const response = await api.get('/admin/junctions/sample', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', 'sample_junctions_upload.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Sample Excel downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download sample file.');
    }
  };

  const handleDownloadAssetFaultSample = async () => {
    try {
      const response = await api.get('/admin/asset-faults/sample', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', 'sample_asset_fault_mapping.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Asset & Fault sample Excel downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download sample file.');
    }
  };

  const handleAssetFaultUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Uploading asset & fault mapping...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/asset-faults/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Upload successful', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload file', { id: toastId });
    }
    
    // Clear input
    e.target.value = '';
  };

  const viewImage = (filename) => {
    if (!filename) {
      toast.error('No image available');
      return;
    }
    setSelectedImage(`${api.defaults.baseURL}/images/${filename}`);
  };

  const openInMaps = (loc) => {
    if (!loc) return;
    window.open(`https://www.google.com/maps?q=${loc}`, '_blank', 'noopener,noreferrer');
  };

  const handleJunctionUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading(`Uploading ${activeProject} junctions...`);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', activeProject);
    formData.append('project', activeProject);

    try {
      const res = await api.post(`/admin/junctions/upload?category=${encodeURIComponent(activeProject)}&project=${encodeURIComponent(activeProject)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Upload successful', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload file', { id: toastId });
    }
    
    // Clear input
    e.target.value = '';
  };

  const totalJunctionItems = junctions.length;
  const totalJunctionPages = Math.ceil(totalJunctionItems / junctionsPerPage);
  const junctionStartIndex = (junctionCurrentPage - 1) * junctionsPerPage;
  const junctionEndIndex = junctionStartIndex + junctionsPerPage;
  const paginatedJunctions = junctions.slice(junctionStartIndex, junctionEndIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {isProjectTab
              ? `${activeProject} - ${TEAM_LABELS[activeTeam] || activeTeam}`
              : (TEAM_LABELS[activeTeam] || activeTeam)}
          </h2>
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm w-fit">
            <span className="text-sm text-gray-500 font-semibold">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 focus:ring-0 p-0 text-sm font-semibold text-gray-950 bg-transparent cursor-pointer focus:outline-none"
            />
          </div>
        </div>
        {showsJunctions && isSuperAdmin && (
          <div className="flex items-center space-x-3">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
              id="junction-upload"
              onChange={handleJunctionUpload}
            />
            <label 
              htmlFor="junction-upload" 
              className="btn-primary flex items-center justify-center space-x-2 px-4 py-2 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm font-medium text-sm transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>
                {activeProject === 'IITMS'
                  ? 'Upload IITMS Junctions (Excel)'
                  : 'Upload Smart City Junctions, Wards & Zones (Excel)'}
              </span>
            </label>
            <button
              onClick={handleDownloadJunctionSample}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 shadow-sm font-medium text-sm transition-colors"
            >
              <Download className="h-4 w-4 text-gray-500" />
              <span>Download Sample</span>
            </button>

            {(activeTeam === 'field' || activeTeam === 'towing') && (
              <>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv"
                  style={{ display: 'none' }}
                  id="asset-fault-upload"
                  onChange={handleAssetFaultUpload}
                />
                <label 
                  htmlFor="asset-fault-upload" 
                  className="btn-primary flex items-center justify-center space-x-2 px-4 py-2 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm font-medium text-sm transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Assets & Faults (Excel)</span>
                </label>
                <button
                  onClick={handleDownloadAssetFaultSample}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 shadow-sm font-medium text-sm transition-colors"
                >
                  <Download className="h-4 w-4 text-gray-500" />
                  <span>Download Asset & Fault Sample</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Selection Boxes */}
      {isProjectTab && (
        /* Inside Smart City / IITMS: render 3 Team Selection Boxes side-by-side */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-teal-100 shadow-sm">
          <button
            type="button"
            onClick={() => setSelectedTeam('field')}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${
              activeTeam === 'field'
                ? 'bg-teal-700 text-white border-teal-800 shadow-md scale-[1.01]'
                : 'bg-teal-50/40 text-gray-800 border-teal-200 hover:bg-teal-100/60'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${activeTeam === 'field' ? 'bg-white/20 text-white' : 'bg-teal-200 text-teal-900'}`}>
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Field Team</h3>
                <p className={`text-xs ${activeTeam === 'field' ? 'text-teal-100' : 'text-gray-500'}`}>
                  Field Team Employees
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              activeTeam === 'field' ? 'bg-white text-teal-900' : 'bg-teal-200 text-teal-900'
            }`}>
              {activeTeam === 'field' ? '✓ Active' : 'Select'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTeam('coc')}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${
              activeTeam === 'coc'
                ? 'bg-teal-700 text-white border-teal-800 shadow-md scale-[1.01]'
                : 'bg-teal-50/40 text-gray-800 border-teal-200 hover:bg-teal-100/60'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${activeTeam === 'coc' ? 'bg-white/20 text-white' : 'bg-teal-200 text-teal-900'}`}>
                <Monitor className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">COC Team</h3>
                <p className={`text-xs ${activeTeam === 'coc' ? 'text-teal-100' : 'text-gray-500'}`}>
                  COC Team Employees
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              activeTeam === 'coc' ? 'bg-white text-teal-900' : 'bg-teal-200 text-teal-900'
            }`}>
              {activeTeam === 'coc' ? '✓ Active' : 'Select'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTeam('ccc')}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${
              activeTeam === 'ccc'
                ? 'bg-teal-700 text-white border-teal-800 shadow-md scale-[1.01]'
                : 'bg-teal-50/40 text-gray-800 border-teal-200 hover:bg-teal-100/60'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${activeTeam === 'ccc' ? 'bg-white/20 text-white' : 'bg-teal-200 text-teal-900'}`}>
                <Monitor className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">CCC Team</h3>
                <p className={`text-xs ${activeTeam === 'ccc' ? 'text-teal-100' : 'text-gray-500'}`}>
                  CCC Team Employees
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              activeTeam === 'ccc' ? 'bg-white text-teal-900' : 'bg-teal-200 text-teal-900'
            }`}>
              {activeTeam === 'ccc' ? '✓ Active' : 'Select'}
            </span>
          </button>
        </div>
      )}

      {/* Sub-Tabs Switcher */}
      {activeTeam !== 'headoffice' && (
        <div className="flex items-center space-x-3 bg-white p-1.5 rounded-2xl w-fit border border-gray-200 shadow-2xs">
          <button
            onClick={() => setSubTab('overview')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center space-x-2 ${
              subTab === 'overview'
                ? 'bg-[#0d7a5f] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Overview & Attendance</span>
          </button>
          <button
            onClick={() => setSubTab('activity_tracker')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center space-x-2 ${
              subTab === 'activity_tracker'
                ? 'bg-[#0d7a5f] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>📍 Live Location Map</span>
          </button>
        </div>
      )}

      {subTab === 'activity_tracker' && activeTeam !== 'headoffice' ? (
        <FieldActivityTracker team={activeTeam} userCategory={activeProject || userCategory} />
      ) : (
        <>
          {/* 5 Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div 
              onClick={() => setRosterFilter('all')}
              className={`bg-white rounded-2xl border border-[#dcebe3] shadow-sm p-5 w-full text-left hover:shadow-md cursor-pointer transition-all ${
                rosterFilter === 'all' ? 'ring-2 ring-teal-500' : ''
              }`}
            >
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-3"><Users className="h-6 w-6 text-blue-600" /></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Staff</p>
                  <p className="text-2xl font-semibold text-gray-900">{summary?.total_members ?? 0}</p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setRosterFilter('checked_in')}
              className={`bg-white rounded-2xl border border-[#dcebe3] shadow-sm p-5 w-full text-left hover:shadow-md cursor-pointer transition-all ${
                rosterFilter === 'checked_in' ? 'ring-2 ring-teal-500' : ''
              }`}
            >
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-3"><UserCheck className="h-6 w-6 text-green-600" /></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Ontime</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {summary?.ontime ?? Math.max(0, (summary?.checked_in_today ?? 0) - (summary?.late ?? 0))}
                  </p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setRosterFilter('checked_in')}
              className={`bg-white rounded-2xl border border-[#dcebe3] shadow-sm p-5 w-full text-left hover:shadow-md cursor-pointer transition-all ${
                rosterFilter === 'checked_in' ? 'ring-2 ring-teal-500' : ''
              }`}
            >
              <div className="flex items-center">
                <div className="bg-yellow-100 rounded-full p-3"><Clock className="h-6 w-6 text-yellow-600" /></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Late</p>
                  <p className="text-2xl font-semibold text-gray-900">{summary?.late ?? 0}</p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setRosterFilter('checked_in')}
              className={`bg-white rounded-2xl border border-[#dcebe3] shadow-sm p-5 w-full text-left hover:shadow-md cursor-pointer transition-all ${
                rosterFilter === 'checked_in' ? 'ring-2 ring-teal-500' : ''
              }`}
            >
              <div className="flex items-center">
                <div className="bg-orange-100 rounded-full p-3"><AlertCircle className="h-6 w-6 text-orange-600" /></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Half Day</p>
                  <p className="text-2xl font-semibold text-gray-900">{summary?.half_day ?? 0}</p>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setRosterFilter('absent')}
              className={`bg-white rounded-2xl border border-[#dcebe3] shadow-sm p-5 w-full text-left hover:shadow-md cursor-pointer transition-all ${
                rosterFilter === 'absent' ? 'ring-2 ring-teal-500' : ''
              }`}
            >
              <div className="flex items-center">
                <div className="bg-red-100 rounded-full p-3"><UserX className="h-6 w-6 text-red-600" /></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-2xl font-semibold text-gray-900">{summary?.absent_today ?? 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Attendance Pie Chart (WITHOUT Announcements) */}
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                    <span className="text-green-700 text-sm">▣</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Today&apos;s Attendance
                  </h3>
                </div>
              </div>

              <div className="relative h-48 w-full z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Ontime', value: summary?.ontime ?? Math.max(0, (summary?.checked_in_today ?? 0) - (summary?.late ?? 0)) },
                        { name: 'Late', value: summary?.late ?? 0 },
                        { name: 'Half Day', value: summary?.half_day ?? 0 },
                        { name: 'Absent', value: summary?.absent_today ?? 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={43}
                      outerRadius={62}
                      dataKey="value"
                    >
                      {['#22c55e', '#eab308', '#f97316', '#ef4444'].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">
                    {summary?.total_members ?? 0}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Total staff
                  </span>
                </div>
              </div>
            </div>
          </div>

      {/* Roster */}
      <div className="md-card overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Team Roster — Today's Attendance{' '}
          <span className="text-sm font-normal text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            {rosterFilter === 'all' ? 'All Members' : 
             rosterFilter === 'checked_in' ? 'Checked In Today' : 
             rosterFilter === 'absent' ? 'Absent Today' : 'Active Junction Visits'}
          </span>
        </h3>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-4">Employee ID</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Designation</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Check-in</th>
              <th className="py-2 pr-4">Check-out</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50/30">
                <td className="py-2 pr-4 font-medium text-gray-900">{m.id}</td>
                <td className="py-2 pr-4">{m.full_name}</td>
                <td className="py-2 pr-4 text-gray-600">{m.designation || '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`md-chip ${m.checked_in_today ? 'md-chip-success' : 'md-chip-danger'}`}>
                    {m.checked_in_today ? (m.status || 'present') : 'absent'}
                  </span>
                </td>
                <td className="py-2 pr-4">{formatUITime(m.check_in_time)}</td>
                <td className="py-2 pr-4">{formatUITime(m.check_out_time)}</td>
              </tr>
            ))}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500 font-medium">
                  No employees match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Junction visit log (Field & COC only) */}
      {showsJunctions && (
        <div className="space-y-8">
          
          {/* Gantt / Timeline Chart */}
          {junctions.length > 0 && <GanttChart junctions={junctions} />}

          <div className="md-card overflow-x-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Junction Visits — Descriptive Log</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={junctionFilterEmp}
                  onChange={(e) => setJunctionFilterEmp(e.target.value)}
                  className="input-field text-xs py-1.5 px-2"
                >
                  <option value="">All Employees</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.id} - {m.full_name}</option>
                  ))}
                </select>

                <select
                  onChange={handleJunctionMonthChange}
                  className="input-field text-xs py-1.5 px-2"
                  defaultValue=""
                >
                  <option value="" disabled>Select Month...</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                    return <option key={val} value={val}>{label}</option>;
                  })}
                </select>

                <input
                  type="date"
                  value={junctionStartDate}
                  onChange={(e) => setJunctionStartDate(e.target.value)}
                  className="input-field text-xs py-1.5 px-2"
                />

                <input
                  type="date"
                  value={junctionEndDate}
                  onChange={(e) => setJunctionEndDate(e.target.value)}
                  className="input-field text-xs py-1.5 px-2"
                />

                <button
                  onClick={applyJunctionFilters}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-medium"
                >
                  Apply
                </button>
              </div>

              <button
                onClick={handleExportJunctionsExcel}
                className="btn-primary flex items-center justify-center space-x-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm font-medium text-xs transition-colors shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Descriptive Log (Excel)</span>
              </button>
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Junction & Type</th>
                  <th className="py-2 pr-4">Ward</th>
                  <th className="py-2 pr-4">Zone</th>
                  <th className="py-2 pr-4">Visit Date</th>
                  <th className="py-2 pr-4">Before / After Photo</th>
                  <th className="py-2 pr-4">Locations</th>
                  <th className="py-2 pr-4">Remark</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedJunctions.map((j) => {
                   const startedAtDate = j.started_at ? new Date(j.started_at) : null;
                   const now = new Date();
                   const diffDays = startedAtDate ? (now - startedAtDate) / (1000 * 60 * 60 * 24) : 0;
                   let isOverdue = false;
                   if (j.status === 'in_progress') {
                      if (j.visit_type === 'Regular Visit' && diffDays > 1) isOverdue = true;
                      if (j.visit_type === 'Down Call Visit' && diffDays > 10) isOverdue = true;
                   }

                   return (
                    <tr key={j.id} className={`border-b ${isOverdue ? 'bg-red-50' : 'border-gray-100'}`}>
                      <td className="py-2 pr-4">
                        <div className={`font-medium ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>{j.employee_name}</div>
                        <div className="text-xs text-gray-500">{j.employee_id}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                          {j.junction_name}
                          {j.visit_count !== undefined && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800" title="Total visits to this junction">
                              {j.visit_count} {j.visit_count === 1 ? 'visit' : 'visits'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{j.visit_type || 'Regular Visit'}</div>
                        {isOverdue && <div className="text-xs text-red-600 mt-1 font-bold">⚠️ OVERDUE</div>}
                        {(j.asset_type || j.fault_type) && (
                          <div className="text-[11px] text-gray-600 mt-1 bg-gray-100 px-1.5 py-0.5 rounded inline-block max-w-full truncate border border-gray-200">
                            {j.asset_type && <span>Asset: <strong className="text-gray-800">{j.asset_type}</strong></span>}
                            {j.asset_type && j.fault_type && <span className="mx-1">•</span>}
                            {j.fault_type && <span>Fault: <strong className="text-red-700">{j.fault_type}</strong></span>}
                          </div>
                        )}
                        {j.call_visits && j.call_visits.length > 0 && (
                          <div className="mt-3 pl-3 border-l-2 border-blue-400 space-y-2">
                            <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Call Visit Logs ({j.call_visits.length})</div>
                            {j.call_visits.map((cv, idx) => (
                              <div key={cv.id} className="text-[11px] bg-blue-50/50 p-2 rounded border border-blue-100/50 space-y-1">
                                <div className="flex justify-between items-center text-[9px] text-gray-500 font-semibold">
                                  <span>Attempt #{idx + 1} ({cv.status === 'completed' ? 'Completed' : 'Unresolved'})</span>
                                  <span>{cv.started_at && !isNaN(new Date(cv.started_at).getTime()) ? new Date(cv.started_at).toLocaleString() : '—'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <div>
                                    <span className="font-semibold text-gray-500 text-[9px] block">Before Photo & Loc:</span>
                                    <div className="flex gap-1.5 items-center mt-0.5">
                                      {cv.before_photo ? (
                                        <button onClick={() => viewImage(cv.before_photo)} className="text-primary-600 hover:underline flex items-center gap-0.5 text-[9px]">
                                          <Eye className="h-2.5 w-2.5" /> Photo
                                        </button>
                                      ) : <span className="text-[9px] text-gray-400">No Photo</span>}
                                      {cv.before_location && (
                                        <button onClick={() => openInMaps(cv.before_location)} className="text-primary-600 hover:underline text-[9px]">
                                          Map
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-500 text-[9px] block">After Photo & Loc:</span>
                                    <div className="flex gap-1.5 items-center mt-0.5">
                                      {cv.after_photo ? (
                                        <button onClick={() => viewImage(cv.after_photo)} className="text-primary-600 hover:underline flex items-center gap-0.5 text-[9px]">
                                          <Eye className="h-2.5 w-2.5" /> Photo
                                        </button>
                                      ) : <span className="text-[9px] text-gray-400">No Photo</span>}
                                      {cv.after_location && (
                                        <button onClick={() => openInMaps(cv.after_location)} className="text-primary-600 hover:underline text-[9px]">
                                          Map
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {(cv.before_remark || cv.remark) && (
                                  <div className="text-[9px] text-gray-700 bg-white p-1.5 rounded mt-1 border border-gray-100">
                                    {cv.before_remark && <div><strong>Before:</strong> {cv.before_remark}</div>}
                                    {cv.remark && <div><strong>After:</strong> {cv.remark}</div>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-600 font-medium">{j.ward || '—'}</td>
                      <td className="py-2 pr-4 text-gray-600 font-medium">{j.zone || '—'}</td>
                      <td className="py-2 pr-4 text-gray-600 font-medium">{formatUIDate(j.date)}</td>
                      <td className="py-2 pr-4 space-y-2">
                        {j.before_photo ? (
                          <button onClick={() => viewImage(j.before_photo)} className="text-primary-600 hover:underline flex items-center gap-1 text-xs">
                            <Eye className="h-3 w-3" /> Before
                          </button>
                        ) : <span className="text-xs text-gray-400">No Before</span>}
                        {j.after_photo ? (
                          <button onClick={() => viewImage(j.after_photo)} className="text-primary-600 hover:underline flex items-center gap-1 text-xs">
                            <Eye className="h-3 w-3" /> After
                          </button>
                        ) : <span className="text-xs text-gray-400">No After</span>}
                      </td>
                      <td className="py-2 pr-4 space-y-1 text-xs">
                        <div>
                          <span className="font-semibold text-gray-600">Before: </span>
                          {j.before_location ? (
                            <button onClick={() => openInMaps(j.before_location)} className="text-primary-600 hover:underline">Map</button>
                          ) : '—'}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">After: </span>
                          {j.after_location ? (
                            <button onClick={() => openInMaps(j.after_location)} className="text-primary-600 hover:underline">Map</button>
                          ) : '—'}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-xs space-y-1">
                        {j.before_remark && (
                          <div>
                            <span className="font-semibold text-gray-500">Before:</span>{' '}
                            <span className="italic text-gray-700">{j.before_remark}</span>
                          </div>
                        )}
                        {j.remark && (
                          <div>
                            <span className="font-semibold text-gray-500">After:</span>{' '}
                            <span className="italic text-gray-700">{j.remark}</span>
                          </div>
                        )}
                        {!j.before_remark && !j.remark && <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`md-chip ${
                          j.status === 'completed' ? 'md-chip-success' : 
                          j.status === 'unresolved' ? 'md-chip-warning' : 'md-chip-danger'
                        }`}>
                          {j.status === 'completed' ? 'Completed' : j.status === 'unresolved' ? 'Unresolved' : 'Open'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {junctions.length === 0 && (
                  <tr><td colSpan={9} className="py-6 text-center text-gray-500">No junction visits logged today.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Junction Visits Pagination Controls */}
          {totalJunctionPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setJunctionCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={junctionCurrentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setJunctionCurrentPage(prev => Math.min(prev + 1, totalJunctionPages))}
                  disabled={junctionCurrentPage === totalJunctionPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{junctionStartIndex + 1}</span> to <span className="font-medium">{Math.min(junctionEndIndex, totalJunctionItems)}</span> of{' '}
                    <span className="font-medium">{totalJunctionItems}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setJunctionCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={junctionCurrentPage === 1}
                      className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalJunctionPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setJunctionCurrentPage(page)}
                        className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium focus:z-20 ${
                          junctionCurrentPage === page
                            ? 'z-10 bg-green-50 border-green-500 text-green-700 font-semibold'
                            : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setJunctionCurrentPage(prev => Math.min(prev + 1, totalJunctionPages))}
                      disabled={junctionCurrentPage === totalJunctionPages}
                      className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}



        </div>
      )}
      </>
      )}

      {/* Image modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white rounded-lg p-3 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setSelectedImage(null)}><X className="h-5 w-5" /></button>
            </div>
            <img src={selectedImage} alt="junction" className="w-full rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDashboard;
