import React, { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = () => {
  const [isPinned, setIsPinned] = useState(window.innerWidth > 800);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 800);
  const closeTimeoutRef = useRef(null);

  // Clean up any timeouts when the component unmounts
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const toggleSidebar = () => {
    if (sidebarOpen) {
      setSidebarOpen(false);
      setIsPinned(false);
    } else {
      setSidebarOpen(true);
      setIsPinned(true);
    }
  };

  const handleMouseEnterSidebar = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseLeaveSidebar = () => {
    if (!isPinned) {
      closeTimeoutRef.current = setTimeout(() => {
        setSidebarOpen(false);
      }, 300); // 300ms delay to prevent accidental closing
    }
  };

  const handleHoverTriggerEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setSidebarOpen(true);
  };

  const handleLinkClick = () => {
    if (window.innerWidth <= 800) {
      setSidebarOpen(false);
      setIsPinned(false);
    } else {
      if (!isPinned) {
        setSidebarOpen(false);
      }
    }
  };

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Invisible Hover Trigger on the left edge of the screen */}
      {!sidebarOpen && (
        <div
          className="sidebar-hover-trigger"
          onMouseEnter={handleHoverTriggerEnter}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: '15px',
            zIndex: 9999,
            backgroundColor: 'transparent'
          }}
        />
      )}
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar} 
        onMouseEnter={handleMouseEnterSidebar}
        onMouseLeave={handleMouseLeaveSidebar}
        onLinkClick={handleLinkClick}
      />
      <div className="main">
        <Topbar onMenuClick={toggleSidebar} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
