import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Filter, User, FileText, MessageSquare, Mail, Phone, Download, Eye } from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import toast from 'react-hot-toast';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [adminComment, setAdminComment] = useState('');
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, [filter]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await api.get(`/admin/leaves${params}`);
      setLeaves(response.data);
    } catch (error) {
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (leave, action) => {
    setSelectedLeave(leave);
    setActionType(action);
    setAdminComment('');
    setShowCommentModal(true);
  };

  const confirmAction = async () => {
    if (!selectedLeave) return;

    try {
      const endpoint = actionType === 'approve' 
        ? `/admin/leave/${selectedLeave.id}/approve`
        : `/admin/leave/${selectedLeave.id}/reject`;

      await api.put(endpoint, {
        admin_comment: adminComment
      });

      toast.success(`Leave request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
      setShowCommentModal(false);
      setSelectedLeave(null);
      setAdminComment('');
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.error || `Failed to ${actionType} leave request`);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      sick: 'text-red-600 bg-red-50 border-red-200',
      casual: 'text-blue-600 bg-blue-50 border-blue-200',
      annual: 'text-purple-600 bg-purple-50 border-purple-200'
    };
    return colors[type] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Leave Management</h3>
            <p className="text-sm text-gray-600 mt-1">Review and approve employee leave requests</p>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Leave List */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No leave requests found</p>
            <p className="text-gray-400 text-sm mt-2">
              {filter === 'pending' ? 'All caught up! No pending requests.' : `No ${filter} leave requests.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaves.map((leave) => (
              <div
                key={leave.id}
                className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                  {/* Left Section */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-gray-100 rounded-full p-2">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{leave.employee_name}</h4>
                        <p className="text-sm text-gray-500">ID: {leave.employee_id}</p>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {leave.employee_email && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Mail className="h-3 w-3 mr-1" />
                              {leave.employee_email}
                            </div>
                          )}
                          {leave.employee_phone && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Phone className="h-3 w-3 mr-1" />
                              {leave.employee_phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getLeaveTypeColor(leave.leave_type)}`}>
                        {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} Leave
                      </span>
                      {getStatusBadge(leave.status)}
                      <span className="text-sm text-gray-600 flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {leave.days_count} day{leave.days_count > 1 ? 's' : ''}
                        {leave.is_half_day && (
                          <span className="ml-1 text-xs font-medium text-blue-600">
                            ({leave.half_day_period === 'first_half' ? 'First Half' : 'Second Half'})
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium mr-1">From:</span>
                        {new Date(leave.start_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium mr-1">To:</span>
                        {new Date(leave.end_date).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-2">
                      <div className="flex items-start space-x-2">
                        <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-700 mb-1">Reason:</p>
                          <p className="text-sm text-gray-600">{leave.reason}</p>
                        </div>
                      </div>
                    </div>

                    {leave.supporting_document && (
                      <div className="bg-blue-50 rounded-lg p-3 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Supporting Document Attached</span>
                          </div>
                          <a
                            href={`${API_BASE_URL}/leave/document/${leave.supporting_document}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {leave.admin_comment && (
                      <div className={`rounded-lg p-3 ${
                        leave.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <div className="flex items-start space-x-2">
                          <MessageSquare className={`h-4 w-4 mt-0.5 ${
                            leave.status === 'approved' ? 'text-green-600' : 'text-red-600'
                          }`} />
                          <div className="flex-1">
                            <p className={`text-xs font-medium mb-1 ${
                              leave.status === 'approved' ? 'text-green-700' : 'text-red-700'
                            }`}>
                              Admin Comment:
                            </p>
                            <p className={`text-sm ${
                              leave.status === 'approved' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {leave.admin_comment}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-400">
                      Submitted on {new Date(leave.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {leave.status === 'pending' && (
                    <div className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2">
                      <button
                        onClick={() => handleAction(leave, 'approve')}
                        className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleAction(leave, 'reject')}
                        className="flex-1 lg:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {showCommentModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {actionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {actionType === 'approve' 
                  ? `You are about to approve the leave request for ${selectedLeave.employee_name}.`
                  : `You are about to reject the leave request for ${selectedLeave.employee_name}.`
                }
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (Optional)
                </label>
                <textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  rows="3"
                  placeholder="Add a comment for the employee..."
                  className="input-field resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setSelectedLeave(null);
                    setAdminComment('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
