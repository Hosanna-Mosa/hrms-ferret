const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actor_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true
  },
  entity_type: {
    type: String
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip_address: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
