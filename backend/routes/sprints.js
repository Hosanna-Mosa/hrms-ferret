const express = require('express');
const router = express.Router();
const Sprint = require('../models/Sprint');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// GET /api/sprints (List sprints, optionally filtered by project_id)
router.get('/', auth, async (req, res) => {
  const { project_id } = req.query;
  const filter = {};
  if (project_id) {
    filter.project_id = project_id;
  }

  try {
    const sprints = await Sprint.find(filter)
      .populate('project_id', 'name key')
      .sort({ start_date: -1 })
      .exec();
    res.json(sprints);
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sprints (Create a sprint - Managers/HR/SuperAdmin only)
router.post('/', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  const { project_id, name, start_date, end_date, discussion_output } = req.body;

  if (!project_id || !name || !start_date || !end_date) {
    return res.status(400).json({ message: 'Project ID, sprint name, start date, and end date are required' });
  }

  try {
    const sprint = await Sprint.create({
      project_id,
      name,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      status: 'planned',
      discussion_output
    });

    const populated = await Sprint.findById(sprint._id)
      .populate('project_id', 'name key')
      .exec();

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/sprints/:id (Update sprint status / details - Managers/HR/SuperAdmin only)
router.patch('/:id', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  const { status, name, start_date, end_date, discussion_output } = req.body;

  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    // If status is being set to active, ensure all other sprints in the same project are completed or planned
    if (status === 'active') {
      await Sprint.updateMany(
        { project_id: sprint.project_id, status: 'active' },
        { status: 'completed' }
      ).exec();
    }

    if (status) sprint.status = status;
    if (name) sprint.name = name;
    if (start_date) sprint.start_date = new Date(start_date);
    if (end_date) sprint.end_date = new Date(end_date);
    if (discussion_output !== undefined) sprint.discussion_output = discussion_output;

    await sprint.save();

    const populated = await Sprint.findById(sprint._id)
      .populate('project_id', 'name key')
      .exec();

    res.json(populated);
  } catch (error) {
    console.error('Error updating sprint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
