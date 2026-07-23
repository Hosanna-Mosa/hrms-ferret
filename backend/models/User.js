const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  work_email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true
  },
  password_hash: {
    type: String
  },
  google_subject: {
    type: String
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  two_factor_enabled: {
    type: Boolean,
    default: false
  },
  last_login_at: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
