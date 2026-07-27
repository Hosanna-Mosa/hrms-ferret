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
  const { title, description, sprint, due_date, story_points, status, priority, employee_id, project_id, sprint_id } = req.body;
  try {
    const count = await Task.countDocuments({});
    let key = `FER-${100 + count + 1}`;
    if (project_id) {
      const Project = require('../models/Project');
      const proj = await Project.findById(project_id).exec();
      if (proj && proj.key) {
        const projTaskCount = await Task.countDocuments({ project_id });
        key = `${proj.key}-${100 + projTaskCount + 1}`;
      }
    }

    let assignedEmpId = null;
    if (req.user.role === 'Manager' || req.user.role === 'HR' || req.user.role === 'SuperAdmin') {
      assignedEmpId = employee_id || null;
    } else {
      assignedEmpId = req.user.employeeId;
    }

    const newTask = await Task.create({
      external_key: key,
      employee_id: assignedEmpId,
      title,
      description,
      sprint: sprint || 'Sprint 12',
      project_id: project_id || null,
      sprint_id: sprint_id || null,
      due_date: due_date ? new Date(due_date) : null,
      story_points: story_points || 3,
      status: status || 'todo',
      priority: priority || 'medium',
      external_source: 'internal'
    });

    // Fetch details to send email
    const Employee = require('../models/Employee');
    const employee = assignedEmpId ? await Employee.findById(assignedEmpId).populate('user_id').exec() : null;
    const manager = await Employee.findById(req.user.employeeId).populate('user_id').exec();
    if (employee && employee.user_id && employee.user_id.work_email && req.user.employeeId !== assignedEmpId?.toString()) {
      const { sendMail } = require('../services/emailService');
      try {
        await sendMail({
          to: employee.user_id.work_email,
          subject: `New Task Assigned: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; border: 1px solid #e1e3e6; padding: 24px; border-radius: 12px;">
              <h3 style="color: #e42335; margin-top: 0;">Hello, ${employee.full_name}</h3>
              <p>A new task has been assigned to you by <strong>${manager?.full_name || 'Manager'}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Task Key:</td>
                  <td><code>${key}</code></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Title:</td>
                  <td><strong>${title}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Priority:</td>
                  <td><span style="text-transform: uppercase; font-size: 10px; font-weight: bold;">${priority || 'medium'}</span></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Story Points:</td>
                  <td>${story_points || 3} SP</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Due Date:</td>
                  <td>${due_date ? new Date(due_date).toLocaleDateString() : 'No due date'}</td>
                </tr>
              </table>
              <hr style="border: 0; border-top: 1px solid #e1e3e6; margin: 20px 0;" />
              <small style="color: #707683;">Ferret PeopleOS Notifications</small>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('Failed to send task assignment email:', mailErr);
      }
    }

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/tasks/:id (Update task status or properties)
router.patch('/:id', auth, async (req, res) => {
  const taskId = req.params.id;
  const { status, title, description, priority, story_points, due_date } = req.body;
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
          description,
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
      const Project = require('../models/Project');
      const Employee = require('../models/Employee');
      
      let isProjectLead = false;
      if (project_id) {
        const proj = await Project.findById(project_id).exec();
        if (proj && proj.lead_id && proj.lead_id.toString() === req.user.employeeId.toString()) {
          isProjectLead = true;
        }
      }

      if (!isProjectLead) {
        const reports = await Employee.find({ manager_id: req.user.employeeId }).select('_id').exec();
        const reportIds = reports.map(r => r._id);
        query.$or = [
          { employee_id: { $in: reportIds } },
          { employee_id: req.user.employeeId },
          { employee_id: null }
        ];
      }
    }
    const tasks = await Task.find(query)
      .populate('employee_id')
      .sort({ due_date: 1 })
      .exec();
      
    const response = tasks.map(t => ({
      ...t.toObject(),
      full_name: t.employee_id ? t.employee_id.full_name : 'Unassigned'
    }));
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching manager reportee tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/tasks/manager/:id (Manager updating status/details/assignee of a task)
router.patch('/manager/:id', auth, role(['HR', 'Manager', 'SuperAdmin']), async (req, res) => {
  const taskId = req.params.id;
  const { status, title, description, priority, story_points, due_date, employee_id } = req.body;
  try {
    const taskObj = await Task.findById(taskId).exec();
    if (!taskObj) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (req.user.role === 'Manager') {
      const Project = require('../models/Project');
      const Employee = require('../models/Employee');

      // 1. Check if user is the project lead of the task's project
      let isAuthorized = false;
      if (taskObj.project_id) {
        const proj = await Project.findById(taskObj.project_id).exec();
        if (proj && proj.lead_id && proj.lead_id.toString() === req.user.employeeId.toString()) {
          isAuthorized = true;
        }
      }

      // 2. Otherwise, check if the task is currently assigned to a reportee,
      // or if we are assigning it to a reportee
      if (!isAuthorized) {
        const reports = await Employee.find({ manager_id: req.user.employeeId }).select('_id').exec();
        const reportIds = reports.map(r => r._id.toString());
        
        const currentAssigneeId = taskObj.employee_id ? taskObj.employee_id.toString() : null;
        const targetAssigneeId = employee_id || null;

        const isCurrentReportee = currentAssigneeId && reportIds.includes(currentAssigneeId);
        const isTargetReportee = targetAssigneeId && reportIds.includes(targetAssigneeId);

        // A manager is authorized if the task is currently assigned to their reportee, 
        // OR they are assigning an unassigned task to one of their reportees.
        if (isCurrentReportee || (currentAssigneeId === null && isTargetReportee)) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to update or assign this task' });
      }
    }

    const updateFields = {
      status,
      title,
      description,
      priority,
      story_points,
      due_date: due_date ? new Date(due_date) : undefined
    };

    if (employee_id !== undefined) {
      updateFields.employee_id = employee_id || null;
    }

    const cleanUpdateFields = {};
    for (const key in updateFields) {
      if (updateFields[key] !== undefined) {
        cleanUpdateFields[key] = updateFields[key];
      }
    }

    const updated = await Task.findByIdAndUpdate(
      taskId,
      { $set: cleanUpdateFields },
      { new: true }
    );

    // Fetch details to send email
    const Employee = require('../models/Employee');
    const employee = updated.employee_id ? await Employee.findById(updated.employee_id).populate('user_id').exec() : null;
    const manager = await Employee.findById(req.user.employeeId).populate('user_id').exec();
    if (employee && employee.user_id && employee.user_id.work_email && req.user.employeeId !== employee._id.toString()) {
      const { sendMail } = require('../services/emailService');
      try {
        await sendMail({
          to: employee.user_id.work_email,
          subject: `Task Assigned/Updated: ${updated.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; border: 1px solid #e1e3e6; padding: 24px; border-radius: 12px;">
              <h3 style="color: #12141a; margin-top: 0;">Hello, ${employee.full_name}</h3>
              <p>You have been assigned or updated on a task by <strong>${manager?.full_name || 'Manager'}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Task Key:</td>
                  <td><code>${updated.external_key}</code></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Title:</td>
                  <td><strong>${updated.title}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                  <td><strong style="color: #2e65d4; text-transform: uppercase;">${updated.status}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Priority:</td>
                  <td><span style="text-transform: uppercase; font-size: 10px; font-weight: bold;">${updated.priority}</span></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Story Points:</td>
                  <td>${updated.story_points} SP</td>
                </tr>
              </table>
              <hr style="border: 0; border-top: 1px solid #e1e3e6; margin: 20px 0;" />
              <small style="color: #707683;">Ferret PeopleOS Notifications</small>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('Failed to send task update email:', mailErr);
      }
    }

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
