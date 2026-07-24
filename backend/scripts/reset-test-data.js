const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Task = require('../models/Task');
const DailyUpdate = require('../models/DailyUpdate');
const Announcement = require('../models/Announcement');
const CourseAssignment = require('../models/CourseAssignment');
const Performance = require('../models/Performance');
const Onboarding = require('../models/Onboarding');
const Offboarding = require('../models/Offboarding');
const AuditLog = require('../models/AuditLog');

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log('Initiating Database Clean-up (preserving Roles, Users, Employees, Courses, and Documents/Pictures)...');
  
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in the environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Clear Attendance
    const resAtt = await Attendance.deleteMany({});
    console.log(`- Cleared Attendance logs: Deleted ${resAtt.deletedCount} documents.`);

    // 2. Clear Leave
    const resLeave = await Leave.deleteMany({});
    console.log(`- Cleared Leave requests: Deleted ${resLeave.deletedCount} documents.`);

    // 3. Clear Task
    const resTask = await Task.deleteMany({});
    console.log(`- Cleared Tasks: Deleted ${resTask.deletedCount} documents.`);

    // 4. Clear Daily Updates
    const resDailyUpdate = await DailyUpdate.deleteMany({});
    console.log(`- Cleared Daily Updates: Deleted ${resDailyUpdate.deletedCount} documents.`);

    // 5. Clear Announcements
    const resAnn = await Announcement.deleteMany({});
    console.log(`- Cleared Announcements: Deleted ${resAnn.deletedCount} documents.`);

    // 6. Clear Course Assignments (not courses themselves)
    const resCourseAss = await CourseAssignment.deleteMany({});
    console.log(`- Cleared Course Assignments: Deleted ${resCourseAss.deletedCount} documents.`);

    // 7. Clear Performance Reviews
    const resPerf = await Performance.deleteMany({});
    console.log(`- Cleared Performance Reviews: Deleted ${resPerf.deletedCount} documents.`);

    // 8. Clear Onboarding Checklist
    const resOnboard = await Onboarding.deleteMany({});
    console.log(`- Cleared Onboarding checklists: Deleted ${resOnboard.deletedCount} documents.`);

    // 9. Clear Offboarding Checklist
    const resOffboard = await Offboarding.deleteMany({});
    console.log(`- Cleared Offboarding checklists: Deleted ${resOffboard.deletedCount} documents.`);

    // 10. Clear Audit Logs (if any)
    const resAudit = await AuditLog.deleteMany({});
    console.log(`- Cleared Audit Logs: Deleted ${resAudit.deletedCount} documents.`);

    console.log('\nDatabase clean-up finished successfully. Ready for clean testing!');

  } catch (err) {
    console.error('Error during database reset:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

run();
