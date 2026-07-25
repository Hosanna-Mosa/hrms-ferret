const express = require('express');
const router = express.Router();
const Performance = require('../models/Performance');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// GET /api/performance/me
router.get('/me', auth, async (req, res) => {
  try {
    const reviews = await Performance.find({ employee_id: req.user.employeeId })
      .sort({ review_period: -1 })
      .exec();
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching performance reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/performance/all (HR/SuperAdmin company-wide review list)
router.get('/all', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  try {
    const reviews = await Performance.find({})
      .populate('employee_id')
      .sort({ review_period: -1 })
      .exec();
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching all performance reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/manager/performance/:employeeId (Post review)
router.post('/manager/:employeeId', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  const empId = req.params.employeeId;
  const { review_period, attendance_score, sprint_score, task_score, learning_score, manager_rating, manager_feedback } = req.body;

  try {
    const review = await Performance.create({
      employee_id: empId,
      review_period: review_period || 'Q3 2026',
      attendance_score: attendance_score || 95,
      sprint_score: sprint_score || 90,
      task_score: task_score || 92,
      learning_score: learning_score || 70,
      manager_rating: manager_rating || 4.5,
      manager_feedback
    });

    // Fetch employee and manager details to send email
    const Employee = require('../models/Employee');
    const employee = await Employee.findById(empId).populate('user_id').exec();
    const manager = await Employee.findById(req.user.employeeId).populate('user_id').exec();
    if (employee && employee.user_id && employee.user_id.work_email) {
      const { sendMail } = require('../services/emailService');
      try {
        await sendMail({
          to: employee.user_id.work_email,
          subject: `Performance Review Published: ${review_period || 'Q3 2026'}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; border: 1px solid #e1e3e6; padding: 24px; border-radius: 12px;">
              <h3 style="color: #e42335; margin-top: 0;">Hello, ${employee.full_name}</h3>
              <p>Your performance review for <strong>${review_period || 'Q3 2026'}</strong> has been published by <strong>${manager?.full_name || 'Manager'}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 150px;">Rating:</td>
                  <td><strong style="color: #e42335; font-size: 16px;">${manager_rating || 4.5} / 5.0</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Attendance Score:</td>
                  <td>${attendance_score || 95}%</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Sprint Score:</td>
                  <td>${sprint_score || 90}%</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Task Score:</td>
                  <td>${task_score || 92}%</td>
                </tr>
                ${manager_feedback ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Manager Feedback:</td>
                  <td><em>"${manager_feedback}"</em></td>
                </tr>
                ` : ''}
              </table>
              <p>You can view full details of your Q2/Q3 key achievements inside your Performance Dashboard in the portal.</p>
              <hr style="border: 0; border-top: 1px solid #e1e3e6; margin: 20px 0;" />
              <small style="color: #707683;">Ferret PeopleOS Notifications</small>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('Failed to send performance review notification email:', mailErr);
      }
    }

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating performance review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
