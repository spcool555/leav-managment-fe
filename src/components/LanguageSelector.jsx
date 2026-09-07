// src/components/LanguageSelector.jsx
import React from "react";

const LanguageSelector = () => {
  const changeLanguage = (lang) => {
    alert(`Language switched to ${lang}`);
  };
  return (
    <div className="lang-selector">
      <button onClick={() => changeLanguage("English")}>English</button>
      <button onClick={() => changeLanguage("Hindi")}>Hindi</button>
    </div>
  );
};

export default LanguageSelector;
