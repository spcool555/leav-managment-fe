import React from 'react';

const InventoryButton = () => {
  const handleClick = () => {
    // Open the inventory URL in a new tab
    window.open('http://31.97.224.19:5173/', '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      style={{
        marginLeft: '8px',
        padding: '6px 12px',
        background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }}
    >
      Inventory
    </button>
  );
};

export default InventoryButton;
