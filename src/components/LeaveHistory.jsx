import React from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Edit, FileText, Eye } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

const LeaveHistory = ({ leaves, loading, onEditLeave }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      sick: 'text-red-600 bg-red-50',
      casual: 'text-blue-600 bg-blue-50',
      annual: 'text-purple-600 bg-purple-50'
    };
    return colors[type] || 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!leaves || leaves.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No leave requests found</p>
        <p className="text-gray-400 text-sm mt-2">Your leave history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {leaves.map((leave) => (
        <div
          key={leave.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="mt-1">
                {getStatusIcon(leave.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLeaveTypeColor(leave.leave_type)}`}>
                    {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} Leave
                  </span>
                  {getStatusBadge(leave.status)}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>
                      {leave.days_count} day{leave.days_count > 1 ? 's' : ''}
                      {leave.is_half_day && (
                        <span className="ml-1 text-xs font-medium text-blue-600">
                          ({leave.half_day_period === 'first_half' ? 'First Half' : 'Second Half'})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-2">
                  <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                  <p className="text-sm text-gray-600">{leave.reason}</p>
                </div>

                {leave.supporting_document && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Supporting Document</span>
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
                    <p className={`text-sm font-medium mb-1 ${
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
                )}

                <div className="mt-2 text-xs text-gray-400">
                  Submitted on {new Date(leave.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* Edit Button for Pending Leaves */}
            {leave.status === 'pending' && onEditLeave && (
              <div className="mt-3 sm:mt-0 sm:ml-4">
                <Edit
                  onClick={() => onEditLeave(leave)}
                  className="h-5 w-5 text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LeaveHistory;
