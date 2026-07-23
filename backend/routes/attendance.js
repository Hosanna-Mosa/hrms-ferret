const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// POST /api/attendance/check-in
router.post('/check-in', auth, async (req, res) => {
  const { work_mode, location_data } = req.body;
  const today = new Date().toISOString().slice(0, 10);
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  let status = 'present';
  
  if (currentHour > 9 || (currentHour === 9 && currentMinute > 15)) {
    status = 'late';
  }

  try {
    // MongoDB findOneAndUpdate with upsert
    const attendance = await Attendance.findOneAndUpdate(
      { employee_id: req.user.employeeId, work_date: today },
      {
        $setOnInsert: {
          employee_id: req.user.employeeId,
          work_date: today,
          check_in_at: now,
          work_mode: work_mode || 'remote',
          location_data: location_data || {},
          status: status,
          breaks: []
        }
      },
      { upsert: true, new: true }
    );

    res.json(attendance);
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/break/start
router.post('/break/start', auth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const attendance = await Attendance.findOne({ employee_id: req.user.employeeId, work_date: today }).exec();

    if (!attendance) {
      return res.status(400).json({ message: 'No active attendance session for today' });
    }

    // Push new break item
    attendance.breaks.push({ started_at: new Date() });
    await attendance.save();

    res.json(attendance);
  } catch (error) {
    console.error('Error starting break:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/break/end
router.post('/break/end', auth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const attendance = await Attendance.findOne({ employee_id: req.user.employeeId, work_date: today }).exec();

    if (!attendance) {
      return res.status(400).json({ message: 'No active attendance session for today' });
    }

    // Find active break (last item where ended_at is empty)
    const activeBreak = attendance.breaks.find(b => !b.ended_at);
    if (!activeBreak) {
      return res.status(400).json({ message: 'No active break found' });
    }

    const now = new Date();
    activeBreak.ended_at = now;
    
    // Calculate elapsed minutes
    const breakMinutes = Math.round((now - new Date(activeBreak.started_at)) / 60000);
    attendance.total_break_minutes += breakMinutes;

    await attendance.save();
    res.json(attendance);
  } catch (error) {
    console.error('Error ending break:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/check-out
router.post('/check-out', auth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  
  try {
    const attendance = await Attendance.findOne({ employee_id: req.user.employeeId, work_date: today }).exec();

    if (!attendance) {
      return res.status(400).json({ message: 'No check-in record for today' });
    }

    // If there is an active break, close it
    const activeBreak = attendance.breaks.find(b => !b.ended_at);
    if (activeBreak) {
      activeBreak.ended_at = now;
      const breakMinutes = Math.round((now - new Date(activeBreak.started_at)) / 60000);
      attendance.total_break_minutes += breakMinutes;
    }

    attendance.check_out_at = now;
    
    // Calculate total worked minutes
    const checkInTime = new Date(attendance.check_in_at).getTime();
    const checkOutTime = now.getTime();
    const totalMinutes = Math.round((checkOutTime - checkInTime) / 60000);
    attendance.total_work_minutes = Math.max(0, totalMinutes);

    await attendance.save();
    res.json(attendance);
  } catch (error) {
    console.error('Error during check-out:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/me
router.get('/me', auth, async (req, res) => {
  const { month } = req.query; // Format: YYYY-MM
  try {
    const query = { employee_id: req.user.employeeId };
    
    if (month) {
      // Find where work_date starts with month format
      query.work_date = new RegExp('^' + month);
    }

    const history = await Attendance.find(query)
      .sort({ work_date: -1 })
      .exec();

    res.json(history);
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/attendance/report (Today's check-ins across organization)
router.get('/admin/attendance/report', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const reports = await Attendance.find({ work_date: today })
      .populate('employee_id')
      .exec();

    const response = reports.map(r => ({
      ...r.toObject(),
      full_name: r.employee_id ? r.employee_id.full_name : 'Unknown',
      employee_code: r.employee_id ? r.employee_id.employee_code : 'Unknown',
      department: r.employee_id ? r.employee_id.department : 'Unknown'
    }));

    res.json(response);
  } catch (error) {
    console.error('Error fetching organization attendance report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Corrections stub
router.post('/corrections', auth, async (req, res) => {
  res.json({ message: 'Attendance correction request submitted to manager.', id: 'corr_123' });
});

router.patch('/admin/attendance/corrections/:id', auth, role(['HR', 'Manager', 'SuperAdmin']), (req, res) => {
  res.json({ message: 'Attendance correction request resolved.', status: 'approved' });
});

module.exports = router;
