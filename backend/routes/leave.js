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

    // Send Email Notifications
    try {
      const { getNotificationRecipients, sendMail } = require('../services/emailService');
      const emp = await Employee.findById(req.user.employeeId).exec();
      const recipients = await getNotificationRecipients(req.user.employeeId);

      if (recipients.length > 0) {
        const subject = `Leave Request Submitted - ${emp.full_name}`;
        const htmlContent = `
          <h3>New Leave Request</h3>
          <p><strong>Employee:</strong> ${emp.full_name} (${emp.employee_code})</p>
          <p><strong>Leave Type:</strong> ${leave_type}</p>
          <p><strong>Duration:</strong> ${new Date(start_date).toLocaleDateString()} to ${new Date(end_date).toLocaleDateString()}</p>
          <p><strong>Reason:</strong> ${reason || 'No reason provided.'}</p>
          <hr/>
          <p>Please log in to the portal to review and approve/reject this request.</p>
        `;
        await sendMail({
          to: recipients.join(','),
          subject,
          html: htmlContent
        });
      }
    } catch (err) {
      console.error('Failed to send leave notification email:', err);
    }

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

    // Fetch details to send email
    const employee = await Employee.findById(leave.employee_id).populate('user_id').exec();
    const manager = await Employee.findById(req.user.employeeId).populate('user_id').exec();
    if (employee && employee.user_id && employee.user_id.work_email) {
      const { sendMail } = require('../services/emailService');
      try {
        await sendMail({
          to: employee.user_id.work_email,
          subject: `Leave Request Update: ${status.toUpperCase()}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; border: 1px solid #e1e3e6; padding: 24px; border-radius: 12px;">
              <h3 style="color: ${status === 'approved' ? '#14885d' : '#e42335'}; margin-top: 0;">Hello, ${employee.full_name}</h3>
              <p>Your leave request has been reviewed and <strong>${status}</strong> by <strong>${manager?.full_name || 'Manager'}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Leave Type:</td>
                  <td style="text-transform: capitalize;">${leave.leave_type}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Date Range:</td>
                  <td>${new Date(leave.start_date).toLocaleDateString()} to ${new Date(leave.end_date).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Total Days:</td>
                  <td>${leave.total_days} day(s)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                  <td><strong style="color: ${status === 'approved' ? '#14885d' : '#e42335'}; text-transform: uppercase;">${status}</strong></td>
                </tr>
              </table>
              <hr style="border: 0; border-top: 1px solid #e1e3e6; margin: 20px 0;" />
              <small style="color: #707683;">Ferret PeopleOS Notifications</small>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('Failed to send leave decision notification email:', mailErr);
      }
    }

    res.json(leave);
  } catch (error) {
    console.error('Error resolving leave request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/leave/employee/:employeeId
router.get('/employee/:employeeId', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    if (req.user.role === 'Manager') {
      const emp = await Employee.findById(req.params.employeeId).exec();
      if (!emp || emp.manager_id.toString() !== req.user.employeeId.toString()) {
        return res.status(403).json({ message: 'Access denied: Not your reportee' });
      }
    }
    const list = await Leave.find({ employee_id: req.params.employeeId })
      .sort({ start_date: -1 })
      .exec();
    res.json(list);
  } catch (error) {
    console.error('Error fetching employee leaves:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
