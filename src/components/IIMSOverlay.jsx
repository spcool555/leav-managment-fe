import React from 'react';
import { ArrowLeftCircle } from 'lucide-react';

const IIMSOverlay = ({ onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#ffffff',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Floating Back Button placed in the corner over the IIMS app */}
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '20px',
        zIndex: 100000
      }}>
        <button
          onClick={onClose}
          style={{ 
            backgroundColor: '#d9534f', 
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
          className="hover:opacity-90 transition-opacity"
        >
          <ArrowLeftCircle size={20} />
          <span>Back to Attendance</span>
        </button>
      </div>

      <iframe 
        src="http://31.97.224.19:5173/" 
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="IIMS Application"
      />
    </div>
  );
};

export default IIMSOverlay;
