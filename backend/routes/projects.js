const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// GET /api/projects (List all projects)
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('lead_id', 'full_name employee_code work_email profile_pic')
      .exec();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects (Create a project - HR/Admin only)
router.post('/', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const { name, key, description, lead_id, github_repo } = req.body;

  if (!name || !key) {
    return res.status(400).json({ message: 'Project name and key are required' });
  }

  try {
    const existing = await Project.findOne({ key: key.toUpperCase() }).exec();
    if (existing) {
      return res.status(400).json({ message: 'Project key must be unique' });
    }

    const project = await Project.create({
      name,
      key: key.toUpperCase(),
      description,
      lead_id: lead_id || null,
      github_repo: github_repo || ''
    });

    const populated = await Project.findById(project._id)
      .populate('lead_id', 'full_name employee_code work_email profile_pic')
      .exec();

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/projects/:id (Delete a project - HR/Admin only)
router.delete('/:id', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await Project.findByIdAndDelete(req.params.id).exec();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
