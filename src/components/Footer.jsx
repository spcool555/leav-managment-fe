import React from 'react';
import decofurnLogo from '../assets/DECOFURN.png';

const Footer = () => {
  return (
    <footer className="w-full bg-[#f8f7f5] py-3.5 px-4 sm:px-8 mt-auto border-t border-gray-200/60 z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 text-xs sm:text-sm text-[#4a4a4a] font-medium">
        {/* Left Horizontal Line */}
        <div className="flex-1 h-[1px] bg-gray-300/80"></div>

        {/* Center Content: Text + Logo + Text */}
        <div className="flex items-center gap-2.5 shrink-0 px-1 flex-wrap sm:flex-nowrap justify-center text-center">
          <span>All Rights Reserved.</span>
          <img 
            src={decofurnLogo} 
            alt="Decofurn Logo" 
            className="h-5 sm:h-6 w-auto object-contain mx-0.5 inline-block shrink-0"
          />
          <span>Managed & Maintained by Decofurn Multisolution Management Pvt. Ltd.</span>
        </div>

        {/* Right Horizontal Line */}
        <div className="flex-1 h-[1px] bg-gray-300/80"></div>
      </div>
    </footer>
  );
};

export default Footer;
