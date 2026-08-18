import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
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

  // ✅ STATES
  const [language, setLanguage] = useState('en');
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  // ✅ LOAD SAVED LANGUAGE
  useEffect(() => {
    if (user?.preferred_language) {
      setLanguage(user.preferred_language);
    }
  }, [user]);

  // ✅ HANDLERS
  const handleBack = () => navigate(backPath);

  const handleLogoClick = () => {
    navigate(user?.is_admin ? '/admin' : '/dashboard');
  };

  const handleLanguageChange = async (lang) => {
    setLanguage(lang);
    setShowLangDropdown(false);

    try {
      await api.put('/user/language', {
        employee_id: user.id,
        language: lang
      });
      toast.success('Language updated');
    } catch (error) {
      toast.error('Failed to update language');
    }
  };

  return (
    <header className={className}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* LEFT SIDE */}
          <div className="flex items-center">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            <div
              className="flex items-center cursor-pointer"
              onClick={handleLogoClick}
            >
              <img src={logoImage} alt="Logo" className="h-8 w-8 mr-3" />
              <h1 className="text-lg font-semibold text-gray-900">
                <span className="text-primary-600">DECOFURN</span>
                {title && <span className="ml-2 text-gray-600">{title}</span>}
              </h1>
            </div>
          </div>

          {/* RIGHT SIDE */}
          {(showUserInfo || showLogout) && user && (
            <div className="flex items-center space-x-3">

              {/* ✅ SKY BLUE LANGUAGE BUTTON */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  style={{ backgroundColor: '#97D3CD', color: '#0d4039' }}
                  className="hover:opacity-90 px-4 py-1.5 rounded-md text-sm font-bold shadow transition-opacity"
                >
                  Language
                </button>

                {showLangDropdown && (
                  <div className="absolute right-0 mt-2 w-24 bg-white border rounded-md shadow-md z-50">
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      EN
                    </button>
                    <button
                      onClick={() => handleLanguageChange('hi')}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      HI
                    </button>
                    <button
                      onClick={() => handleLanguageChange('mr')}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      MR
                    </button>
                  </div>
                )}
              </div>

              {showUserInfo && (
                <span className="text-sm text-gray-700">
                  Welcome, {user.full_name}
                </span>
              )}

              {showLogout && (
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden sm:inline">Logout</span>
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