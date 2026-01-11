import { useState, useEffect } from 'react';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import AppFooter from './AppFooter';

function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  
  // Check if the screen is mobile-sized on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarVisible(!sidebarVisible);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-50 md:flex-row">
      {/* Mobile overlay for sidebar when open */}
      {isMobile && sidebarVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setSidebarVisible(false)}
        />
      )}
      
      {/* Sidebar - hidden by default on mobile, shown when toggled */}
      <div className={`
        ${isMobile ? 'fixed z-20 h-screen' : 'relative'} 
        ${sidebarVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        transition-transform duration-300 ease-in-out
      `}>
        <AppSidebar 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          toggleSidebar={toggleSidebar}
          isMobile={isMobile}
        />
      </div>
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
        
        <AppFooter />
      </div>
    </div>
  );
}

export default AppLayout; 