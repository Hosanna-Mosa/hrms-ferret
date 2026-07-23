const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// POST /api/leave (Apply Leave)
router.post('/', auth, async (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;

  if (!leave_type || !start_date || !end_date) {
    return res.status(400).json({ message: 'Leave type, start date, and end date are required' });
  }

  try {
    const newLeave = await Leave.create({
      employee_id: req.user.employeeId,
      leave_type,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      reason,
      status: 'pending'
    });

    res.status(201).json(newLeave);
  } catch (error) {
    console.error('Error applying for leave:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/leave/me (Get own leaves)
router.get('/me', auth, async (req, res) => {
  try {
    const leaves = await Leave.find({ employee_id: req.user.employeeId })
      .sort({ start_date: -1 })
      .exec();
    res.json(leaves);
  } catch (error) {
    console.error('Error fetching own leaves:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/leave/:id (Cancel pending leave)
router.delete('/:id', auth, async (req, res) => {
  const leaveId = req.params.id;
  try {
    const leave = await Leave.findOne({ _id: leaveId, employee_id: req.user.employeeId }).exec();

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending leave requests can be cancelled' });
    }

    await Leave.findByIdAndDelete(leaveId);
    res.json({ message: 'Leave request cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling leave:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/manager/leave (List leaves for approval)
router.get('/manager/all', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const query = {};

    if (req.user.role === 'Manager') {
      // Find reports of this manager
      const reports = await Employee.find({ manager_id: req.user.employeeId }).select('_id').exec();
      const reportIds = reports.map(r => r._id);
      query.employee_id = { $in: reportIds };
    }

    const leaves = await Leave.find(query)
      .populate('employee_id')
      .sort({ start_date: -1 })
      .exec();

    // Map keys to match table
    const response = leaves.map(l => ({
      ...l.toObject(),
      full_name: l.employee_id ? l.employee_id.full_name : 'Unknown',
      employee_code: l.employee_id ? l.employee_id.employee_code : 'Unknown',
      department: l.employee_id ? l.employee_id.department : 'Unknown'
    }));

    res.json(response);
  } catch (error) {
    console.error('Error fetching leaves for approvals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/manager/leave/:id (Resolve leave request)
router.patch('/manager/:id', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  const leaveId = req.params.id;
  const { status } = req.body; // 'approved' or 'rejected'

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status update' });
  }

  try {
    const leave = await Leave.findById(leaveId).populate('employee_id').exec();
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // If manager, check if employee belongs to them
    if (req.user.role === 'Manager') {
      if (leave.employee_id.manager_id.toString() !== req.user.employeeId.toString()) {
        return res.status(403).json({ message: 'Not authorized to approve this leave request' });
      }
    }

    leave.status = status;
    leave.approver_id = req.user.employeeId;
    leave.decision_at = new Date();
    await leave.save();

    res.json(leave);
  } catch (error) {
    console.error('Error resolving leave request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
