const express = require('express');
const router = express.Router();
const DailyUpdate = require('../models/DailyUpdate');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// POST /api/daily-updates
router.post('/', auth, async (req, res) => {
  const { work_date, todays_tasks, completed, in_progress, blocked, tomorrow_plan, hours_worked } = req.body;
  const date = work_date || new Date().toISOString().slice(0, 10);

  try {
    const log = await DailyUpdate.findOneAndUpdate(
      { employee_id: req.user.employeeId, work_date: date },
      {
        $set: {
          todays_tasks,
          completed,
          in_progress,
          blocked,
          tomorrow_plan,
          hours_worked: hours_worked || 8,
          manager_status: 'pending'
        }
      },
      { upsert: true, new: true }
    );

    res.status(201).json(log);
  } catch (error) {
    console.error('Error submitting daily update:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/daily-updates/me
router.get('/me', auth, async (req, res) => {
  try {
    const list = await DailyUpdate.find({ employee_id: req.user.employeeId })
      .sort({ work_date: -1 })
      .exec();
    res.json(list);
  } catch (error) {
    console.error('Error fetching own daily updates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/manager/daily-updates
router.get('/manager/all', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const query = {};

    if (req.user.role === 'Manager') {
      const reports = await Employee.find({ manager_id: req.user.employeeId }).select('_id').exec();
      const reportIds = reports.map(r => r._id);
      query.employee_id = { $in: reportIds };
    }

    const list = await DailyUpdate.find(query)
      .populate('employee_id')
      .sort({ work_date: -1 })
      .exec();

    const response = list.map(d => ({
      ...d.toObject(),
      full_name: d.employee_id ? d.employee_id.full_name : 'Unknown',
      employee_code: d.employee_id ? d.employee_id.employee_code : 'Unknown',
      department: d.employee_id ? d.employee_id.department : 'Unknown'
    }));

    res.json(response);
  } catch (error) {
    console.error('Error fetching daily updates for manager:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/manager/daily-updates/:id
router.patch('/manager/:id', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  const updateId = req.params.id;
  const { manager_status, manager_comment } = req.body;

  try {
    const manager = await Employee.findById(req.user.employeeId).exec();
    const managerName = manager ? manager.full_name : 'Manager';

    const log = await DailyUpdate.findById(updateId).exec();
    if (!log) {
      return res.status(404).json({ message: 'Daily update record not found' });
    }

    log.manager_status = manager_status;
    if (manager_comment) {
      log.manager_comment = manager_comment;
      log.comments.push({
        author_name: managerName,
        author_role: req.user.role,
        text: manager_comment,
        created_at: new Date()
      });
    }

    await log.save();
    res.json(log);
  } catch (error) {
    console.error('Error resolving daily update:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/daily-updates/:id/acknowledge
router.patch('/:id/acknowledge', auth, async (req, res) => {
  const updateId = req.params.id;
  const { employee_comment } = req.body;

  try {
    const emp = await Employee.findById(req.user.employeeId).exec();
    const empName = emp ? emp.full_name : 'Employee';

    const log = await DailyUpdate.findOne({ _id: updateId, employee_id: req.user.employeeId }).exec();
    if (!log) {
      return res.status(404).json({ message: 'Daily update record not found or not authorized' });
    }

    log.employee_comment = employee_comment;
    log.manager_status = 'pending';
    log.comments.push({
      author_name: empName,
      author_role: req.user.role,
      text: employee_comment,
      created_at: new Date()
    });

    await log.save();
    res.json(log);
  } catch (error) {
    console.error('Error acknowledging daily update:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// GET /api/daily-updates/employee/:employeeId
router.get('/employee/:employeeId', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    if (req.user.role === 'Manager') {
      const Employee = require('../models/Employee');
      const emp = await Employee.findById(req.params.employeeId).exec();
      if (!emp || emp.manager_id.toString() !== req.user.employeeId.toString()) {
        return res.status(403).json({ message: 'Access denied: Not your reportee' });
      }
    }
    const list = await DailyUpdate.find({ employee_id: req.params.employeeId })
      .sort({ work_date: -1 })
      .exec();
    res.json(list);
  } catch (error) {
    console.error('Error fetching employee daily updates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
