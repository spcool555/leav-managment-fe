import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, User, Camera, MapPin, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import LeaveRequestModal from './LeaveRequestModal';
import EditLeaveModal from './EditLeaveModal';
import LeaveHistory from './LeaveHistory';
import api from '../services/api';
import toast from 'react-hot-toast';

const EmployeeDashboard = () => {   // ✅ FIX 1
  const navigate = useNavigate();   // ✅ FIX 2
  const { user } = useAuth();       // ✅ FIX 3

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

        {/* Page Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            Manage Your Attendance & Leaves
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-1">
            Track your daily attendance, request leaves, and stay updated with your work schedule.
          </p>
        </div>

        {/* Row 1: primary actions | Row 2: info — stacks on mobile */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:gap-10">

          {/* Attendance Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 h-full flex flex-col">
            <div className="text-center flex flex-col flex-1 min-h-0">
              <div className="bg-primary-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Clock className="h-10 w-10 text-primary-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Mark Attendance
              </h2>

              <p className="text-gray-600 mb-6">
                Employee ID: <span className="font-medium">{user.id}</span>
              </p>

              {/* Attendance Status */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">
                  Today's Status
                </h3>

                {attendanceStatus ? (
                  <div className="space-y-2">
                    {(attendanceStatus.shifts_today > 0 || attendanceStatus.first_shift_check_in_done) && (
                      <div className="rounded-md bg-primary-50 border border-primary-100 px-3 py-2 text-left text-xs text-primary-900 mb-2">
                        {attendanceStatus.day_complete ? (
                          <>You have used both shifts for today (<strong>2/2</strong>).</>
                        ) : attendanceStatus.checked_in && attendanceStatus.active_shift_number ? (
                          <>
                            <strong>Shift {attendanceStatus.active_shift_number}</strong>: checked in. Check-out is
                            allowed anytime; next check-in only after check-out.
                          </>
                        ) : attendanceStatus.first_shift_check_in_done &&
                          attendanceStatus.can_check_in_again ? (
                          <>
                            <strong>Previous shift completed.</strong> You can check in for your next shift.
                          </>
                        ) : (
                          <>
                            Shifts today:{' '}
                            <strong>
                              {attendanceStatus.completed_shifts_today ?? 0}/2 completed
                            </strong>
                          </>
                        )}
                      </div>
                    )}

                    {(attendanceStatus.shifts || []).length > 0 ? (
                      <div className="space-y-3">
                        {(attendanceStatus.shifts || []).map((s) => (
                          <div
                            key={s.shift_number}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                          >
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2 mb-1">
                              <div className="text-sm font-semibold text-gray-900">
                                Shift {s.shift_number} ({(s.shift_type || '').toUpperCase()})
                              </div>
                              <div className="text-xs font-semibold text-gray-700">
                                {(s.status || '').replace('_', ' ').toUpperCase() || '—'}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-y-1 text-xs text-gray-700 sm:grid-cols-2 sm:gap-x-4">
                              <div>
                                <span className="font-medium">Check-in:</span>{' '}
                                {s.check_in_time ? new Date(s.check_in_time).toLocaleTimeString() : '—'}
                              </div>
                              <div>
                                <span className="font-medium">Check-out:</span>{' '}
                                {s.check_out_time ? new Date(s.check_out_time).toLocaleTimeString() : '—'}
                              </div>
                              <div className="sm:col-span-2">
                                <span className="font-medium">Office time:</span> {s.office_time || '—'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No attendance marked yet.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Loading status...</p>
                )}
              </div>

              <button
                onClick={handleMarkAttendance}
                className="mt-auto w-full btn-primary py-3 text-base sm:text-lg font-semibold flex items-center justify-center space-x-2"
              >
                <Camera className="h-5 w-5" />
                <span>Mark Attendance</span>
              </button>
            </div>
          </div>

          {/* Leave Request Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 h-full flex flex-col">
            <div className="text-center flex flex-col flex-1 min-h-0">
              <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-10 w-10 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Leave Request
              </h2>

              <p className="text-gray-600 mb-6">
                Employee ID: <span className="font-medium">{user.id}</span>
              </p>

              {/* Leave Balance */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">
                  Leave Balance
                </h3>

                {leaveStats ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sick Leave:</span>
                      <span className="text-red-600 font-medium">
                        {leaveStats?.sick_leave?.remaining ?? 0}/
                        {leaveStats?.sick_leave?.total ?? 0}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Casual Leave:</span>
                      <span className="text-blue-600 font-medium">
                        {leaveStats?.casual_leave?.remaining ?? 0}/
                        {leaveStats?.casual_leave?.total ?? 0}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Compensatory Leave:</span>
                      <span className="text-purple-600 font-medium">
                        {leaveStats?.Compensatory_leave?.remaining ?? 0}/
                        {leaveStats?.Compensatory_leave?.total ?? 0}
                      </span>
                    </div>

                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="font-medium">Total Used:</span>
                      <span className="text-orange-600 font-medium">
                        {leaveStats?.total_used ?? 0}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Loading stats...</p>
                )}
              </div>

              <button
                onClick={() => setShowLeaveModal(true)}
                className="mt-auto w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base sm:text-lg font-semibold flex items-center justify-center space-x-2 rounded-lg"
              >
                <FileText className="h-5 w-5" />
                <span>Request Leave</span>
              </button>

            </div>
          </div>
          </div>

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
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Announcements
            </h2>

            {announcementLoading ? (
              <p className="text-gray-500">Loading announcements...</p>
            ) : announcements.length === 0 ? (
              <p className="text-gray-500">No announcements yet</p>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[min(420px,60vh)] pr-1">
                {announcements.map((item, index) => (
                  <div
                    key={item.id ?? index}
                    className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded"
                  >
                    <p className="text-gray-800 text-sm sm:text-base break-words">{item.message}</p>

                    <p className="text-xs text-gray-500 mt-2">
                      {item.created_at && !Number.isNaN(new Date(item.created_at).getTime())
                        ? new Date(item.created_at).toLocaleString()
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
<div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mt-8">
  <h2 className="text-xl font-bold text-gray-900 mb-4">
    Monthly Attendance
  </h2>

  {attendanceMonthLoading ? (
    <p className="text-gray-500">Loading attendance...</p>
  ) : monthlyAttendance.length === 0 ? (
    <p className="text-gray-500">No attendance found</p>
  ) : (
    <div className="overflow-x-auto">

        <table className="w-full table-auto border border-gray-200 rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-4 py-3 border-b text-sm font-semibold text-gray-700">
              Date
            </th>
            <th className="text-left px-4 py-3 border-b text-sm font-semibold text-gray-700">
              Check-In
            </th>
            <th className="text-left px-4 py-3 border-b text-sm font-semibold text-gray-700">
              Check-Out
            </th>
            <th className="text-left px-4 py-3 border-b text-sm font-semibold text-gray-700">
              Office Hours
            </th>
            <th className="text-left px-4 py-3 border-b text-sm font-semibold text-gray-700">
              Status
            </th>
            <th className="text-left px-4 py-3 border-b text-sm font-semibold text-gray-700">
              Shift
            </th>
          </tr>
        </thead>

        <tbody>
          {monthlyAttendance.map((day, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 border-b text-sm text-gray-700">
                {day.date || "-"}
              </td>

              <td className="px-4 py-3 border-b text-sm text-gray-700">
                {day.check_in
                  ? new Date(day.check_in).toLocaleTimeString()
              : "—"}
              </td>

              <td className="px-4 py-3 border-b text-sm text-gray-700">
                {day.check_out
                ? new Date(day.check_out).toLocaleTimeString()
                : "—"}
              </td>

              <td className="px-4 py-3 border-b text-sm text-gray-700">
                {day.office_time || "—"}
              </td>

              <td className="px-4 py-3 border-b text-sm text-gray-700 text-center min-w-[170px]">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap text-center
                ${
                      day.status === 'present' ? 'bg-green-100 text-green-700' :
                      day.status === 'absent' ? 'bg-red-100 text-red-700' :
                      day.status === 'leave' ? 'bg-blue-100 text-blue-700' :
                      day.status === 'half_day_first_half' ? 'bg-yellow-100 text-yellow-700' :
                      day.status === 'half_day_second_half' ? 'bg-yellow-100 text-yellow-700' :
                      day.status === 'late' ? 'bg-purple-100 text-purple-700' : '' }`}
                      >
              {day.status ? day.status.replaceAll('_', ' ').toUpperCase() : '-'}
              </span>
              </td>

              <td className="px-4 py-3 border-b text-sm text-gray-700">
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
      <div className="mt-10 bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-gray-900">
          My Leave Requests
        </h2>
      </div>

      <div className="p-6">
        {leaveLoading ? (
          <p className="text-gray-500 text-center">Loading leave history...</p>
            ) : leaveHistory.length === 0 ? (
          <p className="text-gray-500 text-center">
            No leave requests found
          </p>
        ) : (
          leaveHistory.map((leave) => (
        <div
          key={leave.id}
          className="border rounded-lg p-4 mb-3 bg-gray-50"
        >
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-900">
              {leave.leave_type.toUpperCase()} Leave
            </h4>

            {/* STATUS BADGE */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold
                ${leave.status === 'approved' && 'bg-green-100 text-green-700'}
                ${leave.status === 'pending' && 'bg-yellow-100 text-yellow-700'}
                ${leave.status === 'rejected' && 'bg-red-100 text-red-700'}
              `}
            >
              {leave.status.toUpperCase()}
            </span>
          </div>

          <p className="text-sm text-gray-600">
            📅 {leave.start_date} → {leave.end_date}
          </p>

          {leave.admin_comment && (
            <p className="text-sm text-gray-500 mt-2">
              📝 Admin Comment: {leave.admin_comment}
            </p>
          )}
        </div>
      ))
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