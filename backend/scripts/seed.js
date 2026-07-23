const mongoose = require('mongoose');
const argon2 = require('argon2');
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
const Course = require('../models/Course');
const CourseAssignment = require('../models/CourseAssignment');
const Performance = require('../models/Performance');

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log('Starting MongoDB database seeding (Role-Based Update)...');
  
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in the environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Clear existing collections
    console.log('Clearing existing collections...');
    await Role.deleteMany({});
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Attendance.deleteMany({});
    await Onboarding.deleteMany({});
    await Leave.deleteMany({});
    await Task.deleteMany({});
    await Announcement.deleteMany({});
    await Course.deleteMany({});
    await CourseAssignment.deleteMany({});
    await Performance.deleteMany({});
    console.log('Collections cleared.');

    // Password Hashing
    const passwordHash = await argon2.hash('password123');

    // 1. Seed Roles
    console.log('Seeding exact roles...');
    const rSuperAdmin = await Role.create({
      name: 'SuperAdmin',
      permissions: {
        all: ['*']
      }
    });

    const rHr = await Role.create({
      name: 'HR',
      permissions: {
        employees: ['create', 'read', 'update', 'delete'],
        managers: ['create', 'read', 'update'],
        attendance: ['read', 'update'],
        leaves: ['read', 'update'],
        documents: ['read', 'verify'],
        payroll: ['export'],
        announcements: ['create', 'delete']
      }
    });

    const rManager = await Role.create({
      name: 'Manager',
      permissions: {
        employees: ['read'],
        attendance: ['read'],
        leaves: ['read', 'update'],
        daily_updates: ['read', 'update']
      }
    });

    const rEmployee = await Role.create({
      name: 'Employee',
      permissions: {
        employees: ['read_self'],
        attendance: ['read_self', 'write_self'],
        leaves: ['read_self', 'write_self'],
        daily_updates: ['read_self', 'write_self']
      }
    });

    // 2. Seed Users
    console.log('Seeding users...');
    const uSuperAdmin = await User.create({ work_email: 'superadmin@ferrettechnologies.com', password_hash: passwordHash, role_id: rSuperAdmin._id, is_active: true });
    const uHr = await User.create({ work_email: 'hr@ferrettechnologies.com', password_hash: passwordHash, role_id: rHr._id, is_active: true });
    const uManager = await User.create({ work_email: 'manager@ferrettechnologies.com', password_hash: passwordHash, role_id: rManager._id, is_active: true });
    const uEmployee1 = await User.create({ work_email: 'employee@ferrettechnologies.com', password_hash: passwordHash, role_id: rEmployee._id, is_active: true });
    const uEmployee2 = await User.create({ work_email: 'hosana.mosa@ferrettechnologies.com', password_hash: passwordHash, role_id: rEmployee._id, is_active: true });
    const uEmployee3 = await User.create({ work_email: 'sunand.vemavarapu@ferrettechnologies.com', password_hash: passwordHash, role_id: rEmployee._id, is_active: true });
    const uEmployee4 = await User.create({ work_email: 'dhanush.kovilapu@ferrettechnologies.com', password_hash: passwordHash, role_id: rEmployee._id, is_active: true });

    // 3. Seed Employees
    console.log('Seeding employees...');
    
    // SuperAdmin Profile
    const empSuperAdmin = await Employee.create({
      user_id: uSuperAdmin._id,
      employee_code: 'FER-2026-999',
      full_name: 'Super Administrator',
      personal_email: 'superadmin.personal@gmail.com',
      phone: '+1 469 555 0000',
      department: 'Executive',
      designation: 'CEO / Founder',
      joining_date: new Date('2026-01-01'),
      employment_status: 'active'
    });

    // Manager Profile
    const empManager = await Employee.create({
      user_id: uManager._id,
      employee_code: 'FER-2026-000',
      full_name: 'Project Manager',
      personal_email: 'manager.personal@gmail.com',
      phone: '+1 469 555 0100',
      department: 'Engineering',
      designation: 'Project Manager',
      joining_date: new Date('2026-01-15'),
      employment_status: 'active'
    });

    // HR Profile
    const empHr = await Employee.create({
      user_id: uHr._id,
      employee_code: 'FER-2026-099',
      full_name: 'Ferret HR',
      personal_email: 'hr.personal@gmail.com',
      phone: '+1 469 555 0199',
      department: 'HR',
      designation: 'HR Lead',
      manager_id: empManager._id,
      joining_date: new Date('2026-02-01'),
      employment_status: 'active'
    });

    // Employee 1 (Uttej)
    const emp1 = await Employee.create({
      user_id: uEmployee1._id,
      employee_code: 'FER-2026-001',
      full_name: 'Uttej Yadala',
      personal_email: 'employee.personal@gmail.com',
      phone: '+1 469 555 0188',
      date_of_birth: new Date('1996-11-24'),
      address: 'Dallas, Texas, United States',
      emergency_contact: { name: 'Surya Teja Yadala', relationship: 'Sibling', phone: '+1 469 555 9999' },
      department: 'Engineering',
      designation: 'Software Development Engineer',
      manager_id: empManager._id,
      joining_date: new Date('2026-07-20'),
      employment_status: 'active',
      work_mode: 'remote',
      profile_data: {
        skills: ['ServiceNow', 'JavaScript', 'React', 'Node.js'],
        certifications: ['CSA', 'CAD'],
        summary: 'Software engineer with enterprise platform, workflow automation, integrations, and product development experience.'
      }
    });

    // Employee 2 (Hosana)
    const emp2 = await Employee.create({
      user_id: uEmployee2._id,
      employee_code: 'FER-2026-002',
      full_name: 'Hosana Mosa',
      personal_email: 'hosana.mosa@gmail.com',
      phone: '+1 469 555 0182',
      department: 'Engineering',
      designation: 'Software Development Engineer',
      manager_id: empManager._id,
      joining_date: new Date('2026-07-20'),
      employment_status: 'onboarding',
      work_mode: 'remote'
    });

    // Employee 3 (Sunand)
    const emp3 = await Employee.create({
      user_id: uEmployee3._id,
      employee_code: 'FER-2026-003',
      full_name: 'Sunand Vemavarapu',
      personal_email: 'sunand.v@gmail.com',
      phone: '+1 469 555 0183',
      department: 'Engineering',
      designation: 'Software Development Engineer',
      manager_id: empManager._id,
      joining_date: new Date('2026-07-20'),
      employment_status: 'onboarding',
      work_mode: 'office'
    });

    // Employee 4 (Dhanush)
    const emp4 = await Employee.create({
      user_id: uEmployee4._id,
      employee_code: 'FER-2026-004',
      full_name: 'Dhanush Kovilapu',
      personal_email: 'dhanush.k@gmail.com',
      phone: '+1 469 555 0184',
      department: 'Engineering',
      designation: 'Software Development Engineer',
      manager_id: empManager._id,
      joining_date: new Date('2026-07-20'),
      employment_status: 'onboarding',
      work_mode: 'remote'
    });

    // 4. Seed Onboarding Items
    console.log('Seeding onboarding items...');
    const onboardingSetup = async (empId, progress) => {
      const categories = ['personal', 'documents', 'bank', 'agreements', 'policies'];
      const statuses = progress === 60 ? ['verified', 'verified', 'verified', 'pending', 'pending'] :
                       progress === 80 ? ['verified', 'verified', 'verified', 'verified', 'pending'] :
                       progress === 55 ? ['verified', 'verified', 'pending', 'pending', 'pending'] :
                       ['pending', 'pending', 'pending', 'pending', 'pending'];
      
      for(let i=0; i<categories.length; i++) {
        await Onboarding.create({
          employee_id: empId,
          category: categories[i],
          item_key: `${categories[i]}_details`,
          status: statuses[i]
        });
      }
    };
    await onboardingSetup(emp2._id, 60);
    await onboardingSetup(emp3._id, 80);
    await onboardingSetup(emp4._id, 55);

    // 5. Seed Announcements
    console.log('Seeding announcements...');
    const announcements = [
      ['Holiday', 'Independence Day Holiday', 'Office will remain closed on August 15.'],
      ['Event', 'Monthly All-Hands', 'Join the company-wide meeting this Friday at 4 PM.'],
      ['Birthday', 'Team Birthday Celebration', 'Celebrating this month’s birthdays on July 25.'],
      ['New Joiner', 'Welcome New SDE Interns', 'Hosana, Sunand, and Dhanush are joining Engineering.']
    ];
    for (const ann of announcements) {
      await Announcement.create({
        category: ann[0],
        title: ann[1],
        body: ann[2],
        published_by: uHr._id
      });
    }

    // 6. Seed Leave Requests
    console.log('Seeding leave requests...');
    await Leave.create({
      employee_id: emp1._id,
      leave_type: 'Casual Leave',
      start_date: new Date('2026-07-24'),
      end_date: new Date('2026-07-25'),
      reason: 'Family function',
      status: 'pending'
    });
    await Leave.create({
      employee_id: emp1._id,
      leave_type: 'Sick Leave',
      start_date: new Date('2026-06-12'),
      end_date: new Date('2026-06-12'),
      reason: 'Fever',
      status: 'approved',
      approver_id: empManager._id,
      decision_at: new Date()
    });
    await Leave.create({
      employee_id: emp2._id,
      leave_type: 'Casual Leave',
      start_date: new Date('2026-07-24'),
      end_date: new Date('2026-07-25'),
      reason: 'Personal emergency',
      status: 'pending'
    });
    await Leave.create({
      employee_id: emp3._id,
      leave_type: 'Sick Leave',
      start_date: new Date('2026-07-21'),
      end_date: new Date('2026-07-21'),
      reason: 'Medical checkup',
      status: 'pending'
    });

    // 7. Seed Tasks (Sprint 12)
    console.log('Seeding tasks...');
    const tasks = [
      ['FER-142', emp1._id, 'Employee portal authentication', 'Sprint 12', new Date('2026-07-23'), 3, 'review', 'high'],
      ['FER-137', emp1._id, 'Attendance API integration', 'Sprint 12', new Date('2026-07-22'), 8, 'in progress', 'high'],
      ['FER-129', emp1._id, 'Update onboarding checklist', 'Sprint 12', new Date('2026-07-25'), 2, 'in progress', 'low'],
      ['FER-145', emp1._id, 'Implement Google SSO', 'Sprint 12', new Date('2026-07-24'), 5, 'todo', 'high'],
      ['FER-149', emp1._id, 'Policy acknowledgement API', 'Sprint 12', new Date('2026-07-25'), 3, 'todo', 'medium'],
      ['FER-141', emp1._id, 'Employee profile validation', 'Sprint 12', new Date('2026-07-23'), 3, 'review', 'medium'],
      ['FER-120', emp1._id, 'Dashboard UI', 'Sprint 12', new Date('2026-07-18'), 5, 'done', 'low'],
      ['FER-118', emp1._id, 'Login flow', 'Sprint 12', new Date('2026-07-17'), 3, 'done', 'low']
    ];
    for (const t of tasks) {
      await Task.create({
        external_key: t[0],
        employee_id: t[1],
        title: t[2],
        sprint: t[3],
        due_date: t[4],
        story_points: t[5],
        status: t[6],
        priority: t[7]
      });
    }

    // 8. Seed Courses
    console.log('Seeding courses...');
    const courses = [
      ['Information Security Essentials', 'Video · 45 min', 45],
      ['Ferret Code of Conduct', 'Document + Quiz', 30],
      ['ServiceNow Advanced Development', 'Course · 6 hours', 360],
      ['Secure Coding for Web Apps', 'Video · 2 hours', 120],
      ['Manager Essentials', 'Course · 3 hours', 180],
      ['Data Privacy & Compliance', 'Quiz · 30 min', 30]
    ];
    const createdCourses = [];
    for (const c of courses) {
      const course = await Course.create({
        title: c[0],
        course_type: c[1],
        duration_minutes: c[2]
      });
      createdCourses.push(course);
    }

    // Assign courses to Uttej (emp1._id) with progress
    const progress = [72, 100, 48, 25, 0, 100];
    for (let i = 0; i < createdCourses.length; i++) {
      await CourseAssignment.create({
        course_id: createdCourses[i]._id,
        employee_id: emp1._id,
        progress_percent: progress[i],
        completed_at: progress[i] === 100 ? new Date() : null
      });
    }

    // 9. Seed Attendance Sessions
    console.log('Seeding attendance...');
    const attData = [
      ['2026-07-16', '09:18:00', '18:10:00', 'wfh', 480, 52, 'late'],
      ['2026-07-17', '09:06:00', '18:02:00', 'office', 491, 45, 'present'],
      ['2026-07-18', '09:01:00', '18:08:00', 'remote', 499, 48, 'present']
    ];
    for (const att of attData) {
      const workDate = att[0];
      const checkIn = new Date(`${workDate}T${att[1]}+05:30`);
      const checkOut = new Date(`${workDate}T${att[2]}+05:30`);
      
      const breakStart = new Date(`${workDate}T13:00:00+05:30`);
      const breakEnd = new Date(breakStart.getTime() + att[5] * 60000);

      await Attendance.create({
        employee_id: emp1._id,
        work_date: workDate,
        check_in_at: checkIn,
        check_out_at: checkOut,
        work_mode: att[3],
        status: att[6],
        total_work_minutes: att[4],
        total_break_minutes: att[5],
        breaks: [{ started_at: breakStart, ended_at: breakEnd }]
      });
    }

    // Today's attendance report for Hosana and Sunand
    const todayStr = new Date().toISOString().slice(0, 10);
    const hosanaIn = new Date(`${todayStr}T09:02:00+05:30`);
    await Attendance.create({
      employee_id: emp2._id,
      work_date: todayStr,
      check_in_at: hosanaIn,
      work_mode: 'remote',
      status: 'present',
      total_work_minutes: 320
    });

    const sunandIn = new Date(`${todayStr}T09:18:00+05:30`);
    await Attendance.create({
      employee_id: emp3._id,
      work_date: todayStr,
      check_in_at: sunandIn,
      work_mode: 'office',
      status: 'late',
      total_work_minutes: 304
    });

    // 10. Seed Performance Review
    console.log('Seeding performance reviews...');
    await Performance.create({
      employee_id: emp1._id,
      review_period: 'Q2 2026',
      attendance_score: 96,
      sprint_score: 89,
      task_score: 92,
      learning_score: 68,
      manager_rating: 4.4,
      manager_feedback: 'Consistently delivers high-quality work and collaborates well across the team.'
    });

    console.log('Database seeded successfully.');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

run();
