import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import CreateEmployeeModal from './CreateEmployeeModal';
import PasswordManagement from './PasswordManagement';
import ChangePasswordModal from './ChangePasswordModal';
import LeaveManagement from './LeaveManagement';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({});
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
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
  

  
  useEffect(() => {
    fetchData();
  }, []);
  
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
      const response = await api.get('/admin/stats');
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
      
      const response = await api.get(`/admin/attendance?${params}`);
      setAttendanceLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance logs:', error);
    }
  };

  // should be pagenated.
  const fetchEmployees = async () => {
    try {
      const response = await api.get('/admin/employees');
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

  const applyFilters = () => {
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
      const queryParams = new URLSearchParams(filters).toString();
  
      const response = await api.get(`/admin/attendance/export?${queryParams}`, {
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
      const res = await api.get(`/admin/employees-by-status?status=${status}`);
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
      const res = await api.get(`/admin/employees-by-status?status=${status}`);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header title="Admin Dashboard" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         <div
          onClick={() => handleTopCardClick("present")}
            className="bg-white rounded-lg shadow p-6 w-full text-left hover:shadow-md cursor-pointer"
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
          className="bg-white rounded-lg shadow p-6 w-full text-left hover:shadow-md cursor-pointer"
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
          className="bg-white rounded-lg shadow p-6 w-full text-left hover:shadow-md cursor-pointer"
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
          className="bg-white rounded-lg shadow p-6 w-full text-left hover:shadow-md cursor-pointer"
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
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 flex flex-col min-h-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Attendance</h3>

            <div className="relative h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={88}
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
                          transform: activeIndex === index ? 'scale(1.06)' : 'scale(1)',
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
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{stats.total_employees ?? 0}</span>
                <span className="text-xs text-gray-500">Total staff</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {pieChartData.map((item, index) => (
                <button
                  type="button"
                  key={item.name}
                  className="flex w-full items-center justify-between rounded p-2 text-left hover:bg-gray-100"
                  onClick={() => handleChartClick(item)}
                >
                  <div className="flex items-center min-w-0">
                    <div
                      className="mr-2 h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-sm text-gray-600 truncate">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 shrink-0">{item.value}</span>
                </button>
              ))}
            </div>

            {selectedStatus && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-900 capitalize">
                  Today — {selectedStatus}
                </h3>
                {filteredEmployees.length === 0 ? (
                  <p className="text-sm text-gray-500">No employees in this category</p>
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
                          <tr key={`${emp.employee_id}-${i}`} className="border-t border-gray-100 hover:bg-gray-50">
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

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="Write an announcement..."
                className="flex-1 min-w-0 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handlePostAnnouncement}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shrink-0"
              >
                Post
              </button>
            </div>

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
          <LeaveManagement />
        </div>

        {/* Password Management Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <PasswordManagement onChangePassword={handleChangePassword} />
          
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
              <button
                onClick={() => setShowCreateEmployee(true)}
                className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
              >
                <Plus className="h-5 w-5" />
                <span>Add New Employee</span>
              </button>
              
              <button
                onClick={exportToExcel}
                className="w-full btn-secondary flex items-center justify-center space-x-2 py-3"
              >
                <Download className="h-5 w-5" />
                <span>Export Attendance Report</span>
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Admin Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
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
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
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
                className="btn-secondary flex items-center space-x-2"
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
                      {attendanceLogs.length > 0 ? (
                  attendanceLogs.map((log) => (
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
                        <span className={log.office_time ? 'text-blue-600 font-medium' : 'text-gray-400'}>
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
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-xs"
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
        </div>
      </main>

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
    </div>
  );
};

export default AdminDashboard;