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
router.post('/admin', auth, role(['HR', 'SuperAdmin', 'Manager']), async (req, res) => {
  const { category, title, body, published_at } = req.body;

  if (!title || !body) {
    return res.status(400).json({ message: 'Title and body are required' });
  }

  try {
    const newAnn = await Announcement.create({
      category: category || 'General',
      title,
      body,
      published_by: req.user.userId,
      published_at: published_at || Date.now()
    });

    // Resolve author name
    const author = await Employee.findOne({ user_id: req.user.userId }).exec();
    const authorName = author ? author.full_name : 'HR / Management';

    // Find recipients
    let recipients = [];
    const { sendMail } = require('../services/emailService');

    if (req.user.role === 'Manager') {
      // Notify only reportees of this manager
      const reports = await Employee.find({ manager_id: req.user.employeeId }).populate('user_id').exec();
      recipients = reports.map(emp => emp.user_id?.work_email).filter(Boolean);
    } else {
      // Notify all active employees (HR/SuperAdmin)
      const allActive = await Employee.find({ employment_status: 'active' }).populate('user_id').exec();
      recipients = allActive.map(emp => emp.user_id?.work_email).filter(Boolean);
    }

    if (recipients.length > 0) {
      try {
        for (const email of recipients) {
          await sendMail({
            to: email,
            subject: `New Announcement: ${title}`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; border: 1px solid #e1e3e6; padding: 24px; border-radius: 12px;">
                <span style="font-size: 10px; font-weight: bold; color: #e42335; text-transform: uppercase; letter-spacing: 0.05em;">${category || 'General'}</span>
                <h3 style="color: #12141a; margin-top: 5px; margin-bottom: 12px;">${title}</h3>
                <p style="white-space: pre-line; color: #4c515a;">${body}</p>
                <hr style="border: 0; border-top: 1px solid #e1e3e6; margin: 20px 0;" />
                <div style="font-size: 11px; color: #707683;">
                  Published by: <strong>${authorName}</strong> on ${new Date(published_at || Date.now()).toLocaleDateString()}
                </div>
              </div>
            `
          });
        }
      } catch (mailErr) {
        console.error('Failed to dispatch announcement emails:', mailErr);
      }
    }

    res.status(201).json(newAnn);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/announcements/:id
router.delete('/admin/:id', auth, role(['HR', 'SuperAdmin', 'Manager']), async (req, res) => {
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
