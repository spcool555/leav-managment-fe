import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, UserCheck, UserX, MapPinned, Eye, X, Upload, Download } from 'lucide-react';
import GanttChart from './GanttChart';
import api from '../services/api';
import toast from 'react-hot-toast';

const TEAM_LABELS = {
  field: 'Field Team',
  coc: 'COC Team',
  ccc: 'CCC Team',
};

/**
 * TeamDashboard
 * -------------
 * Add-on component. AdminDashboard already renders <TeamDashboard team={activeTab} />
 * for the 'field' / 'coc' / 'ccc' tabs — this file supplies that component.
 * It shows the team roster with today's attendance, and (for Field & COC,
 * who move between junctions during the day) a log of before/after
 * junction-visit photos with captured GPS locations.
 */
const TeamDashboard = ({ team, userCategory }) => {
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

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [junctions, setJunctions] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  const showsJunctions = team === 'field' || team === 'coc';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const categoryParam = userCategory ? `&category=${encodeURIComponent(userCategory)}` : '';
      const calls = [
        api.get(`/admin/team/${team}/summary?date=${selectedDate}${categoryParam}`),
        api.get(`/admin/team/${team}/employees?date=${selectedDate}${categoryParam}`),
      ];
      if (showsJunctions) {
        calls.push(api.get(`/admin/team/${team}/junctions?date=${selectedDate}${categoryParam}`));
        calls.push(api.get(`/junction/remarks?team=${team}&date=${selectedDate}${categoryParam}`));
      }

      const results = await Promise.all(calls);
      setSummary(results[0].data);
      setMembers(Array.isArray(results[1].data) ? results[1].data : []);
      if (showsJunctions) {
        setJunctions(Array.isArray(results[2].data) ? results[2].data : []);
        setRemarks(Array.isArray(results[3].data) ? results[3].data : []);
      }
    } catch (error) {
      toast.error(`Failed to load ${TEAM_LABELS[team] || team} dashboard`);
    } finally {
      setLoading(false);
    }
  }, [team, showsJunctions, selectedDate, userCategory]);

  useEffect(() => {
    load();
  }, [load]);

  const [junctionFilterEmp, setJunctionFilterEmp] = useState('');
  const [junctionStartDate, setJunctionStartDate] = useState('');
  const [junctionEndDate, setJunctionEndDate] = useState('');

  const [remarksFilterEmp, setRemarksFilterEmp] = useState('');
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

  const handleRemarksMonthChange = (e) => {
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
      if (userCategory) {
        params.append('category', userCategory);
      }

      const response = await api.get(`/admin/team/${team}/junctions/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `descriptive_log_${team}_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Descriptive log exported successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export descriptive log.');
    }
  };

  const handleExportRemarksExcel = async () => {
    try {
      const toastId = toast.loading('Exporting remarks log...');
      const params = new URLSearchParams();
      params.append('team', team);
      if (remarksFilterEmp) params.append('employee_id', remarksFilterEmp);
      if (remarksStartDate) params.append('start_date', remarksStartDate);
      if (remarksEndDate) params.append('end_date', remarksEndDate);
      if (!remarksStartDate && !remarksEndDate && selectedDate) {
        params.append('date', selectedDate);
      }
      if (userCategory) {
        params.append('category', userCategory);
      }

      const response = await api.get(`/admin/remarks/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `remarks_log_${team}_${selectedDate}.xlsx`);
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
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (junctionFilterEmp) params.append('employee_id', junctionFilterEmp);
      if (junctionStartDate) params.append('start_date', junctionStartDate);
      if (junctionEndDate) params.append('end_date', junctionEndDate);
      if (!junctionStartDate && !junctionEndDate && selectedDate) {
        params.append('date', selectedDate);
      }
      if (userCategory) {
        params.append('category', userCategory);
      }
      const res = await api.get(`/admin/team/${team}/junctions?${params.toString()}`);
      setJunctions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to filter junctions');
    } finally {
      setLoading(false);
    }
  };

  const applyRemarksFilters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('team', team);
      if (remarksFilterEmp) params.append('employee_id', remarksFilterEmp);
      if (remarksStartDate) params.append('start_date', remarksStartDate);
      if (remarksEndDate) params.append('end_date', remarksEndDate);
      if (!remarksStartDate && !remarksEndDate && selectedDate) {
        params.append('date', selectedDate);
      }
      if (userCategory) {
        params.append('category', userCategory);
      }
      const res = await api.get(`/junction/remarks?${params.toString()}`);
      setRemarks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
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

    const toastId = toast.loading('Uploading junctions...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/junctions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Upload successful', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload file', { id: toastId });
    }
    
    // Clear input
    e.target.value = '';
  };

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
          <h2 className="text-2xl font-bold text-gray-900">{TEAM_LABELS[team] || team}</h2>
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm w-fit">
            <span className="text-sm font-medium text-gray-500 font-semibold">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 focus:ring-0 p-0 text-sm font-semibold text-gray-950 bg-transparent cursor-pointer focus:outline-none"
            />
          </div>
        </div>
        {showsJunctions && !userCategory && (
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
              <span>Upload Junctions (Excel)</span>
            </label>
            <button
              onClick={handleDownloadJunctionSample}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 shadow-sm font-medium text-sm transition-colors"
            >
              <Download className="h-4 w-4 text-gray-500" />
              <span>Download Sample</span>
            </button>

            {team === 'field' && (
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="md-card flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary-100"><Users className="h-5 w-5 text-primary-700" /></div>
          <div>
            <div className="text-xs text-gray-500">Total Members</div>
            <div className="text-xl font-bold text-gray-900">{summary?.total_members ?? 0}</div>
          </div>
        </div>
        <div className="md-card flex items-center gap-3">
          <div className="p-3 rounded-full bg-green-100"><UserCheck className="h-5 w-5 text-green-700" /></div>
          <div>
            <div className="text-xs text-gray-500">Checked In Today</div>
            <div className="text-xl font-bold text-gray-900">{summary?.checked_in_today ?? 0}</div>
          </div>
        </div>
        <div className="md-card flex items-center gap-3">
          <div className="p-3 rounded-full bg-red-100"><UserX className="h-5 w-5 text-red-700" /></div>
          <div>
            <div className="text-xs text-gray-500">Absent Today</div>
            <div className="text-xl font-bold text-gray-900">{summary?.absent_today ?? 0}</div>
          </div>
        </div>
        {showsJunctions && (
          <div className="md-card flex items-center gap-3">
            <div className="p-3 rounded-full bg-amber-100"><MapPinned className="h-5 w-5 text-amber-700" /></div>
            <div>
              <div className="text-xs text-gray-500">Active Junction Visits</div>
              <div className="text-xl font-bold text-gray-900">{summary?.active_junctions ?? 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="md-card overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Roster — Today's Attendance</h3>
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
            {members.map((m) => (
              <tr key={m.id} className="border-b border-gray-100">
                <td className="py-2 pr-4 font-medium text-gray-900">{m.id}</td>
                <td className="py-2 pr-4">{m.full_name}</td>
                <td className="py-2 pr-4 text-gray-600">{m.designation || '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`md-chip ${m.checked_in_today ? 'md-chip-success' : 'md-chip-danger'}`}>
                    {m.checked_in_today ? (m.status || 'present') : 'absent'}
                  </span>
                </td>
                <td className="py-2 pr-4">{m.check_in_time ? new Date(m.check_in_time).toLocaleTimeString() : '—'}</td>
                <td className="py-2 pr-4">{m.check_out_time ? new Date(m.check_out_time).toLocaleTimeString() : '—'}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-500">No employees mapped to this team yet.</td></tr>
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
                {junctions.map((j) => {
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
                      <td className="py-2 pr-4 text-xs">
                        {j.remark ? <span className="italic text-gray-700">{j.remark}</span> : <span className="text-gray-400">—</span>}
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
                  <tr><td colSpan={6} className="py-6 text-center text-gray-500">No junction visits logged today.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Junction Remarks & Issue Messages Log */}
          <div className="md-card overflow-x-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Junction Remarks & Issue Messages Log</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={remarksFilterEmp}
                  onChange={(e) => setRemarksFilterEmp(e.target.value)}
                  className="input-field text-xs py-1.5 px-2"
                >
                  <option value="">All Employees</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.id} - {m.full_name}</option>
                  ))}
                </select>

                <select
                  onChange={handleRemarksMonthChange}
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
                  value={remarksStartDate}
                  onChange={(e) => setRemarksStartDate(e.target.value)}
                  className="input-field text-xs py-1.5 px-2"
                />

                <input
                  type="date"
                  value={remarksEndDate}
                  onChange={(e) => setRemarksEndDate(e.target.value)}
                  className="input-field text-xs py-1.5 px-2"
                />

                <button
                  onClick={applyRemarksFilters}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                >
                  Apply
                </button>
              </div>

              <button
                onClick={handleExportRemarksExcel}
                className="btn-primary flex items-center justify-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-medium text-xs transition-colors shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Remarks (Excel)</span>
              </button>
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4">Time (IST)</th>
                  <th className="py-2 pr-4">Employee</th>
                  <th className="py-2 pr-4">Junction Name</th>
                  <th className="py-2 pr-4">Remark / Issue Message</th>
                </tr>
              </thead>
              <tbody>
                {remarks.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-xs text-gray-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="font-semibold text-gray-900">{r.employee_name}</div>
                      <div className="text-xs text-gray-500">{r.employee_id}</div>
                    </td>
                    <td className="py-2 pr-4 font-semibold text-gray-800">{r.junction_name}</td>
                    <td className="py-2 pr-4 italic text-gray-700">{r.remark}</td>
                  </tr>
                ))}
                {remarks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      No remarks/issue messages logged for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
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
