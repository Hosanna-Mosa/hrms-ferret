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

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating performance review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
