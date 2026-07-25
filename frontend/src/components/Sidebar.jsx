import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  
  if (!user) return null;

  const role = user.role || 'Employee';

  const employeeItems = [
    { page: '', label: 'Dashboard', icon: '▦' },
    { page: 'attendance', label: 'Attendance', icon: '◷' },
    { page: 'daily-updates', label: 'Daily Updates', icon: '✎' },
    { page: 'leave', label: 'Leave', icon: '☷' },
    { page: 'tasks', label: 'Tasks & Sprint', icon: '✓' },
    { page: 'onboarding', label: 'Onboarding', icon: '↗' },
    { page: 'offboarding', label: 'Offboarding', icon: '↘' },
    { page: 'documents', label: 'Documents', icon: '▤' },
    { page: 'announcements', label: 'Announcements', icon: '◉' },
    { page: 'performance', label: 'Performance', icon: '⌁' },
    { page: 'training', label: 'Training', icon: '▶' },
    { page: 'profile', label: 'My Profile', icon: '○' },
  ];

  const adminItems = [
    { page: 'admin/managers', label: 'Managers', icon: '♟', roles: ['HR', 'SuperAdmin'] },
    { page: 'admin/employees', label: 'Employees', icon: '♙', roles: ['HR', 'Manager', 'SuperAdmin'] },
    { page: 'admin/departments', label: 'Departments', icon: '☷', roles: ['HR', 'SuperAdmin'] },
    { page: 'projects-sprints', label: 'Projects & Sprints', icon: '☲', roles: ['Manager', 'SuperAdmin'] },
  ];

  // Determine which items to display
  let displayItems = [];

  if (role === 'Employee') {
    displayItems = employeeItems;
  } else if (role === 'Manager') {
    displayItems = [
      employeeItems[0], // Dashboard
      employeeItems[1], // Attendance
      { page: 'admin/employees', label: 'Employees', icon: '♙' },
      employeeItems[2], // Daily Updates
      employeeItems[3], // Leave
      employeeItems[4], // Tasks & Sprint
      { page: 'projects-sprints', label: 'Projects & Sprints', icon: '☲' },
      employeeItems[5], // Onboarding
      employeeItems[6], // Offboarding
      employeeItems[7], // Documents
      employeeItems[8], // Announcements
      employeeItems[11], // My Profile
    ];
  } else if (role === 'HR') {
    displayItems = [
      employeeItems[0], // Dashboard
      employeeItems[1], // Attendance
      { page: 'admin/managers', label: 'Managers', icon: '♟' },
      { page: 'admin/employees', label: 'Employees', icon: '♙' },
      { page: 'admin/departments', label: 'Departments', icon: '☷' },
      employeeItems[3], // Leave
      employeeItems[5], // Onboarding
      employeeItems[6], // Offboarding
      employeeItems[7], // Documents
      employeeItems[8], // Announcements
      employeeItems[11], // My Profile
    ];
  } else if (role === 'SuperAdmin') {
    displayItems = [
      employeeItems[0], // Dashboard
      employeeItems[1], // Attendance
      { page: 'admin/managers', label: 'Managers', icon: '♟' },
      { page: 'admin/employees', label: 'Employees', icon: '♙' },
      { page: 'admin/departments', label: 'Departments', icon: '☷' },
      employeeItems[3], // Leave
      { page: 'projects-sprints', label: 'Projects & Sprints', icon: '☲' },
      employeeItems[7], // Documents
      employeeItems[8], // Announcements
      employeeItems[9], // Performance
      employeeItems[11], // My Profile
    ];
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
      <div className="sidebar-brand brand">
        <img src="/logo.svg" className="logo" alt="Ferret Logo" style={{ objectFit: 'contain' }} />
        <div>
          <strong>FERRET</strong>
          <small>PEOPLEOS</small>
        </div>
      </div>
      
      <div style={{ padding: '0 20px', margin: '-10px 0 15px 0', fontSize: '0.75rem', opacity: 0.7, color: 'var(--color-primary)' }}>
        Role: <strong>{role}</strong>
      </div>

      <nav id="sideNav">
        {displayItems.map((item) => (
          <NavLink
            key={item.page}
            to={`/${item.page}`}
            end={item.page === ''}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={toggleSidebar}
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="mini-help">
          <strong>Need help?</strong>
          <small>Contact hr@ferrettechnologies.com</small>
        </div>
        <button className="nav-item" onClick={logout} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
          <span>↩</span>Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
