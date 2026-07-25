const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// GET /api/meetings/me - Get logged-in employee's meetings
router.get('/me', auth, async (req, res) => {
  try {
    const meetings = await Meeting.find({ employee_id: req.user.employeeId })
      .populate('manager_id', 'full_name designation')
      .sort({ meeting_date: 1, start_time: 1 })
      .exec();
    res.json(meetings);
  } catch (error) {
    console.error('Error fetching my meetings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/meetings/employee/:employeeId - Get meetings scheduled for a specific employee
router.get('/employee/:employeeId', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const meetings = await Meeting.find({ employee_id: req.params.employeeId })
      .populate('manager_id', 'full_name designation')
      .sort({ meeting_date: 1, start_time: 1 })
      .exec();
    res.json(meetings);
  } catch (error) {
    console.error('Error fetching employee meetings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/meetings/employee/:employeeId - Schedule a meeting for an employee
router.post('/employee/:employeeId', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  const { title, description, meeting_date, start_time, end_time } = req.body;
  
  if (!title || !meeting_date || !start_time) {
    return res.status(400).json({ message: 'Title, Date, and Start Time are required fields.' });
  }

  try {
    const meeting = await Meeting.create({
      employee_id: req.params.employeeId,
      manager_id: req.user.employeeId, // The manager/admin booking the meeting
      title,
      description,
      meeting_date,
      start_time,
      end_time
    });

    // Fetch employee and manager details to send email
    const employee = await Employee.findById(req.params.employeeId).populate('user_id').exec();
    const manager = await Employee.findById(req.user.employeeId).populate('user_id').exec();
    if (employee && employee.user_id && employee.user_id.work_email) {
      const { sendMail } = require('../services/emailService');
      try {
        await sendMail({
          to: employee.user_id.work_email,
          subject: `New Meeting Scheduled: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; border: 1px solid #e1e3e6; padding: 24px; border-radius: 12px;">
              <h3 style="color: #2e65d4; margin-top: 0;">Hello, ${employee.full_name}</h3>
              <p>Your manager, <strong>${manager?.full_name || 'Manager'}</strong>, has scheduled a new meeting for you.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 100px;">Title:</td>
                  <td><strong>${title}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                  <td>${new Date(meeting_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Time:</td>
                  <td>${start_time} - ${end_time || '--:--'}</td>
                </tr>
                ${description ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Agenda:</td>
                  <td>${description}</td>
                </tr>
                ` : ''}
              </table>
              <p>This meeting has been synced to your Monthly Attendance Calendar.</p>
              <hr style="border: 0; border-top: 1px solid #e1e3e6; margin: 20px 0;" />
              <small style="color: #707683;">Ferret PeopleOS Notifications</small>
            </div>
          `
        });
      } catch (mailError) {
        console.error('Failed to send meeting scheduler email:', mailError);
      }
    }

    res.status(201).json(meeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
