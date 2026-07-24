const express = require('express');
const router = express.Router();
const Offboarding = require('../models/Offboarding');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');

// POST /api/offboarding (Initiate offboarding/resignation)
router.post('/', auth, async (req, res) => {
  const { last_working_date, reason, comments } = req.body;

  if (!last_working_date) {
    return res.status(400).json({ message: 'Last working date is required' });
  }

  try {
    const existing = await Offboarding.findOne({ employee_id: req.user.employeeId }).exec();
    if (existing) {
      return res.status(400).json({ message: 'Offboarding already initiated' });
    }

    const newOffboard = await Offboarding.create({
      employee_id: req.user.employeeId,
      last_working_date: new Date(last_working_date),
      reason,
      comments,
      status: 'submitted',
      checklist: {
        'Knowledge transfer completed': false,
        'Company assets returned': false,
        'System access revoked': false,
        'Manager clearance': false,
        'HR exit interview': false,
        'Final settlement processed': false,
        'Experience letter issued': false
      }
    });

    // Send Email Notifications
    try {
      const { getNotificationRecipients, sendMail } = require('../services/emailService');
      const emp = await Employee.findById(req.user.employeeId).exec();
      const recipients = await getNotificationRecipients(req.user.employeeId);

      if (recipients.length > 0) {
        const subject = `Resignation & Offboarding Initiated - ${emp.full_name}`;
        const htmlContent = `
          <h3>Resignation & Offboarding Notice</h3>
          <p><strong>Employee:</strong> ${emp.full_name} (${emp.employee_code})</p>
          <p><strong>Proposed Last Working Date:</strong> ${new Date(last_working_date).toLocaleDateString()}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Comments:</strong> ${comments || 'No comments provided.'}</p>
          <hr/>
          <p>Please log in to the portal to manage clearance and checklist steps.</p>
        `;
        await sendMail({
          to: recipients.join(','),
          subject,
          html: htmlContent
        });
      }
    } catch (err) {
      console.error('Failed to send offboarding notification email:', err);
    }

    res.status(201).json(newOffboard);
  } catch (error) {
    console.error('Error initiating offboarding:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/offboarding/me (Get own offboarding request)
router.get('/me', auth, async (req, res) => {
  try {
    const record = await Offboarding.findOne({ employee_id: req.user.employeeId }).exec();
    res.json(record);
  } catch (error) {
    console.error('Error fetching offboarding:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
