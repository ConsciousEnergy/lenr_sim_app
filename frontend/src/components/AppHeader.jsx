import { useEffect, useState } from 'react';
import { BellOutlined, UserOutlined, MenuOutlined } from '@ant-design/icons';
import { Toggle } from './ui';
import { isDarkMode, toggleDarkMode } from '../utils/darkMode';

function AppHeader({ toggleSidebar }) {
  const [darkMode, setDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Initialize dark mode state and check for mobile
  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    setDarkMode(isDarkMode());
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    const isDark = toggleDarkMode();
    setDarkMode(isDark);
  };
  
  return (
    <header className="bg-white dark:bg-gray-800 px-4 flex items-center justify-between h-16 shadow-sm">
      <div className="flex items-center">
        {isMobile && (
          <button 
            className="mr-3 p-2 rounded-md hover:bg-neutral-100 hover:dark:bg-gray-700 text-neutral-700 dark:text-gray-300"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            <MenuOutlined className="text-lg" />
          </button>
        )}
        <h1 className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-white m-0 truncate max-w-[200px] md:max-w-none">
          LENR Simulation Platform
        </h1>
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-4">
        <Toggle 
          checked={darkMode}
          onChange={handleDarkModeToggle}
          label={isMobile ? "" : (darkMode ? "Light Mode" : "Dark Mode")}
          size="sm"
        />
        <button 
          className="p-2 rounded-md hover:bg-neutral-100 hover:dark:bg-gray-700 text-neutral-700 dark:text-gray-300"
          aria-label="Notifications"
        >
          <BellOutlined className="text-lg" />
        </button>
        <button 
          className="flex items-center space-x-1 p-2 rounded-md hover:bg-neutral-100 hover:dark:bg-gray-700 text-neutral-700 dark:text-gray-300"
          aria-label="User profile"
        >
          <UserOutlined className="text-lg" />
          <span className="hidden md:inline">Admin</span>
        </button>
      </div>
    </header>
  );
}

export default AppHeader; 