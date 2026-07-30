const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const { autoClockOut } = require('../services/autoClockOutService');

const getKolkataDateString = (date = new Date()) => {
  const kolkataTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const year = kolkataTime.getFullYear();
  const monthStr = String(kolkataTime.getMonth() + 1).padStart(2, '0');
  const dayStr = String(kolkataTime.getDate()).padStart(2, '0');
  return { dateString: `${year}-${monthStr}-${dayStr}`, localTime: kolkataTime };
};

// POST /api/attendance/check-in
router.post('/check-in', auth, async (req, res) => {
  const { work_mode, location_data } = req.body;
  
  try {
    await autoClockOut();

    const { dateString: today, localTime: kolkataTime } = getKolkataDateString();
    const currentHour = kolkataTime.getHours();
    const currentMinute = kolkataTime.getMinutes();

    if (currentHour < 9) {
      return res.status(400).json({ message: 'Clock-in is not allowed before 9:00 AM.' });
    }

    let status = 'present';
    if (currentHour > 9 || (currentHour === 9 && currentMinute > 30)) {
      status = 'late';
    }

    const now = new Date();

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
  try {
    await autoClockOut();

    const { dateString: today } = getKolkataDateString();
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
  try {
    await autoClockOut();

    const { dateString: today } = getKolkataDateString();
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
  try {
    await autoClockOut();

    const { dateString: today } = getKolkataDateString();
    const now = new Date();
    
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
    await autoClockOut();
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
  try {
    await autoClockOut();
    const { dateString: today } = getKolkataDateString();
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


// GET /api/attendance/admin/export
router.get('/admin/export', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    await autoClockOut();
    const Employee = require('../models/Employee');
    const Leave = require('../models/Leave');

    const employees = await Employee.find({}).exec();

    // Calculate days of the month
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const dates = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      dates.push(`${month}-${dayStr}`);
    }

    const escapeCSV = (val) => {
      if (val === undefined || val === null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build headers
    let csvHeaders = ['Employee Code', 'Full Name', 'Department', 'Designation'];
    dates.forEach(d => {
      csvHeaders.push(d);
    });
    csvHeaders.push('Total Late in Month', 'Total Leaves in Month', 'Total Paid Leaves', 'Total Unpaid Leaves');

    let csvContent = csvHeaders.map(escapeCSV).join(',') + '\n';

    const getLocalDateString = (d) => {
      const y = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const dStr = String(d.getDate()).padStart(2, '0');
      return `${y}-${mStr}-${dStr}`;
    };

    for (const emp of employees) {
      // Get attendance logs
      const logs = await Attendance.find({
        employee_id: emp._id,
        work_date: new RegExp('^' + month)
      }).exec();

      const attendanceByDate = {};
      logs.forEach(l => {
        attendanceByDate[l.work_date] = l;
      });

      // Get approved leaves that overlap with the month
      const monthStart = new Date(`${month}-01T00:00:00.000Z`);
      const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);
      
      const leaves = await Leave.find({
        employee_id: emp._id,
        status: 'approved',
        start_date: { $lte: monthEnd },
        end_date: { $gte: monthStart }
      }).exec();

      const leaveDates = new Set();
      const paidLeaveDates = new Set();
      const unpaidLeaveDates = new Set();
      const leaveTypesByDate = {};

      leaves.forEach(lv => {
        let curr = new Date(lv.start_date);
        const end = new Date(lv.end_date);
        while (curr <= end) {
          const dateString = getLocalDateString(curr);
          if (dateString.startsWith(month)) {
            leaveDates.add(dateString);
            leaveTypesByDate[dateString] = lv.leave_type;
            if (lv.leave_type === 'Unpaid Leave') {
              unpaidLeaveDates.add(dateString);
            } else {
              paidLeaveDates.add(dateString);
            }
          }
          curr.setDate(curr.getDate() + 1);
        }
      });

      // Fill in daily status
      const row = [emp.employee_code, emp.full_name, emp.department, emp.designation];
      let lateCount = 0;

      dates.forEach(d => {
        if (attendanceByDate[d]) {
          const log = attendanceByDate[d];
          if (log.status === 'late') {
            row.push('Late');
            lateCount++;
          } else if (log.work_mode === 'wfh' || log.work_mode === 'remote') {
            row.push('WFH');
          } else {
            row.push('Present');
          }
        } else if (leaveDates.has(d)) {
          row.push(`Leave (${leaveTypesByDate[d] || 'Approved'})`);
        } else {
          const dayOfWeek = new Date(d).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          if (isWeekend) {
            row.push('Weekend');
          } else {
            row.push('Absent');
          }
        }
      });

      row.push(lateCount);
      row.push(leaveDates.size);
      row.push(paidLeaveDates.size);
      row.push(unpaidLeaveDates.size);

      csvContent += row.map(escapeCSV).join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${month}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting attendance CSV:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/employee/:employeeId
router.get('/employee/:employeeId', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    if (req.user.role === 'Manager') {
      const Employee = require('../models/Employee');
      const emp = await Employee.findById(req.params.employeeId).exec();
      if (!emp || emp.manager_id.toString() !== req.user.employeeId.toString()) {
        return res.status(403).json({ message: 'Access denied: Not your reportee' });
      }
    }
    const history = await Attendance.find({ employee_id: req.params.employeeId })
      .sort({ work_date: -1 })
      .exec();
    res.json(history);
  } catch (error) {
    console.error('Error fetching employee attendance logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
