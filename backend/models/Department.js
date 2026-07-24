const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  manager_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  parent_department_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Department', DepartmentSchema);
