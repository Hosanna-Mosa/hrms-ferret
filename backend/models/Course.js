const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  course_type: {
    type: String
  },
  content_url: {
    type: String
  },
  duration_minutes: {
    type: Number,
    default: 0
  },
  quiz_config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);
