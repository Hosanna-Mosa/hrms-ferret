const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  lead_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  github_repo: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
