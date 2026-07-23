const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Onboarding = require('../models/Onboarding');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer local storage
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Basic MIME validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// GET /api/documents/me (List own documents)
router.get('/me', auth, async (req, res) => {
  try {
    const docs = await Document.find({ employee_id: req.user.employeeId })
      .sort({ uploaded_at: -1 })
      .exec();
    res.json(docs);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/documents/upload
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const { document_type } = req.body;
  try {
    const newDoc = await Document.create({
      employee_id: req.user.employeeId,
      document_type: document_type || 'Uncategorized',
      storage_key: req.file.filename,
      file_name: req.file.originalname,
      mime_type: req.file.mimetype,
      verification_status: 'pending'
    });

    // Also update onboarding progress items if applicable
    if (document_type) {
      await Onboarding.findOneAndUpdate(
        { employee_id: req.user.employeeId, category: 'documents' },
        {
          $set: {
            status: 'pending',
            data: { file_name: req.file.originalname }
          }
        }
      ).exec();
    }

    res.status(201).json(newDoc);
  } catch (error) {
    console.error('Error saving document details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/documents/:id/download (Serves the uploaded file)
router.get('/:id/download', auth, async (req, res) => {
  const docId = req.params.id;
  try {
    const doc = await Document.findById(docId).exec();

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check auth permission
    if (req.user.role !== 'HR Admin' && doc.employee_id.toString() !== req.user.employeeId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = path.join(uploadDir, doc.storage_key);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Physical file not found on disk' });
    }

    res.download(filePath, doc.file_name);
  } catch (error) {
    console.error('Error fetching document download:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/documents/:id/verify (Verify document)
router.patch('/admin/documents/:id/verify', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const docId = req.params.id;
  const { status } = req.body; // 'verified' or 'rejected'

  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid verification status' });
  }

  try {
    const updated = await Document.findByIdAndUpdate(
      docId,
      { $set: { verification_status: status } },
      { new: true }
    ).exec();

    if (!updated) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/documents/pending (HR review dashboard list)
router.get('/admin/pending', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  try {
    const docs = await Document.find({ verification_status: 'pending' })
      .populate('employee_id')
      .sort({ uploaded_at: 1 })
      .exec();

    const response = docs.map(d => ({
      ...d.toObject(),
      full_name: d.employee_id ? d.employee_id.full_name : 'Unknown',
      employee_code: d.employee_id ? d.employee_id.employee_code : 'Unknown'
    }));

    res.json(response);
  } catch (error) {
    console.error('Error listing pending documents:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
