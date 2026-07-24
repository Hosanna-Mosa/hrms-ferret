const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// GET /api/departments (List all departments)
router.get('/', auth, async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('manager_id', 'full_name employee_code work_email')
      .populate('parent_department_id', 'name code')
      .exec();
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/departments (Create a department - HR/Admin only)
router.post('/', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const { name, code, manager_id, parent_department_id } = req.body;

  if (!name || !code) {
    return res.status(400).json({ message: 'Department name and code are required' });
  }

  try {
    const existing = await Department.findOne({ code: code.toUpperCase() }).exec();
    if (existing) {
      return res.status(400).json({ message: 'Department code must be unique' });
    }

    const dept = await Department.create({
      name,
      code: code.toUpperCase(),
      manager_id: manager_id || null,
      parent_department_id: parent_department_id || null
    });

    const populated = await Department.findById(dept._id)
      .populate('manager_id', 'full_name employee_code work_email')
      .populate('parent_department_id', 'name code')
      .exec();

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/departments/:id (Update a department - HR/Admin only)
router.put('/:id', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  const { name, code, manager_id, parent_department_id } = req.body;

  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (code && code.toUpperCase() !== dept.code) {
      const existing = await Department.findOne({ code: code.toUpperCase() }).exec();
      if (existing) {
        return res.status(400).json({ message: 'Department code must be unique' });
      }
      dept.code = code.toUpperCase();
    }

    if (name) dept.name = name;
    dept.manager_id = manager_id || null;
    dept.parent_department_id = parent_department_id || null;

    await dept.save();

    const populated = await Department.findById(dept._id)
      .populate('manager_id', 'full_name employee_code work_email')
      .populate('parent_department_id', 'name code')
      .exec();

    res.json(populated);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/departments/:id (Delete a department - HR/Admin only)
router.delete('/:id', auth, role(['HR', 'SuperAdmin']), async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if other departments report to this one
    const children = await Department.findOne({ parent_department_id: dept._id }).exec();
    if (children) {
      return res.status(400).json({ message: 'Cannot delete department with child sub-departments reporting to it' });
    }

    await Department.findByIdAndDelete(req.params.id).exec();
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
