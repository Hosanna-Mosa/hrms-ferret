import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const TasksSprint = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [sprint, setSprint] = useState({ sprint: 'Sprint 12', total_points: 23, completed_points: 18 });
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'

  // Create Task Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [storyPoints, setStoryPoints] = useState(3);
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const isManager = user?.role === 'Manager';

  const fetchTasksAndSprint = async () => {
    try {
      const endpoint = isManager ? '/api/tasks/manager/all' : '/api/tasks/me';
      const taskRes = await apiRequest(endpoint);
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData);
      }

      const sprintRes = await apiRequest('/api/tasks/sprints/current');
      if (sprintRes.ok) {
        const sprintData = await sprintRes.json();
        setSprint(sprintData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await apiRequest('/api/employees/admin/employees');
      if (res.ok) {
        const data = await res.json();
        // Direct reports of this manager
        const direct = data.filter(e => e.role_name === 'Employee' && e.manager_id && e.manager_id._id === user.employeeId);
        setReportsList(direct);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasksAndSprint();
      if (isManager) {
        fetchReports();
      }
    }
  }, [user]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const endpoint = isManager ? `/api/tasks/manager/${taskId}` : `/api/tasks/${taskId}`;
      const res = await apiRequest(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchTasksAndSprint();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: taskTitle,
          employee_id: assignedEmployeeId || undefined,
          story_points: storyPoints,
          priority: priority,
          due_date: dueDate || undefined,
          sprint: 'Sprint 12'
        })
      });
      if (res.ok) {
        fetchTasksAndSprint();
        setModalOpen(false);
        setTaskTitle('');
        setAssignedEmployeeId('');
        setStoryPoints(3);
        setPriority('medium');
        setDueDate('');
        alert('Task assigned successfully.');
      } else {
        const err = await res.json();
        alert(err.message || 'Task assignment failed.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const syncJira = async () => {
    try {
      const res = await apiRequest('/api/tasks/integrations/jira/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchTasksAndSprint();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(t => t.status.toLowerCase() === status.toLowerCase());
  };

  const sprintPct = sprint.total_points > 0 ? Math.round((sprint.completed_points / sprint.total_points) * 100) : 0;

  const columns = [
    { key: 'todo', label: 'TO DO' },
    { key: 'in progress', label: 'IN PROGRESS' },
    { key: 'review', label: 'REVIEW' },
    { key: 'done', label: 'DONE' }
  ];

  const getPriorityClass = (priority) => {
    if (priority.toLowerCase() === 'high') return 'high';
    if (priority.toLowerCase() === 'medium') return 'medium';
    return 'low';
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">{isManager ? 'TEAM sprint management' : 'DELIVERY'}</span>
          <h1>{isManager ? 'Team Tasks & Sprint' : 'Tasks & Sprint'}</h1>
          <p>
            {isManager 
              ? 'Assign sprint tasks, monitor status boards, check deadlines, and track SDE story points.'
              : 'Track Jira-style work items, story points, due dates, priority, and status.'
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isManager && (
            <button className="btn primary small" onClick={() => setModalOpen(true)}>
              + Assign Task
            </button>
          )}
          <button className="btn outline small" onClick={syncJira}>
            Sync Jira
          </button>
          <div className="segmented">
            <button className={viewMode === 'board' ? 'active' : ''} onClick={() => setViewMode('board')}>
              Board
            </button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
              List
            </button>
          </div>
        </div>
      </div>

      <div className="sprint-header panel">
        <div>
          <span>SPRINT 12</span>
          <h3>Employee Experience MVP</h3>
          <p>Jul 13 – Jul 26 · {sprint.completed_points} / {sprint.total_points} points completed</p>
        </div>
        <div className="sprint-progress">
          <strong>{sprintPct}%</strong>
          <div className="progress">
            <i style={{ width: `${sprintPct}%` }}></i>
          </div>
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="kanban">
          {columns.map(col => {
            const colTasks = getTasksByStatus(col.key);
            return (
              <div className="kanban-col" key={col.key}>
                <div className="kanban-title">
                  <span>{col.label}</span>
                  <b>{colTasks.length}</b>
                </div>
                {colTasks.map(t => (
                  <div className={`task-card ${col.key === 'done' ? 'done' : ''}`} key={t._id}>
                    <span className={`priority ${getPriorityClass(t.priority)}`}>
                      {t.priority.toUpperCase()}
                    </span>
                    <h4>{t.title}</h4>
                    <p>{t.external_key}</p>
                    <div style={{ marginBottom: '8px' }}>
                      <small style={{ fontWeight: 'bold' }}>{t.story_points} pts</small>
                      {t.due_date && <span> · Due {new Date(t.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                      {isManager && t.full_name && (
                        <div style={{ marginTop: '5px', fontSize: '8px', color: 'var(--muted)' }}>
                          👤 Assigned: <b>{t.full_name}</b>
                        </div>
                      )}
                    </div>
                    {/* Quick Transition Buttons */}
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {col.key !== 'todo' && (
                        <button 
                          className="btn outline small" 
                          style={{ padding: '2px 5px', fontSize: '8px' }}
                          onClick={() => handleStatusChange(t._id, col.key === 'in progress' ? 'todo' : col.key === 'review' ? 'in progress' : 'review')}
                        >
                          ◀
                        </button>
                      )}
                      {col.key !== 'done' && (
                        <button 
                          className="btn primary small" 
                          style={{ padding: '2px 5px', fontSize: '8px' }}
                          onClick={() => handleStatusChange(t._id, col.key === 'todo' ? 'in progress' : col.key === 'in progress' ? 'review' : 'done')}
                        >
                          ▶
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <article className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Title</th>
                  {isManager && <th>Assignee</th>}
                  <th>Points</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t._id}>
                    <td>{t.external_key}</td>
                    <td>{t.title}</td>
                    {isManager && <td><b>{t.full_name || 'Team SDE'}</b></td>}
                    <td>{t.story_points}</td>
                    <td>
                      <span className={`priority ${getPriorityClass(t.priority)}`}>
                        {t.priority.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <select 
                        value={t.status} 
                        onChange={(e) => handleStatusChange(t._id, e.target.value)}
                        style={{ padding: '4px', fontSize: '9px', width: 'auto', marginTop: 0 }}
                      >
                        <option value="todo">To Do</option>
                        <option value="in progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* Assign Task Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <h2>Assign Team Task</h2>
        <p>Create a sprint task and assign it to a reporting SDE.</p>
        <form onSubmit={handleCreateTask}>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ margin: 0 }}>
              Task Title
              <input
                type="text"
                required
                placeholder="Describe the task or ticket details"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </label>
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ margin: 0 }}>
              Assignee (Direct Report)
              <select
                required
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
              >
                <option value="">-- Choose SDE --</option>
                {reportsList.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.full_name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              Story Points
              <input
                type="number"
                min="1"
                max="13"
                value={storyPoints}
                onChange={(e) => setStoryPoints(parseInt(e.target.value))}
                required
              />
            </label>

            <label>
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label style={{ margin: 0 }}>
              Due Date
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
          </div>

          <button className="btn primary full" type="submit">
            Create & Assign Task
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default TasksSprint;
