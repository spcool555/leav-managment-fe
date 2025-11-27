import React from 'react';
import logoImage from '../assets/DECOFURN.png';

const LoginHeader = ({ title = "Employee Portal", subtitle = "Sign in to your account" }) => {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <div className="bg-white p-4 rounded-full shadow-lg border-2 border-primary-100">
          <img 
            src={logoImage} 
            alt="Indraneel Logo" 
            className="h-12 w-12 md:h-16 md:w-16 object-contain"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          <span className="text-primary-600">DECOFURN</span>
        </h1>
        <h2 className="text-xl md:text-2xl font-semibold text-gray-800">{title}</h2>
        <p className="text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
};

export default LoginHeader;
