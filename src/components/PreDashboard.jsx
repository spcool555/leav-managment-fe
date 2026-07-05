import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// URL of the external ERP application
const ERP_URL = 'http://31.97.224.19:5173/';
// const ERP_URL = 'http://localhost:5174/';

const PreDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleAttendance = () => {
    // Open the Attendance dashboard within this app (admin vs employee view)
    navigate(user?.is_admin ? '/admin' : '/dashboard');
  };

  const handleErp = () => {
    // Open the external ERP application
    window.location.href = ERP_URL;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
          <div className="flex items-center gap-4">
            {user?.name && (
              <span className="text-sm text-gray-600">Welcome, {user.name}</span>
            )}
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
            Choose a workspace
          </h2>
          <p className="text-gray-500 text-center mb-10">
            Select where you want to go
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Attendance */}
            <button
              onClick={handleAttendance}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 hover:border-blue-200 transition-all p-8 text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                <CalendarCheck className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-1">Attendance</h3>
              <p className="text-sm text-gray-500 mb-6">
                Manage attendance, leaves and employees.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                Open <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            {/* ERP */}
            <button
              onClick={handleErp}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 hover:border-purple-200 transition-all p-8 text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <Building2 className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-1">ERP</h3>
              <p className="text-sm text-gray-500 mb-6">
                Open the ERP system in a separate application.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-purple-600">
                Open <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreDashboard;
