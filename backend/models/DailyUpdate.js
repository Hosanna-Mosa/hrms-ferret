const mongoose = require('mongoose');

const DailyUpdateSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  work_date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  todays_tasks: {
    type: String
  },
  completed: {
    type: String
  },
  in_progress: {
    type: String
  },
  blocked: {
    type: String
  },
  tomorrow_plan: {
    type: String
  },
  hours_worked: {
    type: Number,
    default: 8
  },
  manager_status: {
    type: String,
    default: 'pending'
  },
  manager_comment: {
    type: String
  }
}, { timestamps: true });

DailyUpdateSchema.index({ employee_id: 1, work_date: 1 }, { unique: true });

module.exports = mongoose.model('DailyUpdate', DailyUpdateSchema);
