const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Role = require('../models/Role');
const User = require('../models/User');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// GET /api/admin/dashboard
router.get('/dashboard', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const totalEmployees = await Employee.countDocuments({});
    const activeEmployees = await Employee.countDocuments({ employment_status: 'active' });
    const onboardingEmployees = await Employee.countDocuments({ employment_status: 'onboarding' });
    const presentToday = await Attendance.countDocuments({ work_date: today });
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

    res.json({
      totalEmployees,
      activeEmployees,
      onboardingEmployees,
      presentToday,
      pendingLeaves
    });
  } catch (error) {
    console.error('Error fetching admin dashboard metrics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/payroll/export
router.get('/payroll/export', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  try {
    const employees = await Employee.find({}).exec();

    let csv = 'Employee Code,Full Name,Department,Designation,Days Present,Hours Worked\n';

    for (const emp of employees) {
      const logs = await Attendance.find({
        employee_id: emp._id,
        work_date: new RegExp('^' + currentMonth)
      }).exec();

      const daysPresent = logs.length;
      const totalMinutes = logs.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0);
      const hoursWorked = Math.round(totalMinutes / 60);

      csv += `"${emp.employee_code}","${emp.full_name}","${emp.department}","${emp.designation}",${daysPresent},${hoursWorked}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=payroll_export.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting payroll CSV:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/roles
router.get('/roles', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  try {
    const roles = await Role.find({}).exec();
    const response = [];

    for (const r of roles) {
      const userCount = await User.countDocuments({ role_id: r._id });
      // Map permissions map to object
      const permissionsObj = {};
      if (r.permissions instanceof Map) {
        r.permissions.forEach((val, key) => {
          permissionsObj[key] = val;
        });
      } else {
        Object.assign(permissionsObj, r.permissions);
      }

      response.push({
        _id: r._id,
        name: r.name,
        permissions: permissionsObj,
        user_count: userCount
      });
    }

    res.json(response);
  } catch (error) {
    console.error('Error listing roles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
