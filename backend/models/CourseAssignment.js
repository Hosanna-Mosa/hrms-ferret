const mongoose = require('mongoose');

const CourseAssignmentSchema = new mongoose.Schema({
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  progress_percent: {
    type: Number,
    default: 0
  },
  completed_at: {
    type: Date
  },
  certificate_storage_key: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('CourseAssignment', CourseAssignmentSchema);
