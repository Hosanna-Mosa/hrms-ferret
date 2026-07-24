const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// GET /api/tasks/me (Get own tasks)
router.get('/me', auth, async (req, res) => {
  const { project_id, sprint_id } = req.query;
  const query = { employee_id: req.user.employeeId };
  if (project_id) query.project_id = project_id;
  if (sprint_id) query.sprint_id = sprint_id;

  try {
    const tasks = await Task.find(query)
      .sort({ due_date: 1 })
      .exec();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching own tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/tasks (Create a task, internal)
router.post('/', auth, async (req, res) => {
  const { title, sprint, due_date, story_points, status, priority, employee_id, project_id, sprint_id } = req.body;
  try {
    const count = await Task.countDocuments({});
    const key = `FER-${100 + count + 1}`;

    const assignedEmpId = (req.user.role === 'Manager' || req.user.role === 'HR' || req.user.role === 'SuperAdmin') && employee_id 
      ? employee_id 
      : req.user.employeeId;

    const newTask = await Task.create({
      external_key: key,
      employee_id: assignedEmpId,
      title,
      sprint: sprint || 'Sprint 12',
      project_id: project_id || null,
      sprint_id: sprint_id || null,
      due_date: due_date ? new Date(due_date) : null,
      story_points: story_points || 3,
      status: status || 'todo',
      priority: priority || 'medium',
      external_source: 'internal'
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/tasks/:id (Update task status or properties)
router.patch('/:id', auth, async (req, res) => {
  const taskId = req.params.id;
  const { status, title, priority, story_points, due_date } = req.body;
  if (status === 'done') {
    return res.status(403).json({ message: 'Forbidden: Only managers can approve tasks to Done' });
  }

  try {
    const updated = await Task.findOneAndUpdate(
      { _id: taskId, employee_id: req.user.employeeId },
      {
        $set: {
          status,
          title,
          priority,
          story_points,
          due_date: due_date ? new Date(due_date) : undefined
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Task not found or not authorized' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/integrations/jira/sync (Jira sync stub)
router.post('/integrations/jira/sync', auth, (req, res) => {
  res.json({ message: 'Sprint task boards successfully synchronized with Jira Cloud API.' });
});

// GET /api/sprints/current
router.get('/sprints/current', auth, async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $match: { sprint: 'Sprint 12' } },
      {
        $group: {
          _id: '$sprint',
          total_points: { $sum: '$story_points' },
          completed_points: {
            $sum: {
              $cond: [{ $eq: ['$status', 'done'] }, '$story_points', 0]
            }
          }
        }
      }
    ]);

    if (stats.length > 0) {
      res.json({
        sprint: stats[0]._id,
        total_points: stats[0].total_points,
        completed_points: stats[0].completed_points
      });
    } else {
      res.json({ sprint: 'Sprint 12', total_points: 0, completed_points: 0 });
    }
  } catch (error) {
    console.error('Error getting current sprint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tasks/manager/all (List reportees' tasks)
router.get('/manager/all', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  const { project_id, sprint_id } = req.query;
  try {
    const query = {};
    if (project_id) query.project_id = project_id;
    if (sprint_id) query.sprint_id = sprint_id;

    if (req.user.role === 'Manager') {
      const Employee = require('../models/Employee');
      const reports = await Employee.find({ manager_id: req.user.employeeId }).select('_id').exec();
      const reportIds = reports.map(r => r._id);
      query.employee_id = { $in: reportIds };
    }
    const tasks = await Task.find(query)
      .populate('employee_id')
      .sort({ due_date: 1 })
      .exec();
      
    const response = tasks.map(t => ({
      ...t.toObject(),
      full_name: t.employee_id ? t.employee_id.full_name : 'Unknown'
    }));
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching manager reportee tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/tasks/manager/:id (Manager updating status/details of a reportee's task)
router.patch('/manager/:id', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  const taskId = req.params.id;
  const { status, title, priority, story_points, due_date } = req.body;
  try {
    if (req.user.role === 'Manager') {
      const Employee = require('../models/Employee');
      const taskObj = await Task.findById(taskId).populate('employee_id').exec();
      if (!taskObj || !taskObj.employee_id || taskObj.employee_id.manager_id.toString() !== req.user.employeeId.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }
    }
    
    const updated = await Task.findByIdAndUpdate(
      taskId,
      {
        $set: {
          status,
          title,
          priority,
          story_points,
          due_date: due_date ? new Date(due_date) : undefined
        }
      },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    console.error('Error updating reportee task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tasks/employee/:employeeId
router.get('/employee/:employeeId', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  try {
    if (req.user.role === 'Manager') {
      const Employee = require('../models/Employee');
      const emp = await Employee.findById(req.params.employeeId).exec();
      if (!emp || emp.manager_id.toString() !== req.user.employeeId.toString()) {
        return res.status(403).json({ message: 'Access denied: Not your reportee' });
      }
    }
    const list = await Task.find({ employee_id: req.params.employeeId })
      .sort({ due_date: 1 })
      .exec();
    res.json(list);
  } catch (error) {
    console.error('Error fetching employee tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
