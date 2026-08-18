import React from 'react';
import logoImage from '../assets/KELTRON.png';

const LoginHeader = ({ title = "Employee Portal", subtitle = "Sign in to your account" }) => {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <img 
          src={logoImage} 
          alt="Keltron Logo" 
          className="h-14 sm:h-20 md:h-24 max-w-[80vw] sm:max-w-xs w-auto object-contain" 
        />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl font-bold text-gray-700">
        </h1>
        <h2 className="text-xl md:text-2xl font-semibold text-gray-800">{title}</h2>
        <p className="text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
};

export default LoginHeader;
