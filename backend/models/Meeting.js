const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  manager_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  meeting_date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  start_time: {
    type: String, // HH:MM
    required: true
  },
  end_time: {
    type: String // HH:MM
  }
}, { timestamps: true });

MeetingSchema.index({ employee_id: 1, meeting_date: 1 });

module.exports = mongoose.model('Meeting', MeetingSchema);
