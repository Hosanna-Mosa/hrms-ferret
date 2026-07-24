const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Role = require('../models/Role');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Onboarding = require('../models/Onboarding');
const Leave = require('../models/Leave');
const Task = require('../models/Task');
const Announcement = require('../models/Announcement');
const CourseAssignment = require('../models/CourseAssignment');
const Performance = require('../models/Performance');

const Department = require('../models/Department');
const Project = require('../models/Project');
const Sprint = require('../models/Sprint');
const Document = require('../models/Document');

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log('Starting corporate database reset...');
  
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in the environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Resolve SuperAdmin role and user
    const superAdminRole = await Role.findOne({ name: 'SuperAdmin' }).exec();
    if (!superAdminRole) {
      console.error('CRITICAL: SuperAdmin role does not exist. Please run "npm run seed" first to initialize roles.');
      process.exit(1);
    }

    const superAdminUser = await User.findOne({ role_id: superAdminRole._id }).exec();
    if (!superAdminUser) {
      console.error('CRITICAL: SuperAdmin user does not exist. Please run "npm run seed" first.');
      process.exit(1);
    }

    const superAdminEmp = await Employee.findOne({ user_id: superAdminUser._id }).exec();
    if (!superAdminEmp) {
      console.warn('Warning: SuperAdmin employee profile not found. Wiping all employees...');
    }

    console.log('Cleaning user credentials (preserving SuperAdmin)...');
    await User.deleteMany({ _id: { $ne: superAdminUser._id } });

    console.log('Cleaning employee directory (preserving SuperAdmin)...');
    if (superAdminEmp) {
      await Employee.deleteMany({ _id: { $ne: superAdminEmp._id } });
    } else {
      await Employee.deleteMany({});
    }

    console.log('Cleaning other corporate tables (Attendance, Leaves, Tasks, Announcements, Onboarding, Documents, Performance)...');
    await Attendance.deleteMany({});
    await Onboarding.deleteMany({});
    await Leave.deleteMany({});
    await Task.deleteMany({});
    await Announcement.deleteMany({});
    await CourseAssignment.deleteMany({});
    await Performance.deleteMany({});

    console.log('Cleaning agile structures (Departments, Projects, Sprints, Files)...');
    await Department.deleteMany({});
    await Project.deleteMany({});
    await Sprint.deleteMany({});
    await Document.deleteMany({});

    console.log('\n======================================================');
    console.log('DATABASE RESET COMPLETED SUCCESSFULLY!');
    console.log('All developers, managers, projects, sprints, leaves, and tasks have been cleared.');
    console.log('Only the SuperAdmin profile has been preserved.');
    console.log('\nSuperAdmin Credentials for client demonstration:');
    console.log('Email:    superadmin@ferrettechnologies.com');
    console.log('Password: password123');
    console.log('======================================================\n');

  } catch (error) {
    console.error('Database reset failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run();
