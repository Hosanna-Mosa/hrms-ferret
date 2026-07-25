const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const User = require('../models/User');
const Role = require('../models/Role');
const Onboarding = require('../models/Onboarding');
const Course = require('../models/Course');
const CourseAssignment = require('../models/CourseAssignment');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const argon2 = require('argon2');

// GET /api/employees/me
router.get('/me', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.employeeId)
      .populate({
        path: 'user_id',
        populate: { path: 'role_id' }
      })
      .populate('manager_id')
      .exec();

    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    // Adapt response keys to match frontend expectations
    const responseData = {
      ...employee.toObject(),
      work_email: employee.user_id.work_email,
      role_name: employee.user_id.role_id ? employee.user_id.role_id.name : 'Employee',
      manager_name: employee.manager_id ? employee.manager_id.full_name : ''
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching own profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/employees/me
router.patch('/me', auth, async (req, res) => {
  const { phone, emergency_contact, date_of_birth, address, profile_data } = req.body;
  try {
    const updated = await Employee.findByIdAndUpdate(
      req.user.employeeId,
      {
        $set: {
          phone,
          emergency_contact,
          date_of_birth,
          address,
          profile_data
        }
      },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating own profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/employees
router.get('/admin/employees', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const employees = await Employee.find({})
      .populate({
        path: 'user_id',
        populate: { path: 'role_id' }
      })
      .populate('manager_id')
      .exec();

    const response = employees.map(emp => ({
      ...emp.toObject(),
      work_email: emp.user_id ? emp.user_id.work_email : '',
      is_active: emp.user_id ? emp.user_id.is_active : false,
      role_name: emp.user_id && emp.user_id.role_id ? emp.user_id.role_id.name : 'Employee',
      manager_name: emp.manager_id ? emp.manager_id.full_name : ''
    }));

    res.json(response);
  } catch (error) {
    console.error('Error listing employees:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/employees
router.post('/admin/employees', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const { full_name, work_email, department, roleName, joining_date, manager_id, designation } = req.body;

  if (!full_name || !work_email || !department || !roleName || !joining_date) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user exists
    const userCheck = await User.findOne({ work_email: work_email.toLowerCase() }).exec();
    if (userCheck) {
      return res.status(400).json({ message: 'Work email already exists' });
    }

    // Get Role ID
    const targetRole = await Role.findOne({ name: roleName || 'Employee' }).exec();
    if (!targetRole) {
      return res.status(400).json({ message: 'Role does not exist' });
    }

    // Create User
    const passwordHash = await argon2.hash('password123');
    const newUser = await User.create({
      work_email: work_email.toLowerCase(),
      password_hash: passwordHash,
      role_id: targetRole._id,
      is_active: true
    });

    // Generate Employee Code
    const count = await Employee.countDocuments({});
    const employeeCode = `FER-2026-${String(count + 1).padStart(3, '0')}`;

    // Create Employee
    const newEmployee = await Employee.create({
      user_id: newUser._id,
      employee_code: employeeCode,
      full_name,
      department,
      designation: designation || 'Software Development Engineer',
      manager_id: manager_id || null,
      joining_date: new Date(joining_date),
      employment_status: 'onboarding'
    });

    // Seed onboarding checklist items
    const categories = ['personal', 'documents', 'bank', 'agreements', 'policies'];
    for (const cat of categories) {
      await Onboarding.create({
        employee_id: newEmployee._id,
        category: cat,
        item_key: `${cat}_details`,
        status: 'pending'
      });
    }

    // Auto-assign existing training courses to the new employee (at 0% progress)
    const coursesList = await Course.find({}).exec();
    for (const c of coursesList) {
      await CourseAssignment.create({
        course_id: c._id,
        employee_id: newEmployee._id,
        progress_percent: 0
      });
    }

    // Send onboarding welcome email to new employee/manager
    const { sendMail } = require('../services/emailService');
    try {
      await sendMail({
        to: work_email.toLowerCase(),
        subject: `Welcome to Ferret Technologies - Account Activated`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; border: 1px solid #e1e3e6; padding: 24px; border-radius: 12px;">
            <h2 style="color: #e42335; margin-top: 0;">Welcome, ${full_name}!</h2>
            <p>Your Ferret PeopleOS profile has been created successfully.</p>
            <p>Here are your secure temporary credentials to log into the portal:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 100px;">Portal URL:</td>
                <td><a href="http://localhost:5173" style="color: #e42335;">http://localhost:5173</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Work Email:</td>
                <td><code>${work_email.toLowerCase()}</code></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Password:</td>
                <td><code>password123</code></td>
              </tr>
            </table>
            <p style="color: #707683; font-size: 11px;">Please change your password immediately upon your first sign in.</p>
            <hr style="border: 0; border-top: 1px solid #e1e3e6; margin: 20px 0;" />
            <small style="color: #707683;">Ferret Operations & HR Administration Team</small>
          </div>
        `
      });

      // If assigned a manager, notify the manager
      if (manager_id) {
        const mgr = await Employee.findById(manager_id).populate('user_id').exec();
        if (mgr && mgr.user_id && mgr.user_id.work_email) {
          await sendMail({
            to: mgr.user_id.work_email,
            subject: `New Direct Report Assigned: ${full_name}`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; border: 1px solid #e1e3e6; padding: 24px; border-radius: 12px;">
                <h3 style="color: #12141a; margin-top: 0;">Hello, ${mgr.full_name}</h3>
                <p>A new employee, <strong>${full_name}</strong>, has been onboarded and assigned to report to you as their manager.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Employee Code:</td>
                    <td><code>${employeeCode}</code></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Designation:</td>
                    <td>${designation || 'Software Development Engineer'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Joining Date:</td>
                    <td>${new Date(joining_date).toLocaleDateString()}</td>
                  </tr>
                </table>
                <p>You can manage their sprints, review task updates, and schedule meetings directly from your Team Dashboard.</p>
                <hr style="border: 0; border-top: 1px solid #e1e3e6; margin: 20px 0;" />
                <small style="color: #707683;">Ferret PeopleOS notifications</small>
              </div>
            `
          });
        }
      }
    } catch (mailError) {
      console.error('Failed to send onboarding welcome/manager emails:', mailError);
    }

    res.status(201).json({
      ...newEmployee.toObject(),
      work_email,
      role_name: roleName,
      is_active: true
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/employees/:id
router.patch('/admin/employees/:id', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const employeeId = req.params.id;
  const { full_name, department, designation, employment_status, work_mode } = req.body;

  try {
    const updated = await Employee.findByIdAndUpdate(
      employeeId,
      {
        $set: {
          full_name,
          department,
          designation,
          employment_status,
          work_mode
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/employees/:id/deactivate
router.post('/admin/employees/:id/deactivate', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const employeeId = req.params.id;
  try {
    const emp = await Employee.findById(employeeId).exec();
    if (!emp) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const user = await User.findById(emp.user_id).exec();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.is_active = !user.is_active;
    await user.save();

    res.json({ message: 'Employee status toggled', is_active: user.is_active });
  } catch (error) {
    console.error('Error deactivating employee:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/employees/:id
router.get('/:id', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate({
        path: 'user_id',
        populate: { path: 'role_id' }
      })
      .populate('manager_id')
      .exec();

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (req.user.role === 'Manager' && employee.manager_id) {
      const mId = employee.manager_id._id || employee.manager_id;
      if (mId.toString() !== req.user.employeeId.toString()) {
        return res.status(403).json({ message: 'Access denied: Not your reportee' });
      }
    }

    const responseData = {
      ...employee.toObject(),
      work_email: employee.user_id ? employee.user_id.work_email : '',
      role_name: employee.user_id && employee.user_id.role_id ? employee.user_id.role_id.name : 'Employee',
      manager_name: employee.manager_id ? employee.manager_id.full_name : ''
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching employee detail:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
