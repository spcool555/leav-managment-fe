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

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ---------------- STATE ----------------
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  const [leaveStats, setLeaveStats] = useState(null);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);

  // ---------------- EFFECTS ----------------
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

  // ---------------- HANDLERS ----------------
  const handleMarkAttendance = () => {
    navigate('/attendance');
  };

  const handleLeaveSubmitted = () => {
    fetchLeaveStats();
    fetchLeaveHistory();
  };

  const handleEditLeave = (leave) => {
    setSelectedLeave(leave);
    setShowEditModal(true);
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
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Manage Your Attendance & Leaves
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Track your daily attendance, request leaves, and stay updated with your work schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Attendance Card */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
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
                    <div className="flex justify-between">
                      <span>Check-in:</span>
                      <span className={attendanceStatus.checked_in ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {attendanceStatus.checked_in
                          ? new Date(attendanceStatus.check_in_time).toLocaleTimeString()
                          : 'Not checked in'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Check-out:</span>
                      <span className={attendanceStatus.checked_out ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {attendanceStatus.checked_out
                          ? new Date(attendanceStatus.check_out_time).toLocaleTimeString()
                          : 'Not checked out'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Office Time:</span>
                      <span className="text-blue-600 font-medium">
                        {attendanceStatus.office_time || 'Not calculated'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium">
                        {attendanceStatus.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Loading status...</p>
                )}
              </div>

              <button
                onClick={handleMarkAttendance}
                className="w-full btn-primary py-3 text-lg font-semibold flex items-center justify-center space-x-2"
              >
                <Camera className="h-5 w-5" />
                <span>Mark Attendance</span>
              </button>
            </div>
          </div>

          {/* Leave Request Card */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
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
  onClick={() => {
    console.log("CLICKED");
    setShowLeaveModal(true);
  }}
  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold flex items-center justify-center space-x-2 rounded-lg"
>
  <FileText className="h-5 w-5" />
  <span>Request Leave</span>
</button>

            </div>
          </div>

          {/* Instructions Card */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Instructions
            </h3>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Camera className="h-4 w-4 text-primary-600 mt-1" />
                <p className="text-gray-600 text-sm">
                  Photo required for both check-in and check-out
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-primary-600 mt-1" />
                <p className="text-gray-600 text-sm">
                  Allow location access for GPS tracking
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="h-4 w-4 text-primary-600 mt-1" />
                <p className="text-gray-600 text-sm">
                Attendance is calculated based on the assigned shift timings of the employee
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="h-4 w-4 text-primary-600 mt-1" />
                <p className="text-gray-600 text-sm">
                Checking in after the allowed time will mark the attendance as Late
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="h-4 w-4 text-primary-600 mt-1" />
                <p className="text-gray-600 text-sm">
                Checking in after the half-day cut-off time will result in Half Day(First Half Absent)
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="h-4 w-4 text-primary-600 mt-1" />
                <p className="text-gray-600 text-sm">
                Checks out before minimum working hours will lead to Half Day(Second Half Absent)
                </p>
              </div>
            </div>
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
