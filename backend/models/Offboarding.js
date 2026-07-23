const mongoose = require('mongoose');

const OffboardingSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  last_working_date: {
    type: Date,
    required: true
  },
  reason: {
    type: String
  },
  comments: {
    type: String
  },
  status: {
    type: String,
    default: 'submitted'
  },
  checklist: {
    type: Map,
    of: Boolean,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Offboarding', OffboardingSchema);
