const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  external_key: {
    type: String
  },
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  title: {
    type: String,
    required: true
  },
  sprint: {
    type: String
  },
  due_date: {
    type: Date
  },
  story_points: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: 'todo'
  },
  priority: {
    type: String,
    default: 'medium'
  },
  external_source: {
    type: String,
    default: 'internal'
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
