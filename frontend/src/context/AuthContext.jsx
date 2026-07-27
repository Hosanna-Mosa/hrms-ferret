import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiRequest, setAccessToken } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isClockedIn, setIsClockedIn] = useState(false);

  const checkClockInStatus = async (employeeId) => {
    if (!employeeId) return;
    try {
      const month = new Date().toISOString().slice(0, 7);
      const res = await apiRequest(`/api/attendance/me?month=${month}`);
      if (res.ok) {
        const attHistory = await res.json();
        const today = new Date().toISOString().slice(0, 10);
        const todaySession = attHistory.find(s => s.work_date.slice(0, 10) === today);
        if (todaySession && !todaySession.check_out_at) {
          setIsClockedIn(true);
        } else {
          setIsClockedIn(false);
        }
      }
    } catch (e) {
      console.warn('Error checking clock-in status:', e);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.token);
        
        // Fetch current employee details
        const meRes = await apiRequest('/api/employees/me');
        if (meRes.ok) {
          const empData = await meRes.json();
          setUser({
            id: empData.user_id,
            employeeId: empData._id,
            email: empData.work_email,
            role: empData.role_name,
            name: empData.full_name,
            profile_pic: empData.profile_pic || null
          });
          await checkClockInStatus(empData._id);
        }
      }
    } catch (err) {
      console.warn('Initial session check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for global session expired event
    const handleExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth-session-expired', handleExpired);
    return () => window.removeEventListener('auth-session-expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }

    const data = await res.json();
    setAccessToken(data.token);
    setUser(data.user);
    if (data.user && data.user.employeeId) {
      await checkClockInStatus(data.user.employeeId);
    }
    return data.user;
  };

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    if (toastVisible) {
      const timer = setTimeout(() => {
        setToastVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastVisible]);

  useEffect(() => {
    window.alert = (message) => {
      const lower = String(message).toLowerCase();
      let type = 'success';
      if (lower.includes('fail') || lower.includes('error') || lower.includes('forbidden') || lower.includes('deny') || lower.includes('invalid') || lower.includes('please')) {
        type = 'error';
      } else if (lower.includes('warning') || lower.includes('caution')) {
        type = 'warning';
      }
      showToast(message, type);
    };
  }, []);

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, isClockedIn, setIsClockedIn, checkClockInStatus, showToast }}>
      {children}
      <div 
        className={`toast ${toastVisible ? 'show' : ''}`} 
        style={{ 
          background: toastType === 'error' ? 'var(--red)' : toastType === 'warning' ? 'var(--amber)' : '#15181d', 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px' 
        }}
      >
        <span>{toastType === 'error' ? '❌' : toastType === 'warning' ? '⚠️' : '✅'}</span>
        <span>{toastMessage}</span>
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
