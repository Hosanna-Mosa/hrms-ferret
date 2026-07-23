const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    required: true
  },
  employee_code: {
    type: String,
    unique: true,
    required: true
  },
  full_name: {
    type: String,
    required: true
  },
  personal_email: {
    type: String
  },
  phone: {
    type: String
  },
  date_of_birth: {
    type: Date
  },
  address: {
    type: String
  },
  emergency_contact: {
    name: String,
    relationship: String,
    phone: String
  },
  department: {
    type: String
  },
  designation: {
    type: String
  },
  manager_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  joining_date: {
    type: Date
  },
  employment_status: {
    type: String,
    default: 'onboarding'
  },
  work_mode: {
    type: String,
    default: 'remote'
  },
  profile_data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
