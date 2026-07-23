const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const morgan = require('morgan');
require('dotenv').config();
require('./db');

const app = express();
app.use(morgan('dev'));
const PORT = process.env.PORT || 5000;

// Enable CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Frontend Vite dev port
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Built-in parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static folder for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes registration
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/training', require('./routes/training'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/daily-updates', require('./routes/daily-updates'));

// Simple index test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ferret PeopleOS HRMS API is online' });
});

// Serve static frontend build assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message || err);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred on the server'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
