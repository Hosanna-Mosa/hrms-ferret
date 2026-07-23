const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  leave_type: {
    type: String,
    required: true
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  reason: {
    type: String
  },
  status: {
    type: String,
    default: 'pending'
  },
  approver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  decision_at: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Leave', LeaveSchema);
