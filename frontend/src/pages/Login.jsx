import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { setAccessToken } from '../utils/api';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('employee@ferrettechnologies.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  const handleGoogleSSO = async () => {
    // Open a popup for mock Google login
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      '/api/auth/google',
      'Google SSO Login',
      `width=${width},height=${height},top=${top},left=${left}`
    );

    const handleMessage = async (event) => {
      if (event.data && event.data.token) {
        popup.close();
        window.removeEventListener('message', handleMessage);
        
        // Save token and update state
        const { token, user } = event.data;
        setAccessToken(token);
        // Trigger a context refresh by reloading or calling checkAuth via state update
        window.location.reload();
      }
    };

    window.addEventListener('message', handleMessage);
  };

  return (
    <section id="authScreen" className="auth-screen">
      <div className="auth-brand-panel">
        <div className="brand">
          <span className="logo">F</span>
          <div>
            <strong>FERRET</strong>
            <small>PEOPLEOS</small>
          </div>
        </div>
        <div className="auth-copy">
          <span className="eyebrow light">EMPLOYEE EXPERIENCE PLATFORM</span>
          <h1>Run your people operations from one secure workspace.</h1>
          <p>Attendance, onboarding, offboarding, leave, tasks, documents, performance, learning, and HR administration.</p>
          <div className="auth-points">
            <div><span>✓</span> Employee self-service</div>
            <div><span>✓</span> HR and manager workflows</div>
            <div><span>✓</span> Audit-ready records</div>
          </div>
        </div>
        <div className="auth-footer">© 2026 Ferret Private Limited</div>
      </div>

      <div className="auth-form-panel">
        <div className="login-card">
          <div className="mobile-brand brand">
            <span className="logo">F</span>
            <div>
              <strong>FERRET</strong>
              <small>PEOPLEOS</small>
            </div>
          </div>
          <span className="eyebrow">SECURE ACCESS</span>
          <h2>Welcome back</h2>
          <p>Sign in with your Ferret work account.</p>
          <form id="loginForm" onSubmit={handleSubmit}>
            {error && (
              <div style={{ color: 'var(--red)', fontSize: '11px', fontWeight: 'bold', marginBottom: '15px' }}>
                ⚠️ {error}
              </div>
            )}
            <label>
              Work Email
              <input
                id="loginEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <div className="password-wrap">
                <input
                  id="loginPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  id="togglePassword"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            <div className="form-row">
              <label className="inline-check">
                <input type="checkbox" defaultChecked /> Remember me
              </label>
              <button
                className="link-btn"
                type="button"
                onClick={() => alert('Password reset link has been stubbed. Set up nodemailer in backend/routes/auth.js to activate email delivery.')}
              >
                Forgot password?
              </button>
            </div>
            <button className="btn primary full" type="submit" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          <div className="demo-box">
            <strong>Demo accounts (Click to fill)</strong>
            <p 
              onClick={() => fillCredentials('employee@ferrettechnologies.com')} 
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              Employee: employee@ferrettechnologies.com
            </p>
            <p 
              onClick={() => fillCredentials('manager@ferrettechnologies.com')} 
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              Manager: manager@ferrettechnologies.com
            </p>
            <p 
              onClick={() => fillCredentials('hr@ferrettechnologies.com')} 
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              HR: hr@ferrettechnologies.com
            </p>
            <p 
              onClick={() => fillCredentials('superadmin@ferrettechnologies.com')} 
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              SuperAdmin: superadmin@ferrettechnologies.com
            </p>
            <p>Password: password123</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
