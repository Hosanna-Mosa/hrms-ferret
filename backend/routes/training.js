const express = require('express');
const router = express.Router();
const CourseAssignment = require('../models/CourseAssignment');
const Course = require('../models/Course');
const auth = require('../middleware/auth');

// GET /api/training/me
router.get('/me', auth, async (req, res) => {
  try {
    const list = await CourseAssignment.find({ employee_id: req.user.employeeId })
      .populate('course_id')
      .exec();

    // Map to flat keys if necessary
    const response = list.map(item => ({
      ...item.toObject(),
      title: item.course_id ? item.course_id.title : 'Unknown Course',
      course_type: item.course_id ? item.course_id.course_type : 'Video',
      duration_minutes: item.course_id ? item.course_id.duration_minutes : 0,
      quiz_config: item.course_id ? item.course_id.quiz_config : {}
    }));

    res.json(response);
  } catch (error) {
    console.error('Error fetching course assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/training/:assignmentId/progress
router.patch('/:assignmentId/progress', auth, async (req, res) => {
  const assId = req.params.assignmentId;
  const { progress_percent } = req.body;

  try {
    const completedAt = progress_percent === 100 ? new Date() : null;

    const assignment = await CourseAssignment.findOneAndUpdate(
      { _id: assId, employee_id: req.user.employeeId },
      {
        $set: {
          progress_percent,
          completed_at: completedAt
        }
      },
      { new: true }
    ).exec();

    if (!assignment) {
      return res.status(404).json({ message: 'Course assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    console.error('Error updating course progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/training/:assignmentId/quiz
router.post('/:assignmentId/quiz', auth, async (req, res) => {
  const assId = req.params.assignmentId;
  const { score } = req.body;

  try {
    const isPass = score >= 80;
    const completedAt = isPass ? new Date() : null;
    const progress = isPass ? 100 : 90;

    const assignment = await CourseAssignment.findOneAndUpdate(
      { _id: assId, employee_id: req.user.employeeId },
      {
        $set: {
          progress_percent: progress,
          completed_at: completedAt
        }
      },
      { new: true }
    ).exec();

    if (!assignment) {
      return res.status(404).json({ message: 'Course assignment not found' });
    }

    res.json({ success: isPass, score, assignment });
  } catch (error) {
    console.error('Error submitting quiz answers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
