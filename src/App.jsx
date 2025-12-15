import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import AttendanceForm from './components/AttendanceForm';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false, employeeOnly = false }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login and clear history
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If admin-only route but user is not admin, redirect to employee dashboard
  if (adminOnly && !user?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // If employee-only route but user is admin, redirect to admin dashboard
  if (employeeOnly && user?.is_admin) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

// Login Route Component - redirects authenticated users
const LoginRoute = () => {
  const { user, isAuthenticated, loading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // If user is authenticated, redirect to appropriate dashboard
  if (isAuthenticated) {
    return <Navigate to={user?.is_admin ? "/admin" : "/dashboard"} replace />;
  }
  
  // If not authenticated, show login page
  return <Login />;
};

// Root Route Component - redirects based on authentication
const RootRoute = () => {
  const { user, isAuthenticated, loading } = useAuth();
  
  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // Redirect based on authentication status
  if (isAuthenticated) {
    return <Navigate to={user?.is_admin ? "/admin" : "/dashboard"} replace />;
  } else {
    return <Navigate to="/login" replace />;
  }
};

// App Routes Component (inside Router context)
const AppRoutes = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute employeeOnly={true}>
                <EmployeeDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/attendance" 
            element={
              <ProtectedRoute employeeOnly={true}>
                <AttendanceForm />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<RootRoute />} />
        </Routes>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </AuthProvider>
  );
};

function App() {
  return (
    <Router future={{ v7_relativeSplatPath: true }}>
      <AppRoutes />
    </Router>
  );
}

export default App;
