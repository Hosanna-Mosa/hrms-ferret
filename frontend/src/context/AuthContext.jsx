import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiRequest, setAccessToken } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
            name: empData.full_name
          });
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
    return data.user;
  };

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
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
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
