import React, { useState } from 'react';
import { X, User, Mail, Phone, Lock, UserPlus, Briefcase, Layers, Clock, Calendar } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CreateEmployeeModal = ({ isOpen, onClose, onEmployeeCreated }) => {
  const [formData, setFormData] = useState({
    id: '',
    full_name: '',
    email: '',
    phone: '',
    password: '',
    project: 'Smart City',
    category: 'Smart City',
    team: 'Field Team',
    designation: '',
    shift_type: 'general',
    weekly_off: 'Sunday',
    is_admin: false
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'project') {
      setFormData(prev => ({
        ...prev,
        project: value,
        category: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const generateEmployeeId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const employeeId = `EMP${timestamp}${randomNum}`;
    setFormData(prev => ({ ...prev, id: employeeId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.id || !formData.full_name || !formData.email || !formData.phone || !formData.password || !formData.project || !formData.team) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        category: formData.project || formData.category || 'Smart City'
      };
      const response = await api.post('/admin/employees', payload);
      
      if (response.data.success) {
        toast.success('Employee created successfully!');
        onEmployeeCreated(response.data.employee);
        handleClose();
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create employee';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      id: '',
      full_name: '',
      email: '',
      phone: '',
      password: '',
      project: 'Smart City',
      category: 'Smart City',
      team: 'Field Team',
      designation: '',
      shift_type: 'general',
      weekly_off: 'Sunday',
      is_admin: false
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50 rounded-t-xl sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <UserPlus className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Add New Employee</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Employee ID */}
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
              Employee ID *
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="id"
                  name="id"
                  value={formData.id}
                  onChange={handleChange}
                  className="input-field-with-icon"
                  placeholder="Enter Employee ID"
                  required
                />
              </div>
              <button
                type="button"
                onClick={generateEmployeeId}
                className="btn-secondary px-3 py-2 text-sm shrink-0 border border-green-600 text-green-600 hover:bg-green-50 rounded-lg"
              >
                Generate
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="input-field-with-icon"
                placeholder="Enter full name"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field-with-icon"
                placeholder="Enter email address"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field-with-icon"
                placeholder="Enter 10-digit phone number"
                maxLength="10"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field-with-icon"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          {/* Project / Category */}
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
              Project / Location *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Layers className="h-4 w-4 text-gray-400" />
              </div>
              <select
                id="project"
                name="project"
                value={formData.project}
                onChange={handleChange}
                className="input-field-with-icon appearance-none bg-white pr-10"
                required
              >
                <option value="Smart City">Smart City</option>
                <option value="IITMS">IITMS</option>
                <option value="Towing">Towing</option>
                <option value="Head Office">Head Office</option>
              </select>
            </div>
          </div>

          {/* Team / Department */}
          <div>
            <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">
              Team / Department *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Briefcase className="h-4 w-4 text-gray-400" />
              </div>
              <select
                id="team"
                name="team"
                value={formData.team}
                onChange={handleChange}
                className="input-field-with-icon appearance-none bg-white pr-10"
                required
              >
                <option value="Field Team">Field Team</option>
                <option value="COC">COC</option>
                <option value="CCC">CCC</option>
                <option value="Towing">Towing</option>
                <option value="Head Office">Head Office</option>
              </select>
            </div>
          </div>

          {/* Designation / Role */}
          <div>
            <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-1">
              Designation / Role
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Briefcase className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="input-field-with-icon"
                placeholder="e.g. Technician, Operator, Supervisor"
              />
            </div>
          </div>

          {/* Shift Type & Weekly Off (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shift Type */}
            <div>
              <label htmlFor="shift_type" className="block text-sm font-medium text-gray-700 mb-1">
                Shift Type
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  id="shift_type"
                  name="shift_type"
                  value={formData.shift_type}
                  onChange={handleChange}
                  className="input-field-with-icon appearance-none bg-white pr-8 text-xs sm:text-sm"
                >
                  <option value="general">General Shift</option>
                  <option value="morning">Morning Shift</option>
                  <option value="evening">Evening Shift</option>
                  <option value="night">Night Shift</option>
                  <option value="rotational">Rotational</option>
                </select>
              </div>
            </div>

            {/* Weekly Off */}
            <div>
              <label htmlFor="weekly_off" className="block text-sm font-medium text-gray-700 mb-1">
                Weekly Off
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  id="weekly_off"
                  name="weekly_off"
                  value={formData.weekly_off}
                  onChange={handleChange}
                  className="input-field-with-icon appearance-none bg-white pr-8 text-xs sm:text-sm"
                >
                  <option value="Sunday">Sunday</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                </select>
              </div>
            </div>
          </div>

          {/* Admin Checkbox */}
          <div className="flex items-center pt-2">
            <input
              type="checkbox"
              id="is_admin"
              name="is_admin"
              checked={formData.is_admin}
              onChange={handleChange}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="is_admin" className="ml-2 block text-sm text-gray-700">
              Grant admin privileges
            </label>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 btn-secondary py-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center space-x-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Create Employee</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEmployeeModal;
