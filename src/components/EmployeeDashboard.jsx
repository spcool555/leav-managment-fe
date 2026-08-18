import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, User, Camera, MapPin, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import LeaveRequestModal from './LeaveRequestModal';
import EditLeaveModal from './EditLeaveModal';
import LeaveHistory from './LeaveHistory';
import JunctionVisitPanel from './JunctionVisitPanel';
import api from '../services/api';
import toast from 'react-hot-toast';

// Small traffic signal icon (used as a decorative accent in the hero banner)
const TrafficLight = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size * 2.3}
    viewBox="0 0 20 46"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="8" y="0" width="4" height="9" fill="#374151" />
    <rect x="1.5" y="9" width="17" height="27" rx="4" fill="#1f2937" stroke="#111827" strokeWidth="0.5" />
    <circle cx="10" cy="16" r="3" fill="#ef4444" />
    <circle cx="10" cy="22.5" r="3" fill="#fbbf24" />
    <circle cx="10" cy="29" r="3" fill="#22c55e" />
    <rect x="6" y="36" width="8" height="9" fill="#374151" />
    <rect x="2" y="44" width="16" height="2" rx="1" fill="#111827" />
  </svg>
);

// Decorative city skyline used behind the "Welcome back" hero text — confined to the right side, fading into flat green on the left
const CitySkyline = () => (
  <svg
    className="absolute right-0 top-0 bottom-0 w-[62%] sm:w-1/2 h-full pointer-events-none"
    viewBox="0 0 520 220"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient id="skylineFade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="30%" stopColor="#ffffff" stopOpacity="1" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
      </linearGradient>
      <mask id="skylineMask">
        <rect x="0" y="0" width="520" height="220" fill="url(#skylineFade)" />
      </mask>
    </defs>

    <g mask="url(#skylineMask)">
      {/* Clouds, upper area */}
      <g fill="#176B45" opacity="0.28">
        <g transform="translate(50,18)">
          <ellipse cx="0" cy="10" rx="26" ry="13" />
          <ellipse cx="24" cy="5" rx="18" ry="11" />
          <ellipse cx="-20" cy="8" rx="15" ry="9" />
        </g>
        <g transform="translate(350,36)">
          <ellipse cx="0" cy="8" rx="20" ry="11" />
          <ellipse cx="18" cy="3" rx="14" ry="9" />
        </g>
      </g>

      {/* Skyline, anchored to the bottom */}
      <g fill="#176B45" opacity="0.35">
        <rect x="0" y="125" width="24" height="95" rx="3" />
        <rect x="28" y="150" width="18" height="70" rx="3" />
        <rect x="50" y="90" width="30" height="130" rx="4" />
        <rect x="84" y="130" width="22" height="90" rx="3" />
        <rect x="110" y="70" width="30" height="150" rx="4" />
        <circle cx="125" cy="70" r="14" />
        <rect x="144" y="150" width="20" height="70" rx="3" />
        <rect x="168" y="105" width="26" height="115" rx="3" />
        <rect x="198" y="140" width="20" height="80" rx="3" />
        <rect x="222" y="80" width="28" height="140" rx="4" />
        <rect x="227" y="70" width="18" height="14" rx="2" />
        <rect x="254" y="125" width="24" height="95" rx="3" />
        <rect x="282" y="150" width="18" height="70" rx="3" />
        <rect x="304" y="95" width="30" height="125" rx="4" />
        <rect x="338" y="135" width="22" height="85" rx="3" />
        <rect x="364" y="75" width="30" height="145" rx="4" />
        <circle cx="379" cy="75" r="14" />
        <rect x="398" y="155" width="20" height="65" rx="3" />
        <rect x="422" y="110" width="26" height="110" rx="3" />
        <rect x="452" y="140" width="20" height="80" rx="3" />
        <rect x="476" y="90" width="30" height="130" rx="4" />
        <rect x="506" y="130" width="14" height="90" rx="3" />
      </g>

      {/* Windows (subtle grid) */}
      <g fill="#ffffff" opacity="0.22">
        {[114, 228, 368, 480].map((x, i) => (
          <g key={i}>
            <rect x={x} y="100" width="4" height="6" />
            <rect x={x + 10} y="100" width="4" height="6" />
            <rect x={x} y="118" width="4" height="6" />
            <rect x={x + 10} y="118" width="4" height="6" />
            <rect x={x} y="136" width="4" height="6" />
            <rect x={x + 10} y="136" width="4" height="6" />
          </g>
        ))}
      </g>

      {/* Trees along the base */}
      <g fill="#ffffff" opacity="0.2">
        <rect x="92" y="214" width="3" height="6" />
        <circle cx="93.5" cy="207" r="8" />
        <rect x="236" y="212" width="3" height="8" />
        <circle cx="237.5" cy="204" r="9" />
        <rect x="392" y="214" width="3" height="6" />
        <circle cx="393.5" cy="207" r="8" />
      </g>
    </g>
  </svg>
);

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ---------------- STATE ----------------
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  const [leaveStats, setLeaveStats] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [attendanceMonthLoading, setAttendanceMonthLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementLoading, setAnnouncementLoading] = useState(true);

  // ---------------- EFFECTS ----------------
  useEffect(() => {
    fetchActiveShift();
    fetchMonthlyAttendance();
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    fetchAttendanceStatus();
    fetchLeaveStats();
    fetchLeaveHistory();
  }, [user?.id]);

  // ---------------- API FUNCTIONS ----------------
  const fetchAttendanceStatus = async () => {
    try {
      const response = await api.get(`/attendance/status/${user.id}`);
      setAttendanceStatus(response.data);
    } catch (error) {
      toast.error('Failed to fetch attendance status');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchLeaveStats = useCallback(async () => {
    try {
      const response = await api.get(`/leave/stats/${user.id}`);
      setLeaveStats(response.data);
    } catch (error) {
      console.error('Failed to fetch leave stats:', error);
    }
  }, [user?.id]);

  const fetchLeaveHistory = async () => {
    setLeaveLoading(true);
    try {
      const response = await api.get(`/leave/employee/${user.id}`);
      setLeaveHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch leave history:', error);
    } finally {
      setLeaveLoading(false);
    }
  };

  const fetchMonthlyAttendance = async () => {
    setAttendanceMonthLoading(true);
    try {
      const res = await api.get(`/attendance/monthly/${user.id}`);
      setMonthlyAttendance(res.data);
    } catch (err) {
      toast.error("Failed to load monthly attendance");
    } finally {
      setAttendanceMonthLoading(false);
    }
  };

  const fetchActiveShift = async () => {
    try {
      const employeeId = localStorage.getItem('employee_id');
      const res = await api.get(`/attendance/active/${employeeId}`);
      setActiveShift(res.data?.active ? res.data : null);
    } catch (err) {
      console.error('Active shift error', err);
    }
  };
  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Failed to fetch announcements");
    } finally {
      setAnnouncementLoading(false);
    }
  };

  // ---------------- HANDLERS ----------------
  const handleMarkAttendance = () => {
    navigate('/attendance');
  };

  const handleLeaveSubmitted = () => {
    fetchLeaveStats();
    fetchLeaveHistory();
  };

  const handleLeaveUpdated = () => {
    fetchLeaveStats();
    fetchLeaveHistory();
  };

  // ---------------- LOADING ----------------
  if (attendanceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }


  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header title="Employee Portal" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page Header - Gradient Hero Card */}
        <div className="bg-gradient-to-r from- from-[#62B98A] via-[#55AFA0] to-[#5B9FC4] rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 mb-8 sm:mb-12 text-white relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
          {/* Decorative background shape (right side only) */}
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>

          {/* City skyline backdrop */}
          <CitySkyline />

          {/* Small traffic signals - right side accent, inset from the rounded corner */}
          <div className="absolute right-10 sm:right-14 bottom-5 sm:bottom-6 flex items-end gap-3 z-10 opacity-85">
            <TrafficLight size={14} />
            <TrafficLight size={14} />
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">
                Employee Portal
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                Welcome back, {user?.full_name}!
              </h1>
              <p className="text-emerald-100 text-sm sm:text-base max-w-2xl">
                Designation: <span className="font-semibold text-white">{user?.designation || 'General Staff'}</span> • Team: <span className="font-semibold text-white">{(user?.team || 'Field').toUpperCase()} Team</span>
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 flex items-center gap-3 shrink-0">
              <Calendar className="h-6 w-6 text-emerald-300" />
              <div>
                <div className="text-xs text-emerald-200 font-medium">Today's Date</div>
                <div className="text-sm sm:text-base font-bold">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 1: primary actions | Row 2: info — stacks on mobile */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:gap-10">

            {/* Attendance Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 h-full flex flex-col transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl border border-gray-100">
              <div className="text-center flex flex-col flex-1 min-h-0">
                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-teal-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  Mark Attendance
                </h2>

                <p className="text-xs text-gray-500 mb-6">
                  Employee ID: <span className="font-semibold text-gray-700">{user.id}</span>
                </p>

                {/* Attendance Status */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-left">
                  <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3">
                    Today's Attendance Status
                  </h3>

                  {attendanceStatus ? (
                    <div className="space-y-3">
                      {(attendanceStatus.shifts_today > 0 || attendanceStatus.first_shift_check_in_done) && (
                        <div className="rounded-lg bg-teal-50/50 border border-teal-100 px-3.5 py-2.5 text-xs text-teal-950">
                          {attendanceStatus.day_complete ? (
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
                              You have used both shifts for today (2/2).
                            </span>
                          ) : attendanceStatus.checked_in && attendanceStatus.active_shift_number ? (
                            <span className="flex flex-col gap-0.5">
                              <span className="font-bold text-teal-800 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                                Shift {attendanceStatus.active_shift_number}: Checked In
                              </span>
                              <span className="text-teal-600/80">Check-out is allowed anytime. Next check-in only after check-out.</span>
                            </span>
                          ) : attendanceStatus.first_shift_check_in_done &&
                            attendanceStatus.can_check_in_again ? (
                            <span className="flex items-center gap-1.5 font-medium text-amber-700">
                              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                              Previous shift completed. Ready for next shift.
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-medium text-gray-600">
                              <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                              Shifts today: {attendanceStatus.completed_shifts_today ?? 0}/2 completed.
                            </span>
                          )}
                        </div>
                      )}

                      {(attendanceStatus.shifts || []).length > 0 ? (
                        <div className="space-y-2">
                          {(attendanceStatus.shifts || []).map((s) => (
                            <div
                              key={s.shift_number}
                              className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between border-b border-gray-50 pb-2 mb-2">
                                <div className="text-xs font-bold text-gray-900 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                  Shift {s.shift_number} ({s.shift_type.toUpperCase()})
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  s.status === 'present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  s.status === 'late' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                  'bg-red-50 text-red-700 border border-red-100'
                                }`}>
                                  {(s.status || '').replace('_', ' ')}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                                <div>
                                  <span className="text-gray-400 font-medium">In:</span>{' '}
                                  <span className="font-bold text-gray-800">{s.check_in_time ? new Date(s.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-medium">Out:</span>{' '}
                                  <span className="font-bold text-gray-800">{s.check_out_time ? new Date(s.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                </div>
                                <div className="col-span-2 text-gray-400">
                                  Office time: <span className="font-bold text-gray-700">{s.office_time || '—'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-xs text-center py-4 bg-white rounded-lg border border-dashed border-gray-200">No attendance marked yet today.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xs text-center py-4">Loading status...</p>
                  )}
                </div>

                <button
                  onClick={handleMarkAttendance}
                  className="mt-auto w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <Camera className="h-5 w-5" />
                  <span>Mark Attendance</span>
                </button>
              </div>
            </div>

            {/* Leave Request Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 h-full flex flex-col transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl border border-gray-100">
              <div className="text-center flex flex-col flex-1 min-h-0">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-emerald-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  Leave Request
                </h2>

                <p className="text-xs text-gray-500 mb-6">
                  Employee ID: <span className="font-semibold text-gray-700">{user.id}</span>
                </p>

                {/* Leave Balance */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-left">
                  <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3">
                    Available Leave Balance
                  </h3>

                  {leaveStats ? (
                    <div className="space-y-4">
                      {/* Sick Leave */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-gray-700">Sick Leave</span>
                          <span className="text-red-600">
                            {leaveStats?.sick_leave?.remaining ?? 0} / {leaveStats?.sick_leave?.total ?? 0} remaining
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-red-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.max(0, Math.min(100, ((leaveStats?.sick_leave?.remaining ?? 0) / (leaveStats?.sick_leave?.total || 1)) * 100))}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Emergency Leave */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-gray-700">Emergency Leave</span>
                          <span style={{ color: '#2b847a' }}>
                            {leaveStats?.emergency_leave?.remaining ?? 0} / {leaveStats?.emergency_leave?.total ?? 0} remaining
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            style={{ width: `${Math.max(0, Math.min(100, ((leaveStats?.emergency_leave?.remaining ?? 0) / (leaveStats?.emergency_leave?.total || 1)) * 100))}%`, backgroundColor: '#97D3CD' }}
                            className="h-1.5 rounded-full transition-all duration-500" 
                          ></div>
                        </div>
                      </div>

                      {/* Compensatory Leave */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-gray-700">Compensatory Leave</span>
                          <span className="text-purple-600">
                            {leaveStats?.Compensatory_leave?.remaining ?? 0} / {leaveStats?.Compensatory_leave?.total ?? 0} remaining
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.max(0, Math.min(100, ((leaveStats?.Compensatory_leave?.remaining ?? 0) / (leaveStats?.Compensatory_leave?.total || 1)) * 100))}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-200 text-xs font-bold">
                        <span className="text-gray-500 uppercase tracking-wider">Total Leaves Used:</span>
                        <span className="text-orange-600 text-sm font-extrabold bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded">
                          {leaveStats?.total_used ?? 0}
                        </span>
                      </div>

                      {leaveStats?.all_paid_exhausted && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between text-xs">
                          <div>
                            <span className="text-red-700 font-bold block">⚠️ LWP Active</span>
                            <span className="text-red-500/80">Paid leaves exhausted. Further leaves are without pay.</span>
                          </div>
                          <span className="text-red-600 font-extrabold bg-white border border-red-200 px-2 py-1 rounded shadow-sm">
                            {leaveStats?.lwp?.used ?? 0} days LWP
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xs text-center py-4">Loading stats...</p>
                  )}
                </div>

                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="mt-auto w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <FileText className="h-5 w-5" />
                  <span>Request Leave</span>
                </button>
              </div>
            </div>
          </div>

          {/* Junction Visits — add-on, shown only for Field Team / COC Team employees */}
          {user.designation?.toLowerCase() === 'field team' && (
            <JunctionVisitPanel user={user} attendanceStatus={attendanceStatus} />
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:gap-10">
            {/* Instructions Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 h-full">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Instructions
              </h3>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Camera className="h-4 w-4 text-primary-600 mt-1 shrink-0" />
                  <p className="text-gray-600 text-sm">
                    Photo required for both check-in and check-out
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-primary-600 mt-1 shrink-0" />
                  <p className="text-gray-600 text-sm">
                    Allow location access for GPS tracking
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-4 w-4 text-primary-600 mt-1 shrink-0" />
                  <p className="text-gray-600 text-sm">
                    Attendance is calculated based on the assigned shift timings of the employee
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-4 w-4 text-primary-600 mt-1 shrink-0" />
                  <p className="text-gray-600 text-sm">
                    Checking in after the allowed time will mark the attendance as Late
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-4 w-4 text-primary-600 mt-1 shrink-0" />
                  <p className="text-gray-600 text-sm">
                    Checking in after the half-day cut-off time will result in Half Day(First Half Absent)
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-4 w-4 text-primary-600 mt-1 shrink-0" />
                  <p className="text-gray-600 text-sm">
                    Checks out before minimum working hours will lead to Half Day(Second Half Absent)
                  </p>
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 h-full flex flex-col">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-teal-600 rounded-full inline-block"></span>
                Announcements
              </h2>

              {announcementLoading ? (
                <p className="text-gray-400 text-sm text-center py-6">Loading announcements...</p>
              ) : announcements.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No announcements yet</p>
              ) : (
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[min(420px,60vh)] pr-1">
                  {announcements.map((item, index) => (
                    <div
                      key={item.id ?? index}
                      className="p-4 bg-gradient-to-r from-teal-50/50 to-emerald-50/20 border-l-4 border-teal-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <p className="text-gray-800 text-sm font-medium break-words">{item.message}</p>

                      <p className="text-[10px] text-gray-400 mt-2 font-semibold">
                        📅 {item.created_at && !Number.isNaN(new Date(item.created_at).getTime())
                          ? new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                          : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Attendance */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mt-8 border border-gray-100 transition-all duration-300 hover:shadow-xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-teal-600 rounded-full inline-block"></span>
            Monthly Attendance
          </h2>

          {attendanceMonthLoading ? (
            <p className="text-gray-400 text-sm text-center py-8">Loading attendance...</p>
          ) : monthlyAttendance.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No attendance found</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Check-In
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Check-Out
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Office Hours
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Shift
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {monthlyAttendance.map((day, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-gray-700 font-medium">
                        {day.date || "-"}
                      </td>

                      <td className="px-4 py-3.5 text-sm text-gray-800 font-bold">
                        {day.check_in
                          ? new Date(day.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : "—"}
                      </td>

                      <td className="px-4 py-3.5 text-sm text-gray-800 font-bold">
                        {day.check_out
                          ? new Date(day.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : "—"}
                      </td>

                      <td className="px-4 py-3.5 text-sm text-gray-600 font-medium">
                        {day.office_time || "—"}
                      </td>

                      <td className="px-4 py-3.5 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center whitespace-nowrap text-center uppercase tracking-wider border
                            ${day.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              day.status === 'absent' ? 'bg-red-50 text-red-700 border-red-100' :
                              day.status === 'leave' ? 'bg-[#e7f7f5] text-[#2b847a] border-[#bfe7e3]' :
                              day.status === 'half_day_first_half' || day.status === 'half_day_second_half' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              day.status === 'late' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}
                        >
                          {day.status ? day.status.replaceAll('_', ' ') : '-'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-sm text-gray-500 font-semibold">
                        {day.shift_name || day.shift_type || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leave Status / History */}
        <div className="mt-10 bg-white rounded-2xl shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-teal-600 rounded-full inline-block"></span>
              My Leave Requests
            </h2>
          </div>

          <div className="p-6">
            {leaveLoading ? (
              <p className="text-gray-400 text-sm text-center py-6">Loading leave history...</p>
            ) : leaveHistory.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No leave requests found</p>
            ) : (
              <div className="space-y-3">
                {leaveHistory.map((leave) => (
                  <div
                    key={leave.id}
                    className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-gray-900 text-base mb-1">
                        {leave.leave_type.toUpperCase()} Leave
                      </h4>
                      <p className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                        📅 {leave.start_date} → {leave.end_date}
                      </p>
                      {leave.admin_comment && (
                        <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg italic">
                          📝 Admin Comment: {leave.admin_comment}
                        </p>
                      )}
                    </div>

                    {/* STATUS BADGE */}
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border text-center self-start sm:self-center
                        ${leave.status === 'approved' && 'bg-emerald-50 text-emerald-700 border-emerald-100'}
                        ${leave.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-100'}
                        ${leave.status === 'rejected' && 'bg-red-50 text-red-700 border-red-100'}
                      `}
                    >
                      {leave.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <LeaveRequestModal
          isOpen={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          employeeId={user.id}
          employeeData={user}
          onLeaveSubmitted={handleLeaveSubmitted}
        />
      )}

      {/* Edit Leave Modal */}
      {showEditModal && (
        <EditLeaveModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLeave(null);
          }}
          leave={selectedLeave}
          onLeaveUpdated={handleLeaveUpdated}
        />
      )}
    </div>
  );
};


export default EmployeeDashboard;