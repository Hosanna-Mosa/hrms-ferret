const mongoose = require('mongoose');

const BreakSchema = new mongoose.Schema({
  started_at: {
    type: Date,
    required: true
  },
  ended_at: {
    type: Date
  }
});

const AttendanceSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  work_date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  check_in_at: {
    type: Date
  },
  check_out_at: {
    type: Date
  },
  work_mode: {
    type: String,
    default: 'remote'
  },
  location_data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    default: 'present'
  },
  total_work_minutes: {
    type: Number,
    default: 0
  },
  total_break_minutes: {
    type: Number,
    default: 0
  },
  breaks: [BreakSchema]
}, { timestamps: true });

// Ensure unique index for employee and work date
AttendanceSchema.index({ employee_id: 1, work_date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
