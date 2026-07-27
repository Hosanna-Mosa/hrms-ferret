const mongoose = require('mongoose');

const SprintSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
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
  status: {
    type: String,
    enum: ['planned', 'active', 'completed'],
    default: 'planned'
  },
  discussion_output: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Sprint', SprintSchema);
