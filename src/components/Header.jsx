import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoImage from '../assets/DECOFURN.png';

const Header = ({ 
  title, 
  showBackButton = false, 
  backPath = '/', 
  showLogout = true,
  showUserInfo = true,
  className = "bg-white shadow-sm border-b"
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(backPath);
  };

  const handleLogoClick = () => {
    if (user?.is_admin) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <header className={className}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {/* Back Button */}
            {showBackButton && (
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
            
            {/* Logo */}
            <div 
              className="flex items-center cursor-pointer group"
              onClick={handleLogoClick}
            >
              <div className="flex-shrink-0 mr-3">
                <img 
                  src={logoImage} 
                  alt="Indraneel Logo" 
                  className="h-8 w-8 md:h-10 md:w-10 object-contain transition-transform group-hover:scale-105"
                />
              </div>
              
              {/* Company Name & Title */}
              <div className="flex flex-col sm:flex-row sm:items-center">
                <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                  <span className="text-primary-600">DECOFURN</span>
                  {title && (
                    <>
                      <span className="hidden sm:inline text-gray-400 mx-2">|</span>
                      <span className="block sm:inline text-gray-700 text-base md:text-lg">
                        {title}
                      </span>
                    </>
                  )}
                </h1>
              </div>
            </div>
          </div>

          {/* Right Side - User Info & Logout */}
          {(showUserInfo || showLogout) && user && (
            <div className="flex items-center space-x-2 md:space-x-4">
              {showUserInfo && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 hidden sm:inline">
                    Welcome, {user.full_name}
                  </span>
                  <span className="text-sm text-gray-700 sm:hidden">
                    {user.full_name.split(' ')[0]}
                  </span>
                </div>
              )}
              
              {showLogout && (
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
