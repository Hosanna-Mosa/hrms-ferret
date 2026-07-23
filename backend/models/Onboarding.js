const mongoose = require('mongoose');

const OnboardingSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  item_key: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'pending'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  verified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verified_at: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Onboarding', OnboardingSchema);
