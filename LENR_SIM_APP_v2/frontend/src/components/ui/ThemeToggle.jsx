import React, { useState } from 'react';

const ThemeToggle = ({ className = '' }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
    // In a real implementation, this would update global theme state
  };

  return (
    <button
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      className={`p-2 rounded-full bg-neutral-100 dark:bg-neutral-700 
        text-neutral-700 dark:text-neutral-300 transition-colors ${className}`}
      onClick={toggleTheme}
    >
      {isDarkMode ? '🌞' : '🌙'}
    </button>
  );
};

export default ThemeToggle; 