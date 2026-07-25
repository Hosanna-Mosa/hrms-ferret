import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const TasksSprint = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [sprint, setSprint] = useState({ sprint: 'Sprint 12', total_points: 0, completed_points: 0 });
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'

  // Projects & Sprints integration states
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSprintId, setSelectedSprintId] = useState('');

  // Create Task Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [storyPoints, setStoryPoints] = useState(3);
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  // Task Details Modal States
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const handleOpenDetail = (task) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const isManager = user?.role === 'Manager';
  const canApproveToDone = user && ['Manager', 'HR', 'SuperAdmin'].includes(user.role);

  const fetchProjectsAndSprints = async () => {
    try {
      const res = await apiRequest('/api/projects');
      if (res.ok) {
        const projData = await res.json();
        setProjects(projData);
        if (projData.length > 0) {
          const firstProjId = projData[0]._id;
          setSelectedProjectId(firstProjId);

          const sprintRes = await apiRequest(`/api/sprints?project_id=${firstProjId}`);
          if (sprintRes.ok) {
            const sprintData = await sprintRes.json();
            setSprints(sprintData);
            const active = sprintData.find(s => s.status === 'active');
            if (active) {
              setSelectedSprintId(active._id);
            } else if (sprintData.length > 0) {
              setSelectedSprintId(sprintData[0]._id);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasksAndSprint = async () => {
    if (!selectedProjectId || !selectedSprintId) return;
    try {
      const endpoint = isManager 
        ? `/api/tasks/manager/all?project_id=${selectedProjectId}&sprint_id=${selectedSprintId}` 
        : `/api/tasks/me?project_id=${selectedProjectId}&sprint_id=${selectedSprintId}`;
      const taskRes = await apiRequest(endpoint);
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData);

        const activeSprint = sprints.find(s => s._id === selectedSprintId);
        if (activeSprint) {
          const totalPoints = taskData.reduce((acc, t) => acc + (t.story_points || 0), 0);
          const completedPoints = taskData.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.story_points || 0), 0);
          setSprint({
            sprint: activeSprint.name,
            total_points: totalPoints,
            completed_points: completedPoints
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProjectChange = async (projId) => {
    setSelectedProjectId(projId);
    setSelectedSprintId('');
    try {
      const sprintRes = await apiRequest(`/api/sprints?project_id=${projId}`);
      if (sprintRes.ok) {
        const sprintData = await sprintRes.json();
        setSprints(sprintData);
        const active = sprintData.find(s => s.status === 'active');
        if (active) {
          setSelectedSprintId(active._id);
        } else if (sprintData.length > 0) {
          setSelectedSprintId(sprintData[0]._id);
        }
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
        const direct = data.filter(e => e.role_name === 'Employee' && e.manager_id && (e.manager_id._id || e.manager_id) === user.employeeId);
        setReportsList(direct);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjectsAndSprints();
      if (isManager) {
        fetchReports();
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedProjectId && selectedSprintId) {
      fetchTasksAndSprint();
    }
  }, [selectedProjectId, selectedSprintId, sprints]);

  const handleStatusChange = async (taskId, newStatus) => {
    if (newStatus === 'done' && !canApproveToDone) {
      alert('Forbidden: Only managers can approve tasks to Done.');
      return;
    }
    try {
      const endpoint = isManager ? `/api/tasks/manager/${taskId}` : `/api/tasks/${taskId}`;
      const res = await apiRequest(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchTasksAndSprint();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update task status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedSprintId) {
      alert('Please select a project and sprint first.');
      return;
    }
    try {
      const res = await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          employee_id: assignedEmployeeId || undefined,
          story_points: storyPoints,
          priority: priority,
          due_date: dueDate || undefined,
          project_id: selectedProjectId,
          sprint_id: selectedSprintId,
          sprint: sprint.sprint
        })
      });
      if (res.ok) {
        fetchTasksAndSprint();
        setModalOpen(false);
        setTaskTitle('');
        setTaskDescription('');
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
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>Project:</span>
          <select value={selectedProjectId} onChange={(e) => handleProjectChange(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff', fontSize: '13px' }}>
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.name} ({p.key})</option>
            ))}
            {projects.length === 0 && <option value="">-- Create Project First --</option>}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>Sprint:</span>
          <select value={selectedSprintId} onChange={(e) => setSelectedSprintId(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff', fontSize: '13px' }}>
            {sprints.map(s => {
              const dueDateStr = s.end_date ? new Date(s.end_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';
              return (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.status}){dueDateStr ? ` - Due: ${dueDateStr}` : ''}
                </option>
              );
            })}
            {sprints.length === 0 && <option value="">-- Plan Sprint First --</option>}
          </select>
        </div>
      </div>
      <div className="page-head">
        <div>
          <span className="eyebrow">{isManager ? 'TEAM sprint management' : 'DELIVERY'}</span>
          <h1>{isManager ? 'Team Tasks & Sprint' : 'Tasks & Sprint'}</h1>
          <p>
            {isManager 
              ? 'Assign sprint tasks, monitor status boards, check deadlines, and track SDE story points.'
              : 'Track sprint work items, story points, due dates, priority, and status.'
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isManager && (
            <button className="btn primary small" onClick={() => setModalOpen(true)}>
              + Assign Task
            </button>
          )}
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
          <span>{sprint.sprint?.toUpperCase() || 'SPRINT'}</span>
          <h3>{projects.find(p => p._id === selectedProjectId)?.name || 'Project Sprint'}</h3>
          <p>
            {(() => {
              const active = sprints.find(s => s._id === selectedSprintId);
              if (!active) return 'No dates';
              const startStr = active.start_date ? new Date(active.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
              const endStr = active.end_date ? new Date(active.end_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';
              return `${startStr} – ${endStr}`;
            })()} · {sprint.completed_points} / {sprint.total_points} points completed
          </p>
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
                  <div 
                    className={`task-card ${col.key === 'done' ? 'done' : ''}`} 
                    key={t._id}
                    onClick={() => handleOpenDetail(t)}
                    style={{ cursor: 'pointer' }}
                  >
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
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                      {col.key !== 'todo' && (
                        <button 
                          className="btn outline small" 
                          style={{ padding: '2px 5px', fontSize: '8px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(t._id, col.key === 'in progress' ? 'todo' : col.key === 'review' ? 'in progress' : 'review');
                          }}
                        >
                          ◀
                        </button>
                      )}
                      {col.key !== 'done' && !(col.key === 'review' && !canApproveToDone) && (
                        <button 
                          className="btn primary small" 
                          style={{ padding: '2px 5px', fontSize: '8px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(t._id, col.key === 'todo' ? 'in progress' : col.key === 'in progress' ? 'review' : 'done');
                          }}
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
                  <tr 
                    key={t._id}
                    onClick={() => handleOpenDetail(t)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view details"
                  >
                    <td>{t.external_key}</td>
                    <td>{t.title}</td>
                    {isManager && <td><b>{t.full_name || 'Team SDE'}</b></td>}
                    <td>{t.story_points}</td>
                    <td>
                      <span className={`priority ${getPriorityClass(t.priority)}`}>
                        {t.priority.toUpperCase()}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select 
                        value={t.status} 
                        onChange={(e) => handleStatusChange(t._id, e.target.value)}
                        style={{ padding: '4px', fontSize: '9px', width: 'auto', marginTop: 0 }}
                      >
                        <option value="todo">To Do</option>
                        <option value="in progress">In Progress</option>
                        <option value="review">Review</option>
                        {(canApproveToDone || t.status === 'done') && <option value="done">Done</option>}
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
              Description
              <textarea
                placeholder="Enter detailed description of the task"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows="3"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff', fontSize: '13px', marginTop: '5px' }}
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
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn outline small"
                style={{ padding: '4px 8px', fontSize: '10px', minWidth: 'auto', height: 'auto', lineHeight: 'normal' }}
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setDueDate(d.toISOString().slice(0, 10));
                }}
              >
                Tomorrow (+1d)
              </button>
              <button
                type="button"
                className="btn outline small"
                style={{ padding: '4px 8px', fontSize: '10px', minWidth: 'auto', height: 'auto', lineHeight: 'normal' }}
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 2);
                  setDueDate(d.toISOString().slice(0, 10));
                }}
              >
                In 2 Days (+2d)
              </button>
            </div>
          </div>

          <button className="btn primary full" type="submit">
            Create & Assign Task
          </button>
        </form>
      </Modal>

      {/* View Task Details Modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)}>
        {selectedTask && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--muted)' }}>
                {selectedTask.external_key} · {sprint.sprint}
              </span>
              <span className={`priority ${getPriorityClass(selectedTask.priority)}`}>
                {selectedTask.priority.toUpperCase()}
              </span>
            </div>
            
            <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>{selectedTask.title}</h2>
            
            <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Description</h4>
              <p style={{ fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                {selectedTask.description || 'No description provided.'}
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px', fontSize: '12px' }}>
              <div>
                <strong style={{ color: 'var(--muted)' }}>Assignee:</strong>
                <span style={{ marginLeft: '5px', fontWeight: 'bold' }}>{selectedTask.full_name || (isManager ? 'Team SDE' : user?.name)}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--muted)' }}>Story Points:</strong>
                <span style={{ marginLeft: '5px', fontWeight: 'bold' }}>{selectedTask.story_points} pts</span>
              </div>
              <div>
                <strong style={{ color: 'var(--muted)' }}>Status:</strong>
                <span className={`pill success`} style={{ marginLeft: '5px', textTransform: 'uppercase', fontSize: '8px', verticalAlign: 'middle' }}>
                  {selectedTask.status}
                </span>
              </div>
              <div>
                <strong style={{ color: 'var(--muted)' }}>Due Date:</strong>
                <span style={{ marginLeft: '5px', fontWeight: 'bold' }}>
                  {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--line)', paddingTop: '15px' }}>
              <button className="btn outline" onClick={() => setDetailModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TasksSprint;
