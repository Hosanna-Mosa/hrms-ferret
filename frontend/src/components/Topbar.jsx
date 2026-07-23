import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Topbar = ({ onMenuClick }) => {
  const { user } = useAuth();
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
        <button 
          className="icon-btn" 
          id="quickCheckBtn"
          onClick={() => navigate('/attendance')}
          title="Attendance Portal"
        >
          ◷
        </button>
        <button className="icon-btn">
          <span>◌</span>
          <b>4</b>
        </button>
        {user && (
          <div className="user-chip" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div className="avatar" id="topAvatar">
              {getInitials(user.name)}
            </div>
            <div>
              <strong id="topName">{user.name}</strong>
              <small id="topRole">{user.role}</small>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
