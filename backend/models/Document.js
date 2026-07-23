const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  document_type: {
    type: String
  },
  storage_key: {
    type: String,
    required: true
  },
  file_name: {
    type: String,
    required: true
  },
  mime_type: {
    type: String
  },
  verification_status: {
    type: String,
    default: 'pending'
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);
