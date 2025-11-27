import React, { useState } from 'react';
import { Search, Key, User, RefreshCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const PasswordManagement = ({ onChangePassword }) => {
  const [searchId, setSearchId] = useState('');
  const [employee, setEmployee] = useState(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const searchEmployee = async () => {
    if (!searchId.trim()) {
      toast.error('Please enter an Employee ID');
      return;
    }

    setSearching(true);
    setNotFound(false);
    setEmployee(null);

    try {
      const response = await api.get(`/admin/employee/${searchId}`);
      if (response.data) {
        setEmployee(response.data);
        setNotFound(false);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
        setEmployee(null);
        toast.error('Employee not found');
      } else {
        toast.error('Failed to search employee');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchEmployee();
    }
  };

  const clearSearch = () => {
    setSearchId('');
    setEmployee(null);
    setNotFound(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <div className="bg-blue-100 rounded-full p-3 mr-4">
          <Key className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Password Management</h3>
          <p className="text-sm text-gray-600">Search and change employee passwords</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="search-employee" className="block text-sm font-medium text-gray-700 mb-2">
              Employee ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="search-employee"
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="input-field-with-icon"
                placeholder="Enter Employee ID to search"
              />
            </div>
          </div>
          
          <div className="flex gap-2 sm:mt-7">
            <button
              onClick={searchEmployee}
              disabled={searching || !searchId.trim()}
              className={`btn-primary flex items-center space-x-2 ${
                searching || !searchId.trim() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {searching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </>
              )}
            </button>
            
            {(employee || notFound || searchId) && (
              <button
                onClick={clearSearch}
                className="btn-secondary flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Employee Found */}
        {employee && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-full p-2">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Employee Found</h4>
                  <div className="text-sm text-gray-600 space-y-1 mt-1">
                    <p><span className="font-medium">ID:</span> {employee.id}</p>
                    <p><span className="font-medium">Name:</span> {employee.full_name}</p>
                    <p><span className="font-medium">Email:</span> {employee.email}</p>
                    <p><span className="font-medium">Phone:</span> {employee.phone}</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => onChangePassword(employee)}
                className="btn-primary flex items-center space-x-2 text-sm"
              >
                <Key className="h-4 w-4" />
                <span>Change Password</span>
              </button>
            </div>
          </div>
        )}

        {/* Employee Not Found */}
        {notFound && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 rounded-full p-2">
                <Search className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-red-900">Employee Not Found</h4>
                <p className="text-sm text-red-700 mt-1">
                  No employee found with ID: <span className="font-medium">{searchId}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordManagement;
