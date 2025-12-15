import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Upload, File } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const LeaveRequestModal = ({ isOpen, onClose, employeeId, onLeaveSubmitted, employeeData }) => {
  const [formData, setFormData] = useState({
    leave_type: 'casual',
    start_date: '',
    end_date: '',
    reason: '',
    is_half_day: false,
    half_day_period: 'first_half'
  });
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const calculateDays = () => {
    if (formData.start_date && formData.end_date) {
      if (formData.is_half_day) {
        return 0.5;
      }
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only images (PNG, JPG, JPEG, GIF) and PDF files are allowed');
        return;
      }
      
      // Validate file size (max 16MB)
      if (file.size > 16 * 1024 * 1024) {
        toast.error('File size must be less than 16MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.start_date || !formData.end_date || !formData.reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast.error('End date must be after start date');
      return;
    }

    // Validate half-day: must be single day
    if (formData.is_half_day && formData.start_date !== formData.end_date) {
      toast.error('Half-day leave must be for a single day only');
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('employee_id', employeeId);
      formDataToSend.append('leave_type', formData.leave_type);
      formDataToSend.append('start_date', formData.start_date);
      formDataToSend.append('end_date', formData.end_date);
      formDataToSend.append('reason', formData.reason);
      formDataToSend.append('is_half_day', formData.is_half_day);
      formDataToSend.append('half_day_period', formData.half_day_period);
      
      if (selectedFile) {
        formDataToSend.append('supporting_document', selectedFile);
      }

      const response = await api.post('/leave/request', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(response.data.message || 'Leave request submitted successfully');
      
      // Reset form
      setFormData({
        leave_type: 'casual',
        start_date: '',
        end_date: '',
        reason: '',
        is_half_day: false,
        half_day_period: 'first_half'
      });
      setSelectedFile(null);
      setFilePreview(null);
      
      if (onLeaveSubmitted) {
        onLeaveSubmitted();
      }
      
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-full p-2">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Request Leave</h2>
              <p className="text-sm text-gray-600">Submit your leave application</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee Info */}
          {employeeData && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Employee Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">ID:</span>
                  <span className="ml-2 font-medium text-gray-900">{employeeData.id || employeeId}</span>
                </div>
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium text-gray-900">{employeeData.full_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium text-gray-900">{employeeData.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <span className="ml-2 font-medium text-gray-900">{employeeData.phone || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <select
              name="leave_type"
              value={formData.leave_type}
              onChange={handleChange}
              className="input-field"
              required
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="annual">Annual Leave</option>
            </select>
          </div>

          {/* Half Day Toggle */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="is_half_day"
                checked={formData.is_half_day}
                onChange={(e) => {
                  const isHalfDay = e.target.checked;
                  setFormData({
                    ...formData,
                    is_half_day: isHalfDay,
                    end_date: isHalfDay ? formData.start_date : formData.end_date
                  });
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-sm font-medium text-blue-900">
                This is a half-day leave
              </span>
            </label>
            
            {formData.is_half_day && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  Select Half Day Period
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="half_day_period"
                      value="first_half"
                      checked={formData.half_day_period === 'first_half'}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-blue-800">First Half (Morning)</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="half_day_period"
                      value="second_half"
                      checked={formData.half_day_period === 'second_half'}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-blue-800">Second Half (Afternoon)</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  setFormData({
                    ...formData,
                    start_date: newStartDate,
                    end_date: formData.is_half_day ? newStartDate : formData.end_date
                  });
                }}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                min={formData.start_date}
                disabled={formData.is_half_day}
                className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>
          </div>

          {/* Days Count Display */}
          {formData.start_date && formData.end_date && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Total Days:</span>
                <span className="text-lg font-bold text-blue-600">
                  {calculateDays()} {calculateDays() === 0.5 ? 'day (Half Day)' : calculateDays() === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="4"
              placeholder="Please provide a detailed reason for your leave request..."
              className="input-field resize-none"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Minimum 10 characters required
            </p>
          </div>

          {/* Document Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supporting Document (Optional)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                {filePreview ? (
                  <div className="mb-4">
                    <img src={filePreview} alt="Preview" className="mx-auto h-32 w-auto rounded" />
                  </div>
                ) : selectedFile ? (
                  <div className="flex items-center justify-center mb-4">
                    <File className="h-12 w-12 text-gray-400" />
                    <span className="ml-2 text-sm text-gray-600">{selectedFile.name}</span>
                  </div>
                ) : (
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                )}
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                    <span>{selectedFile ? 'Change file' : 'Upload a file'}</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/png,image/jpeg,image/jpg,image/gif,application/pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF, PDF up to 16MB
                </p>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className="text-xs text-red-600 hover:text-red-700 mt-2"
                  >
                    Remove file
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>You can apply for leave starting from today</li>
                  <li>Half-day leave is available for single day requests</li>
                  <li>Your request will be reviewed by the admin</li>
                  <li>You will be notified once your request is processed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
                type="submit"
                className="btn-primary"
                disabled={loading || formData.reason.length < 10}
                >
                {loading ? (
                    <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                    </span>
                ) : (
                    'Submit Request'
                )}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestModal;
