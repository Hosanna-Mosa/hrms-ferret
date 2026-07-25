const express = require('express');
const router = express.Router();
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');
require('dotenv').config();

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

// Generate Tokens
const generateAccessToken = (user, employee) => {
  return jwt.sign(
    { 
      userId: user._id, 
      employeeId: employee ? employee._id : null, 
      role: user.role_id ? user.role_id.name : 'Employee', 
      email: user.work_email, 
      name: employee ? employee.full_name : 'User' 
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
};

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ work_email: email.toLowerCase() })
      .populate('role_id')
      .exec();

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const validPassword = await argon2.verify(user.password_hash, password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const employee = await Employee.findOne({ user_id: user._id }).exec();

    // Generate tokens
    const accessToken = generateAccessToken(user, employee);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      token: accessToken,
      user: {
        id: user._id,
        employeeId: employee ? employee._id : null,
        email: user.work_email,
        role: user.role_id ? user.role_id.name : 'Employee',
        name: employee ? employee.full_name : 'User',
        profile_pic: employee ? employee.profile_pic : null
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Refresh Token
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.userId)
      .populate('role_id')
      .exec();

    if (!user || !user.is_active) {
      return res.status(403).json({ message: 'User not found or deactivated' });
    }

    const employee = await Employee.findOne({ user_id: user._id }).exec();

    const accessToken = generateAccessToken(user, employee);
    const newRefreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ token: accessToken });
  } catch (error) {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// Stubs for extra features
router.post('/forgot-password', (req, res) => {
  res.json({ message: 'Password reset instructions sent to your email.' });
});

router.post('/reset-password', (req, res) => {
  res.json({ message: 'Password reset successfully.' });
});

router.post('/2fa/setup', (req, res) => {
  res.json({ message: '2FA Setup initiated. QR code generated.', secret: 'MFASECRET12345' });
});

router.post('/2fa/verify', (req, res) => {
  res.json({ message: '2FA verified successfully.' });
});

// Google SSO mock endpoints
router.get('/google', (req, res) => {
  res.json({ redirectUrl: '/api/auth/google/callback?code=mock_google_code' });
});

router.get('/google/callback', async (req, res) => {
  try {
    const user = await User.findOne({ work_email: 'employee@ferrettechnologies.com' })
      .populate('role_id')
      .exec();
    
    const employee = await Employee.findOne({ user_id: user._id }).exec();

    const accessToken = generateAccessToken(user, employee);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.send(`
      <script>
        window.opener.postMessage({ token: "${accessToken}", user: ${JSON.stringify({
          id: user._id,
          employeeId: employee ? employee._id : null,
          email: user.work_email,
          role: user.role_id ? user.role_id.name : 'Employee',
          name: employee ? employee.full_name : 'User'
        })} }, "*");
        window.close();
      </script>
    `);
  } catch (error) {
    res.status(500).send("OAuth Mock Authentication Failed");
  }
});

module.exports = router;
