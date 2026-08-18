import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import logoImage from '../assets/KELTRON.png';

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
              <img src={logoImage} alt="Keltron Logo" className="h-8 sm:h-12 md:h-14 max-w-[40vw] sm:max-w-xs w-auto mr-3 object-contain" />
              <h1 className="text-lg font-semibold text-gray-900">
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
                  className="flex items-center gap-2 hover:opacity-90 px-4 py-1.5 rounded-md text-sm font-bold shadow transition-opacity"
                >
                  <Globe className="h-5 w-5" />
  <span>Language</span>
                </button>

                {showLangDropdown && (
                  <div className="absolute right-0 mt-2 w-24 bg-white border rounded-md shadow-md z-50">
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      ENGLISH
                    </button>
                    <button
                      onClick={() => handleLanguageChange('hi')}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      HINDI
                    </button>
                    <button
                      onClick={() => handleLanguageChange('mr')}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      MARATHI
                    </button>
                  </div>
                )}
              </div>

              {showUserInfo && (
                <span className="text-sm text-gray-700">
                 Welcome, <span className="font-bold">{user.full_name}</span>
                </span>
              )}

              {showLogout && (
                <button
                  onClick={logout}
                  className="flex items-center justify-center space-x-2 px-4 py-1.5 rounded-md text-sm font-bold shadow transition"
                  style={{
                    border: '1px solid #d9534f',
                    color: '#d9534f',
                    backgroundColor: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff5f4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                   }}
                >
                  <LogOut className="h-4 w-4" />
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