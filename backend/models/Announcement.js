const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  category: {
    type: String
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  published_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  published_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
