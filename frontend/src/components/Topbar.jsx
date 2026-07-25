import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Topbar = ({ onMenuClick }) => {
  const { user, isClockedIn } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name) => {
    if (!name) return 'UY';
    return name
      .split(' ')
      .map((x) => x[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const handleSearch = (e) => {
    // If they type, just show a message or handle search
  };

  return (
    <header className="topbar">
      <button className="menu-btn" id="menuBtn" onClick={onMenuClick}>
        ☰
      </button>
      <div className="search">
        <span>⌕</span>
        <input 
          id="globalSearch" 
          placeholder="Search people, documents, tasks..."
          onChange={handleSearch}
        />
      </div>
      <div className="top-actions">

        {user && (
          <div className="user-chip" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div style={{ position: 'relative' }}>
              <div className="avatar" id="topAvatar" style={{ overflow: 'hidden', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1e3e6', borderRadius: '50%' }}>
                {user.profile_pic ? (
                  <img 
                    src={user.profile_pic.startsWith('http') ? user.profile_pic : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${user.profile_pic}`} 
                    alt={user.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
                    <rect width="24" height="24" fill="#233138"/>
                    <circle cx="12" cy="9.5" r="4.5" fill="#aebac1"/>
                    <path d="M12 16C7.58 16 4 19.58 4 24H20C20 19.58 16.42 16 12 16Z" fill="#aebac1"/>
                  </svg>
                )}
              </div>
              {isClockedIn && (
                <span style={{ 
                  position: 'absolute', 
                  bottom: '0', 
                  right: '0', 
                  width: '11px', 
                  height: '11px', 
                  backgroundColor: '#2ecb71', 
                  borderRadius: '50%', 
                  border: '2px solid #fff' 
                }} />
              )}
            </div>
            <div>
              <strong id="topName">{user.name}</strong>
              <small id="topRole" style={{ color: isClockedIn ? '#2ecb71' : 'var(--muted)', fontWeight: isClockedIn ? 'bold' : 'normal' }}>
                {isClockedIn ? 'Online' : user.role}
              </small>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
