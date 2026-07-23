const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  review_period: {
    type: String
  },
  attendance_score: {
    type: Number,
    default: 0
  },
  sprint_score: {
    type: Number,
    default: 0
  },
  task_score: {
    type: Number,
    default: 0
  },
  learning_score: {
    type: Number,
    default: 0
  },
  manager_rating: {
    type: Number,
    default: 0
  },
  manager_feedback: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Performance', PerformanceSchema);
