import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Clock, 
  Download, 
  Filter, 
  Plus, 
  Calendar,
  TrendingUp,
  UserCheck,
  UserX,
  AlertCircle,
  Camera,
  Eye,
  X,
  Upload,
  MapPin,
  FileSpreadsheet,
  Trash2,
  Building2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Info } from 'lucide-react';
import AssignEmployeesModal from './AssignEmployeesModal';
import UploadInfoModal from './UploadInfoModal';
import Header from './Header';
import AddJunctionModal from './AddJunctionModal';
import CreateEmployeeModal from './CreateEmployeeModal';
import PasswordManagement from './PasswordManagement';
import ChangePasswordModal from './ChangePasswordModal';
import LeaveManagement from './LeaveManagement';
import TeamDashboard from './TeamDashboard';
import api from '../services/api';
import toast from 'react-hot-toast';


const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const isAdmin = !!user?.is_admin;
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [employees, setEmployees] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  // New state for junction modal
  const [junctionModal, setJunctionModal] = useState({ open: false, locationId: null, team: null });

  // Existing assign modal open flag (for AssignEmployeesModal) remains
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // ... (rest of the file unchanged up to location list)

  const [selectedStatus, setSelectedStatus] = useState(null);
  const [filteredEmployees, setFilteredEmployees] = useState([]); 
  const [activeIndex, setActiveIndex] = useState(null);
  const COLORS = [
    "#22c55e", // Present (green)
    "#eab308", // Late (yellow)
    "#f97316", // Half day (orange)
    "#ef4444"  // Absent (red)
  ];
  const [filters, setFilters] = useState({
    employee_id: '',
    start_date: '',
    end_date: ''
  });
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [selectedEmployeeForPassword, setSelectedEmployeeForPassword] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [announcements, setAnnouncements] = useState([]);

  // ── Excel Upload State (per team) ────────────────────────────────────────
  const [uploadState, setUploadState] = useState({
    field: { loading: false, message: '', error: '', file: null, locations: [] },
    coc:   { loading: false, message: '', error: '', file: null, locations: [] },
    ccc:   { loading: false, message: '', error: '', file: null, locations: [] },
  });
  const fileRefs = {
    field: useRef(null),
    coc:   useRef(null),
    ccc:   useRef(null),
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch saved locations for all teams (for display in admin)
  useEffect(() => {
    ['field', 'coc', 'ccc'].forEach(team => fetchTeamLocations(team));
  }, []);

  const fetchTeamLocations = async (team) => {
    try {
      const res = await api.get(`/admin/locations/${team}`);
      setUploadState(prev => ({
        ...prev,
        [team]: { ...prev[team], locations: Array.isArray(res.data) ? res.data : [] }
      }));
    } catch (err) {
      // Non-critical — don't show toast
      console.error(`Failed to fetch ${team} locations`, err);
    }
  };

  const handleFileSelect = (team, file) => {
    setUploadState(prev => ({
      ...prev,
      [team]: { ...prev[team], file, message: '', error: '' }
    }));
  };

  const handleEmployeeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading('Uploading employees...');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/admin/employees/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(res.data.message || 'Employees uploaded successfully!', { id: toastId });
      e.target.value = '';
      fetchEmployees();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Upload failed';
      toast.error(errMsg, { id: toastId });
      e.target.value = '';
    }
  };

  const handleDownloadEmployeeSample = async () => {
    try {
      const response = await api.get('/admin/employees/sample', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample_employees_upload.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('Failed to download employee sample file');
    }
  };

  const handleUploadLocations = async (team) => {
    const state = uploadState[team];
    if (!state.file) {
      toast.error(`Please select an Excel file for ${team.toUpperCase()} team`);
      return;
    }

    setUploadState(prev => ({ ...prev, [team]: { ...prev[team], loading: true, message: '', error: '' } }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('team', team);

      const res = await api.post('/admin/locations/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadState(prev => ({
        ...prev,
        [team]: { ...prev[team], loading: false, message: res.data.message, file: null, error: '' }
      }));
      if (fileRefs[team]?.current) fileRefs[team].current.value = '';
      toast.success(res.data.message);
      // Refresh location list
      fetchTeamLocations(team);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Upload failed';
      setUploadState(prev => ({
        ...prev,
        [team]: { ...prev[team], loading: false, error: errMsg, message: '' }
      }));
      toast.error(errMsg);
    }
  };

  const handleDeleteLocation = async (team, locationId) => {
    try {
      await api.delete(`/admin/locations/${locationId}`);
      toast.success('Location deleted');
      fetchTeamLocations(team);
    } catch (err) {
      toast.error('Failed to delete location');
    }
  };
  const statusMap = {
    Present: "present",
    Late: "late",
    "Half Day": "half_day",
    Absent: "absent"
  };

  const statusKeyToLabel = {
    present: 'Present',
    late: 'Late',
    half_day: 'Half Day',
    absent: 'Absent'
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  };

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchAttendanceLogs(),
        fetchEmployees(),
        fetchAnnouncements()
      ]);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (user?.category) params.append('category', user.category);
      const response = await api.get(`/admin/stats?${params}`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchAttendanceLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (user?.category) params.append('category', user.category);
      
      const response = await api.get(`/admin/attendance?${params}`);
      setAttendanceLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance logs:', error);
    }
  };

  // should be pagenated.
  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams();
      if (user?.category) params.append('category', user.category);
      const response = await api.get(`/admin/employees?${params}`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleMonthChange = (e) => {
    const selectedMonth = e.target.value; // Format: "YYYY-MM"
    if (!selectedMonth) return;
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setFilters(prev => ({
      ...prev,
      start_date: startDate,
      end_date: endDate
    }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchAttendanceLogs();
  };

  const handleEmployeeCreated = (newEmployee) => {
    setEmployees([...employees, newEmployee]);
    fetchStats(); // Refresh stats after adding new employee
  };

  const exportToExcel = async () => {

    // ✅ Validation (try ke pehle bhi rakh sakte ho)
    if (!filters.start_date || !filters.end_date) {
      toast.error("Please select Start Date and End Date");
      return;
    }
  
    try {
      const queryParams = new URLSearchParams(filters);
      if (user?.category) queryParams.append('category', user.category);
  
      const response = await api.get(`/admin/attendance/export?${queryParams.toString()}`, {
        responseType: "blob",
      });
  
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attendance_report_${new Date().toISOString().split("T")[0]}.xlsx`
      );
  
      document.body.appendChild(link);
      link.click();
      link.remove();
  
      toast.success("Report exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export report");
    }
  };  

  const viewImage = (filename, type) => {
    if (!filename) {
      toast.error('No image available');
      return;
    }
    setSelectedImage({
      url: `${api.defaults.baseURL}/images/${filename}`,
      type: type,
      filename: filename
    });
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);  
  };

  const handleChangePassword = (employee) => {
    setSelectedEmployeeForPassword(employee);
    setShowChangePasswordModal(true);
  };

  const closeChangePasswordModal = () => {
    setShowChangePasswordModal(false);
    setSelectedEmployeeForPassword(null);
  };

  const handlePostAnnouncement = async () => {
    const text = announcement.trim();
    if (!text) return;

    try {
      await api.post('/admin/announcements', {
        message: text,
        admin_id: user?.id ?? null
      });
      setAnnouncement('');
      toast.success('Announcement posted');
      await fetchAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to post announcement');
    }
  };

  // Prepare pie chart data
  // 👇 uske niche pieChartData
  const pieChartData = [
    { name: 'Present', value: stats.present || 0 },
    { name: 'Late', value: stats.late || 0 },
    {
      name: 'Half Day',
      value: (stats.half_day_first_half || 0) + (stats.half_day_second_half || 0)
    },
    { name: 'Absent', value: stats.absent || 0 }
  ];

  const handleTopCardClick = async (status) => {
    setSelectedStatus(statusKeyToLabel[status] || status);
  
    try {
      const params = new URLSearchParams();
      params.append('status', status);
      if (user?.category) params.append('category', user.category);
      const res = await api.get(`/admin/employees-by-status?${params}`);
      setFilteredEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch employees");
    }
  };

  const handleChartClick = async (payload) => {
    const clickedName = payload?.name ?? payload?.payload?.name;
    const status = statusMap[clickedName];

    if (!status) return;

    setSelectedStatus(clickedName);

    try {
      const params = new URLSearchParams();
      params.append('status', status);
      if (user?.category) params.append('category', user.category);
      const res = await api.get(`/admin/employees-by-status?${params}`);
      setFilteredEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch employees');
    }
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  const totalItems = attendanceLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = attendanceLogs.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef8f1]">
       {/* Hanging Traffic Signal */}
<div className="absolute top-0 right-2 z-20 pointer-events-none">

  {/* Hanging Pole */}
  <div className="w-1 h-32 bg-[#60756d] mx-auto"></div>

  {/* Traffic Signal */}
  <div className="w-[68px] bg-[#26332f] rounded-2xl p-2 shadow-lg">

    {/* Red Light */}
<div className="relative w-11 h-11 mx-auto rounded-full bg-[#ef5350] shadow-[0_0_14px_rgba(239,83,80,0.65)]">
  <div className="absolute top-1.5 left-2 w-3 h-2 rounded-full bg-white opacity-60 rotate-[-25deg]"></div>
</div>

{/* Yellow Light */}
<div className="relative w-11 h-11 mx-auto mt-2 rounded-full bg-[#f2c94c] shadow-[0_0_14px_rgba(242,201,76,0.65)]">
  <div className="absolute top-1.5 left-2 w-3 h-2 rounded-full bg-white opacity-60 rotate-[-25deg]"></div>
</div>

{/* Green Light */}
<div className="relative w-11 h-11 mx-auto mt-2 rounded-full bg-[#4fbd78] shadow-[0_0_14px_rgba(79,189,120,0.65)]">
  <div className="absolute top-1.5 left-2 w-3 h-2 rounded-full bg-white opacity-60 rotate-[-25deg]"></div>
</div>
  </div>

</div>


      {/* Header */}
      <Header title="Admin Dashboard" />

     {/* Team Navigation Tabs */}
<div className="relative bg-white border-b border-gray-200 shadow-sm overflow-hidden">

  {/* Soft Pastel Background */}
  <div className="absolute inset-0 bg-gradient-to-r from-[#d9f1e5] via-[#d8eff1] to-[#d2e7f5]" />

  {/* Right Side City / Buildings */}
  <div className="absolute right-0 bottom-0 h-full w-[42%] pointer-events-none overflow-hidden">

    {/* Soft sky fade */}
    <div className="absolute inset-0 bg-gradient-to-l from-[#dff1f8]/60 to-transparent" />

    {/* Buildings */}
    <div className="absolute bottom-0 right-[4%] flex items-end gap-2 opacity-65">

      {/* Building 1 */}
      <div className="w-8 h-10 bg-[#acd8cf] rounded-t-sm">
        <div className="grid grid-cols-2 gap-1 p-1">
          <span className="h-1.5 bg-white/60 rounded-sm" />
          <span className="h-1.5 bg-white/60 rounded-sm" />
          <span className="h-1.5 bg-white/60 rounded-sm" />
          <span className="h-1.5 bg-white/60 rounded-sm" />
        </div>
      </div>

      {/* Building 2 */}
      <div className="w-10 h-16 bg-[#9fcfc9] rounded-t-sm">
        <div className="grid grid-cols-2 gap-1.5 p-1.5">
          <span className="h-2 bg-white/50 rounded-sm" />
          <span className="h-2 bg-white/50 rounded-sm" />
          <span className="h-2 bg-white/50 rounded-sm" />
          <span className="h-2 bg-white/50 rounded-sm" />
          <span className="h-2 bg-white/50 rounded-sm" />
          <span className="h-2 bg-white/50 rounded-sm" />
        </div>
      </div>

      {/* Tall Building */}
      <div className="w-12 h-24 bg-[#a7d3dd] rounded-t-md">
        <div className="grid grid-cols-2 gap-1.5 p-2">
          <span className="h-2 bg-white/50 rounded-sm" />
          <span className="h-2 bg-white/50 rounded-sm" />
          <span className="h-2 bg-white/50 rounded-sm" />
          <span className="h-2 bg-white/50 rounded-sm" />
          <span className="h-2 bg-white/50 rounded-sm" />
          <span className="h-2 bg-white/50 rounded-sm" />
        </div>
      </div>

      {/* Building 4 */}
      <div className="w-9 h-14 bg-[#b3dcd5] rounded-t-sm">
        <div className="grid grid-cols-2 gap-1 p-1.5">
          <span className="h-1.5 bg-white/60 rounded-sm" />
          <span className="h-1.5 bg-white/60 rounded-sm" />
          <span className="h-1.5 bg-white/60 rounded-sm" />
          <span className="h-1.5 bg-white/60 rounded-sm" />
        </div>
      </div>

      {/* Building 5 */}
      <div className="w-7 h-20 bg-[#afd5e5] rounded-t-sm">
        <div className="grid grid-cols-2 gap-1 p-1">
          <span className="h-1.5 bg-white/50 rounded-sm" />
          <span className="h-1.5 bg-white/50 rounded-sm" />
          <span className="h-1.5 bg-white/50 rounded-sm" />
          <span className="h-1.5 bg-white/50 rounded-sm" />
          <span className="h-1.5 bg-white/50 rounded-sm" />
          <span className="h-1.5 bg-white/50 rounded-sm" />
        </div>
      </div>

      {/* Small Building */}
      <div className="w-6 h-9 bg-[#b9ddd7] rounded-t-sm" />
    </div>

    {/* Trees */}
    <div className="absolute bottom-0 right-[2%] flex items-end gap-4 opacity-50">

      <div className="relative w-6 h-8">
        <div className="absolute bottom-0 left-[10px] w-1 h-4 bg-[#91bdb2]" />
        <div className="absolute bottom-3 left-0 w-6 h-6 rounded-full bg-[#a8d8c7]" />
      </div>

      <div className="relative w-7 h-10">
        <div className="absolute bottom-0 left-[11px] w-1 h-5 bg-[#91bdb2]" />
        <div className="absolute bottom-4 left-0 w-7 h-7 rounded-full bg-[#b2ddc8]" />
      </div>

      <div className="relative w-6 h-8">
        <div className="absolute bottom-0 left-[10px] w-1 h-4 bg-[#91bdb2]" />
        <div className="absolute bottom-3 left-0 w-6 h-6 rounded-full bg-[#a8d8c7]" />
      </div>

    </div>
  </div>

  {/* Tabs */}
  <nav className="relative flex items-center overflow-x-auto">
    {[
      { id: 'overview', label: '🏠 Overview' },
      { id: 'field', label: '🔧 Field Team' },
      { id: 'coc', label: '🖥️ COC Team' },
      { id: 'ccc', label: '💻 CCC Team' }
    ].map((tab) => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`
          relative min-w-[155px]
          px-7 py-4
          text-sm md:text-base
          font-medium
          whitespace-nowrap
          transition-all duration-300
          border-r border-[#cfe4e1]/70
          last:border-r-0

          ${
            activeTab === tab.id
              ? `
                bg-white/80
                text-[#087f73]
                shadow-[0_2px_8px_rgba(40,130,110,0.08)]
              `
              : `
                text-[#40556a]
                hover:bg-white/40
                hover:text-[#087f73]
              `
          }
        `}
      >
        <span className="relative z-10">
          {tab.label}
        </span>

        {/* Active underline */}
        {activeTab === tab.id && (
          <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-[#35a66f] to-[#69b9d5]" />
        )}
      </button>
    ))}
  </nav>
</div>

      {/* Team Dashboards */}
       {activeTab !== 'overview' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TeamDashboard team={activeTab} userCategory={user?.category} />
        </main>
      )}

      {/* Overview — existing dashboard (unchanged) */}
      {activeTab === 'overview' && (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         <div
          onClick={() => handleTopCardClick("present")}
            className="bg-white rounded-2xl border border-[#dcebe3] shadow-sm p-6 w-full text-left hover:shadow-md cursor-pointer transition-all"
            >
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-3">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Present</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.present || 0}</p>
              </div>
            </div>
          </div>

          <div
          onClick={() => handleTopCardClick("late")}
          className="bg-white rounded-2xl border border-[#dcebe3] shadow-sm p-6 w-full text-left hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center">
              <div className="bg-yellow-100 rounded-full p-3">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Late</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.late || 0}</p>
              </div>
            </div>
          </div>

          <div
          onClick={() => handleTopCardClick("half_day")}
          className="bg-white rounded-2xl border border-[#dcebe3] shadow-sm p-6 w-full text-left hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-full p-3">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Half Day</p>
                <p className="text-2xl font-semibold text-gray-900">{(stats.half_day_first_half || 0) + (stats.half_day_second_half || 0)}</p>
              </div>
            </div>
          </div>

          <div
          onClick={() => handleTopCardClick("absent")}
          className="bg-white rounded-2xl border border-[#dcebe3] shadow-sm p-6 w-full text-left hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-center">
              <div className="bg-red-100 rounded-full p-3">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.absent || 0}</p>
              </div>
            </div>
          </div>
        </div>
 
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 mb-8">
          {/* Today's Attendance + chart */}
          {/* Today's Attendance + chart */}
<div className="bg-white rounded-2xl shadow-sm border border-green-100 p-4 sm:p-5 relative overflow-hidden">

  {/* Heading */}
  <div className="flex items-center justify-between mb-2 relative z-10">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
        <span className="text-green-700 text-sm">▣</span>
      </div>
      <h3 className="text-sm font-semibold text-gray-900">
        Today&apos;s Attendance 
      </h3>
    </div>

    <span className="text-gray-400 text-lg">⋮</span>
  </div>

  {/* Chart */}
  <div className="relative h-48 w-full z-10">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>

        <Pie
          data={pieChartData}
          cx="50%"
          cy="50%"
          innerRadius={43}
          outerRadius={62}
          dataKey="value"
          label={renderCustomizedLabel}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {pieChartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index]}
              onClick={() => handleChartClick(entry)}
              style={{
                transform:
                  activeIndex === index
                    ? 'scale(1.05)'
                    : 'scale(1)',
                transformOrigin: 'center',
                transition: '0.2s',
                cursor: 'pointer'
              }}
            />
          ))}
        </Pie>

        <Tooltip />
      </PieChart>
    </ResponsiveContainer>

    {/* Center text */}
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-xl font-bold text-gray-900">
        {stats.total_employees ?? 0}
      </span>
      <span className="text-[10px] text-gray-500">
        Total staff
      </span>
    </div>
  </div>

  {/* Legend */}
  <div className="space-y-1 relative z-10">
    {pieChartData
      .filter(item => item.name === 'Present' || item.name === 'Absent')
      .map((item) => {
        const index = pieChartData.findIndex(
          x => x.name === item.name
        );

        return (
          <div
            key={item.name}
            className="flex items-center justify-between px-2 py-1 border-b border-dashed border-gray-100 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index] }}
              />
              <span className="text-xs text-gray-600">
                {item.name}
              </span>
            </div>

            <span className="text-xs font-medium text-gray-700">
              {item.value}
            </span>
          </div>
        );
      })}
  </div>

  {/* Bottom green decoration */}
  <div className="absolute bottom-0 left-0 right-0 h-8 bg-green-50 rounded-t-[50%] opacity-80"></div>

  <div className="absolute bottom-0 left-1/4 right-0 h-5 bg-green-100 rounded-t-[50%] opacity-60"></div>

  {selectedStatus && (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 relative z-20">
      <h3 className="mb-2 text-sm font-semibold text-gray-900 capitalize">
        Today — {selectedStatus}
      </h3>

      {filteredEmployees.length === 0 ? (
        <p className="text-sm text-gray-500">
          No employees in this category
        </p>
      ) : (
        <div className="max-h-56 overflow-y-auto rounded border border-gray-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-gray-100">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Employee ID</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((emp, i) => (
                <tr
                  key={`${emp.employee_id}-${i}`}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="p-2">{emp.employee_name}</td>
                  <td className="p-2">{emp.employee_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}

</div>

          {/* Announcements */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 flex flex-col min-h-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Announcements</h3>

            {!user?.category && (
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                  type="text"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Write an announcement..."
                  className="flex-1 min-w-0 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={handlePostAnnouncement}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shrink-0"
                >
                  Post
                </button>
              </div>
            )}

            <div className="space-y-3 max-h-72 overflow-y-auto flex-1">
              {announcements.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No announcements yet</p>
              ) : (
                announcements.map((item) => (
                  <div
                    key={item.id ?? item.created_at}
                    className="p-4 rounded-xl bg-gray-50 border border-gray-200"
                  >
                    <p className="text-sm text-gray-800 break-words">{item.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Leave Management Section */}
        <div className="mb-8">
          <LeaveManagement userCategory={user?.category} />
        </div>

        {/* Password Management Section */}
        <div className={!user?.category ? "grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8" : "mb-8"}>
          {!user?.category && <PasswordManagement onChangePassword={handleChangePassword} />}
          
          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <div className="bg-green-100 rounded-full p-3 mr-4">
                <Plus className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-600">Common administrative tasks</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {!user?.category && (
                <button
                  onClick={() => setShowCreateEmployee(true)}
                  className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add New Employee</span>
                </button>
              )}
              
              <button
                onClick={exportToExcel}
                className="w-full btn-secondary flex items-center justify-center space-x-2 py-3"
              >
                <Download className="h-5 w-5" />
                <span>Export Attendance Report</span>
              </button>
              
              {!user?.category && (
                <>
                  <button
                    onClick={handleDownloadEmployeeSample}
                    className="w-full btn-secondary flex items-center justify-center space-x-2 py-3"
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                    <span>Download Employee Template</span>
                  </button>

                  <div>
                    <input
                      type="file"
                      id="employee-excel-upload"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleEmployeeUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="employee-excel-upload"
                      className="w-full btn-secondary flex items-center justify-center space-x-2 py-3 cursor-pointer"
                    >
                      <Upload className="h-5 w-5" />
                      <span>Upload Employees (Excel)</span>
                    </label>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Admin Tips</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Use filters to narrow down attendance data</li>
                <li>• Export reports for record keeping</li>
                <li>• Change passwords when employees forget them</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-wrap items-center gap-3">
              <select
                name="employee_id"
                value={filters.employee_id}
                onChange={handleFilterChange}
                className="input-field"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.id} - {emp.full_name}
                  </option>
                ))}
              </select>

              <select
                onChange={handleMonthChange}
                className="input-field"
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
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                className="input-field"
              />
              
              <input
                type="date"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                className="input-field"
              />
              
              <button
                onClick={applyFilters}
                className="btn-primary flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Apply</span>
              </button>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={exportToExcel}
                className="btn-secondary flex items-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
              >
                <Download className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Attendance Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Office Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shift
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {log.employee_name}
                          </div>
                          <div className="text-sm text-gray-500">{log.employee_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={log.office_time ? 'text-green-600 font-medium' : 'text-gray-400'}>
                          {log.office_time || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status === 'present' ? 'bg-green-100 text-green-800' :
                          log.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          log.status === 'half_day' || log.status === 'half_day_first_half' || log.status === 'half_day_second_half'
                            ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {log.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.shift_type || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.user_message || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {log.check_in_photo && (
                            <button
                              onClick={() => viewImage(log.check_in_photo, 'Check In')}
                              className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-xs"
                              title="View check-in photo"
                            >
                              <Camera className="h-4 w-4" />
                              <span>In</span>
                            </button>
                          )}
                          {log.check_out_photo && (
                            <button
                              onClick={() => viewImage(log.check_out_photo, 'Check Out')}
                              className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-xs"
                              title="View check-out photo"
                            >
                              <Camera className="h-4 w-4" />
                              <span>Out</span>
                            </button>
                          )}
                          {!log.check_in_photo && !log.check_out_photo && (
                            <span className="text-gray-400 text-xs">No photos</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      No attendance records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Attendance Logs Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium focus:z-20 ${
                          currentPage === page
                            ? 'z-10 bg-green-50 border-green-500 text-green-700 font-semibold'
                            : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
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
      </main>
      )}

      {/* Create Employee Modal */}
      <CreateEmployeeModal
        isOpen={showCreateEmployee}
        onClose={() => setShowCreateEmployee(false)}
        onEmployeeCreated={handleEmployeeCreated}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={closeChangePasswordModal}
        employee={selectedEmployeeForPassword}
      />

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedImage.type} Photo
              </h3>
              <button
                onClick={closeImageModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.url}
                alt={`${selectedImage.type} photo`}
                className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
                }}
              />
              <div className="mt-4 text-sm text-gray-600 text-center">
                <p>Filename: {selectedImage.filename}</p>
                <p>Type: {selectedImage.type}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Junction Modal */}
      <AddJunctionModal
        open={junctionModal.open}
        onClose={() => setJunctionModal({ open: false, locationId: null, team: null })}
        locationId={junctionModal.locationId}
        team={junctionModal.team}
      />
    </div>
  );
};

export default AdminDashboard;