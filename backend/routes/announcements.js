const express = require('express');
const router = Router = express.Router();
const Announcement = require('../models/Announcement');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// GET /api/announcements
router.get('/', auth, async (req, res) => {
  try {
    const list = await Announcement.find({})
      .sort({ published_at: -1 })
      .exec();

    const response = [];
    for (const a of list) {
      const emp = await Employee.findOne({ user_id: a.published_by }).exec();
      response.push({
        ...a.toObject(),
        author_name: emp ? emp.full_name : 'HR'
      });
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/announcements
router.post('/admin', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const { category, title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ message: 'Title and body are required' });
  }

  try {
    const newAnn = await Announcement.create({
      category: category || 'General',
      title,
      body,
      published_by: req.user.userId
    });

    res.status(201).json(newAnn);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/announcements/:id
router.delete('/admin/:id', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const annId = req.params.id;
  try {
    const deleted = await Announcement.findByIdAndDelete(annId).exec();

    if (!deleted) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
