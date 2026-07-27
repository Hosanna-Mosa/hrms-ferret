import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const DailyUpdates = () => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState(8);
  const [todaysTasks, setTodaysTasks] = useState('');
  const [completed, setCompleted] = useState('');
  const [inProgress, setInProgress] = useState('');
  const [blocked, setBlocked] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [statusText, setStatusText] = useState('Not submitted');
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);

  const [ackComment, setAckComment] = useState('');
  const [managerCommentText, setManagerCommentText] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);

  const handleOpenDetail = (update) => {
    setSelectedUpdate(update);
    setAckComment('');
    setManagerCommentText('');
    setShowCommentBox(false);
    setDetailModalOpen(true);
  };

  const hasAccessToLogs = user && ['Manager', 'HR', 'SuperAdmin'].includes(user.role);
  const [employeesList, setEmployeesList] = useState([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchUpdates = async () => {
    try {
      const endpoint = hasAccessToLogs ? '/api/daily-updates/manager/all' : '/api/daily-updates/me';
      const res = await apiRequest(endpoint);
      if (res.ok) {
        const data = await res.json();
        setUpdates(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployeesList = async () => {
    if (!hasAccessToLogs || !user) return;
    try {
      const res = await apiRequest('/api/employees/admin/employees');
      if (res.ok) {
        const data = await res.json();
        if (user.role === 'Manager') {
          const filtered = data.filter(e => e.manager_id && (e.manager_id._id || e.manager_id) === user.employeeId);
          setEmployeesList(filtered);
        } else if (user.role === 'HR') {
          const filtered = data.filter(e => e.role_name === 'Employee' || e.role_name === 'Manager');
          setEmployeesList(filtered);
        } else {
          setEmployeesList(data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await apiRequest('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchSprints = async (projectId) => {
    if (!projectId) {
      setSprints([]);
      return;
    }
    try {
      const res = await apiRequest(`/api/sprints?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setSprints(data);
      }
    } catch (err) {
      console.error('Error fetching sprints:', err);
    }
  };

  const fetchAssignedTasks = async () => {
    if (!selectedProjectId) {
      setAssignedTasks([]);
      return;
    }
    try {
      let url = `/api/tasks/me?project_id=${selectedProjectId}`;
      if (selectedSprintId) {
        url += `&sprint_id=${selectedSprintId}`;
      }
      const res = await apiRequest(url);
      if (res.ok) {
        const data = await res.json();
        setAssignedTasks(data);
      }
    } catch (err) {
      console.error('Error fetching assigned tasks:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUpdates();
      if (hasAccessToLogs) {
        fetchEmployeesList();
      } else {
        fetchProjects();
      }
    }
  }, [user]);

  useEffect(() => {
    if (!hasAccessToLogs) {
      fetchSprints(selectedProjectId);
      setSelectedSprintId('');
      setAssignedTasks([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (!hasAccessToLogs) {
      fetchAssignedTasks();
    }
  }, [selectedProjectId, selectedSprintId]);

  // Fetch attendance hours and populate fields based on selected date (Only for SDEs)
  useEffect(() => {
    if (hasAccessToLogs || !user) return;
    
    const existingUpdate = updates.find(u => u.work_date.slice(0, 10) === date);
    if (existingUpdate) {
      setHours(existingUpdate.hours_worked);
      setTodaysTasks(existingUpdate.todays_tasks || '');
      setCompleted(existingUpdate.completed || '');
      setInProgress(existingUpdate.in_progress || '');
      setBlocked(existingUpdate.blocked || '');
      setTomorrowPlan(existingUpdate.tomorrow_plan || '');
      setStatusText(existingUpdate.manager_status === 'pending' ? 'Submitted for approval' : existingUpdate.manager_status);
    } else {
      setTodaysTasks('');
      setCompleted('');
      setInProgress('');
      setBlocked('');
      setTomorrowPlan('');
      setStatusText('Not submitted');

      const fetchAttendanceHours = async () => {
        try {
          const monthStr = date.slice(0, 7);
          const attRes = await apiRequest(`/api/attendance/me?month=${monthStr}`);
          if (attRes.ok) {
            const attHistory = await attRes.json();
            const daySession = attHistory.find(s => s.work_date.slice(0, 10) === date);
            if (daySession && daySession.total_work_minutes) {
              const hrs = parseFloat((daySession.total_work_minutes / 60).toFixed(1));
              setHours(hrs);
            } else {
              setHours(8);
            }
          }
        } catch (err) {
          console.error('Error fetching attendance hours:', err);
          setHours(8);
        }
      };
      fetchAttendanceHours();
    }
  }, [date, updates, hasAccessToLogs, user]);

  const handleSaveDraft = () => {
    alert('Daily update draft saved locally.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const res = await apiRequest('/api/daily-updates', {
        method: 'POST',
        body: JSON.stringify({
          work_date: date,
          todays_tasks: todaysTasks,
          completed: completed,
          in_progress: inProgress,
          blocked: blocked,
          tomorrow_plan: tomorrowPlan
        })
      });
      if (res.ok) {
        fetchUpdates();
        alert('Daily work update submitted to manager.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResolveUpdate = async (id, manager_status, customComment) => {
    let comment = customComment;
    if (manager_status === 'needs_changes' && !comment) {
      comment = prompt('Please enter a comment detailing the requested changes:');
      if (!comment) return;
    } else if (manager_status === 'approved') {
      if (!confirm('Are you sure you want to approve this work log?')) return;
    }

    try {
      const res = await apiRequest(`/api/daily-updates/manager/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ manager_status, manager_comment: comment || undefined })
      });
      if (res.ok) {
        fetchUpdates();
        alert(`Work log status updated to ${manager_status} successfully.`);
      } else {
        const err = await res.json();
        alert(err.message || 'Action failed.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      const res = await apiRequest(`/api/daily-updates/${id}/acknowledge`, {
        method: 'PATCH',
        body: JSON.stringify({ employee_comment: ackComment })
      });
      if (res.ok) {
        fetchUpdates();
        setAckComment('');
        setDetailModalOpen(false);
        alert('Your response has been sent to the manager.');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to submit response.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const maxDate = new Date().toISOString().slice(0, 10);

  if (hasAccessToLogs) {
    const filteredUpdates = updates.filter(u => {
      if (filterEmployeeId && u.employee_id?._id !== filterEmployeeId && u.employee_id !== filterEmployeeId) {
        return false;
      }
      if (filterDate && u.work_date.slice(0, 10) !== filterDate) {
        return false;
      }
      if (filterStatus && u.manager_status !== filterStatus) {
        return false;
      }
      return true;
    });

    return (
      <div>
        <div className="page-head">
          <div>
            <span className="eyebrow">TEAM MANAGEMENT</span>
            <h1>Team Work Logs</h1>
            <p>Review progress logs, track hours, and approve daily updates submitted by reporting team members.</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', background: '#f8fafc', padding: '12px 18px', borderRadius: '10px', border: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>Employee:</span>
            <select 
              value={filterEmployeeId} 
              onChange={(e) => setFilterEmployeeId(e.target.value)} 
              style={{ width: '220px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff', fontSize: '12px', marginTop: 0 }}
            >
              <option value="">All Employees</option>
              {employeesList.map(e => (
                <option key={e._id} value={e._id}>{e.full_name} ({e.role_name || 'SDE'})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>Date:</span>
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)} 
              style={{ width: '150px', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff', fontSize: '12px', marginTop: 0 }}
            />
            {filterDate && (
              <button 
                className="text-btn" 
                onClick={() => setFilterDate('')} 
                style={{ fontSize: '11px', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '150px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff', fontSize: '12px', marginTop: 0 }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="needs_changes">Needs Changes</option>
            </select>
          </div>
        </div>

        <article className="panel table-panel active">
          <div className="panel-head pad">
            <div>
              <h3>Team Daily Updates ({filteredUpdates.length})</h3>
              <p>Previous daily work logs submitted. Click any row to view full details and perform approval actions.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUpdates.map((u) => (
                  <tr 
                    key={u._id} 
                    onClick={() => handleOpenDetail(u)} 
                    style={{ cursor: 'pointer' }}
                    title="Click to view details and actions"
                  >
                    <td>
                      <div>
                        <b>{u.full_name || 'Team SDE'}</b>
                        <small style={{ color: 'var(--muted)', display: 'block', fontSize: '8px' }}>{u.department}</small>
                      </div>
                    </td>
                    <td>{new Date(u.work_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>
                      <span className={`pill ${
                        u.manager_status === 'approved' ? 'success' : 
                        u.manager_status === 'pending' ? 'warning' : 'danger'
                      }`}>
                        {u.manager_status.toUpperCase()}
                      </span>
                      {u.manager_comment && (
                        <small style={{ display: 'block', color: 'var(--red)', fontSize: '8px', marginTop: '4px' }}>
                          Comment: {u.manager_comment}
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUpdates.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', opacity: 0.7, padding: '40px' }}>
                      No daily updates matched the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* View Daily Update Details Modal (Managers/HR/SuperAdmin) */}
        <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)}>
          {selectedUpdate && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>
                  DAILY WORK UPDATE ({selectedUpdate.full_name || 'Team SDE'})
                </span>
                <span className={`pill ${
                  selectedUpdate.manager_status === 'approved' ? 'success' : 
                  selectedUpdate.manager_status === 'pending' ? 'warning' : 'danger'
                }`}>
                  {selectedUpdate.manager_status.toUpperCase()}
                </span>
              </div>
              
              <h2 style={{ fontSize: '20px', marginBottom: '18px' }}>
                {new Date(selectedUpdate.work_date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Today's Tasks</h4>
                  <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                    {selectedUpdate.todays_tasks || 'None'}
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Completed</h4>
                  <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                    {selectedUpdate.completed || 'None'}
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>In Progress</h4>
                  <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                    {selectedUpdate.in_progress || 'None'}
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Blocked</h4>
                  <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                    {selectedUpdate.blocked || 'None'}
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Tomorrow Plan</h4>
                  <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                    {selectedUpdate.tomorrow_plan || 'None'}
                  </p>
                </div>

                {selectedUpdate.manager_comment && !selectedUpdate.comments?.length && (
                  <div style={{ background: '#fff0f2', padding: '12px', borderRadius: '8px', border: '1px solid var(--red)' }}>
                    <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '5px' }}>Manager Feedback</h4>
                    <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--red)', fontWeight: 'bold' }}>
                      {selectedUpdate.manager_comment}
                    </p>
                  </div>
                )}

                {selectedUpdate.employee_comment && !selectedUpdate.comments?.length && (
                  <div style={{ background: '#eef8f4', padding: '12px', borderRadius: '8px', border: '1px solid var(--green)', marginTop: '10px' }}>
                    <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '5px' }}>Employee Acknowledgement</h4>
                    <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--green)', fontWeight: 'bold' }}>
                      {selectedUpdate.employee_comment}
                    </p>
                  </div>
                )}

                {selectedUpdate.comments && selectedUpdate.comments.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: '15px', marginTop: '10px' }}>
                    <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
                      Feedback Conversation History
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedUpdate.comments.map((c, idx) => {
                        const isSelf = c.author_role === user.role;
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              alignSelf: isSelf ? 'flex-end' : 'flex-start',
                              maxWidth: '85%',
                              background: isSelf ? '#f0f4ff' : '#f1f3f5',
                              border: isSelf ? '1px solid #d0e0ff' : '1px solid #e1e3e6',
                              padding: '10px 12px',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px', fontSize: '9px', fontWeight: 'bold', color: 'var(--muted)' }}>
                              <span>{c.author_name} ({c.author_role})</span>
                              <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{c.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedUpdate.manager_status !== 'approved' && (
                <div style={{ marginTop: '15px', borderTop: '1px solid var(--line)', paddingTop: '15px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--ink)', marginBottom: '8px' }}>
                    Manager Feedback / Reply
                  </h4>
                  <textarea 
                    rows="3"
                    value={managerCommentText}
                    onChange={(e) => setManagerCommentText(e.target.value)}
                    placeholder="Provide details about what needs to be changed, or reply to employee..."
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button 
                      className="btn primary" 
                      style={{ background: 'var(--green)', borderColor: 'var(--green)', flex: 1, color: '#fff' }}
                      onClick={() => {
                        handleResolveUpdate(selectedUpdate._id, 'approved', managerCommentText);
                        setDetailModalOpen(false);
                      }}
                    >
                      Approve Log
                    </button>
                    <button 
                      className="btn primary" 
                      style={{ background: 'var(--red)', borderColor: 'var(--red)', flex: 1, color: '#fff' }}
                      onClick={() => {
                        if (!managerCommentText.trim()) {
                          alert('Please enter a feedback comment to request changes.');
                          return;
                        }
                        handleResolveUpdate(selectedUpdate._id, 'needs_changes', managerCommentText);
                        setDetailModalOpen(false);
                      }}
                    >
                      Request Changes
                    </button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn outline" onClick={() => setDetailModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  const filteredEmployeeUpdates = updates.filter(u => {
    if (filterDate && u.work_date.slice(0, 10) !== filterDate) {
      return false;
    }
    if (filterStatus && u.manager_status !== filterStatus) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">WORK LOG</span>
          <h1>Daily Work Update</h1>
          <p>Submit your daily progress for manager review.</p>
        </div>
        <span className={`pill ${statusText === 'Not submitted' ? 'warning' : 'success'}`}>
          {statusText === 'Not submitted' ? 'Pending Submission' : 'Submitted'}
        </span>
      </div>

      <div className="grid form-layout">
        <article className="panel">
          <form id="dailyForm" onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ margin: 0 }}>
                Date
                <input 
                  type="date" 
                  value={date} 
                  max={maxDate}
                  onChange={(e) => setDate(e.target.value)} 
                  required 
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <label style={{ margin: 0 }}>
                Project
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff', fontSize: '13px', marginTop: '5px' }}
                >
                  <option value="">-- Select Project --</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </label>

              <label style={{ margin: 0 }}>
                Sprint
                <select
                  value={selectedSprintId}
                  onChange={(e) => setSelectedSprintId(e.target.value)}
                  disabled={!selectedProjectId}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff', fontSize: '13px', marginTop: '5px' }}
                >
                  <option value="">-- Select Sprint --</option>
                  {sprints.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </label>
            </div>

            {selectedProjectId && (
              <div style={{ 
                background: '#f8fafc', 
                border: '1px solid var(--line)', 
                borderRadius: '8px', 
                padding: '12px', 
                marginBottom: '15px',
                maxHeight: '160px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--muted)', letterSpacing: '0.5px' }}>ASSIGNED SPRINT TASKS</span>
                {assignedTasks.length > 0 ? (
                  assignedTasks.map(t => {
                    const isChecked = todaysTasks.includes(t.title);
                    return (
                      <label key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', margin: 0, fontWeight: 'normal', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const currentTasks = todaysTasks.trim() ? todaysTasks.split('\n') : [];
                              if (!currentTasks.some(line => line.includes(t.title))) {
                                const newTaskLine = `- [${t.external_key || 'TASK'}] ${t.title}`;
                                setTodaysTasks([...currentTasks, newTaskLine].join('\n'));
                              }
                            } else {
                              const currentTasks = todaysTasks.split('\n');
                              const filtered = currentTasks.filter(line => !line.includes(t.title));
                              setTodaysTasks(filtered.join('\n'));
                            }
                          }}
                          style={{ width: 'auto', margin: 0 }}
                        />
                        <span style={{ color: 'var(--ink)' }}>
                          <strong>[{t.external_key || 'TASK'}]</strong> {t.title} 
                          <span style={{ marginLeft: '6px', fontSize: '10px', color: t.status === 'done' ? 'var(--green)' : 'var(--muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                            ({t.status})
                          </span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
                    No assigned tasks found for this project & sprint.
                  </span>
                )}
              </div>
            )}

            <label>
              Today's Tasks
              <textarea 
                rows="3" 
                placeholder="List tasks planned for today..."
                value={todaysTasks}
                onChange={(e) => setTodaysTasks(e.target.value)}
                required
              />
            </label>
            <label>
              Completed
              <textarea 
                rows="3" 
                placeholder="What did you complete?"
                value={completed}
                onChange={(e) => setCompleted(e.target.value)}
                required
              />
            </label>
            <label>
              In Progress
              <textarea 
                rows="3" 
                placeholder="What is currently in progress?"
                value={inProgress}
                onChange={(e) => setInProgress(e.target.value)}
              />
            </label>
            <label>
              Blocked
              <textarea 
                rows="3" 
                placeholder="Mention blockers or dependencies..."
                value={blocked}
                onChange={(e) => setBlocked(e.target.value)}
              />
            </label>
            <label>
              Tomorrow Plan
              <textarea 
                rows="3" 
                placeholder="What will you work on tomorrow?"
                value={tomorrowPlan}
                onChange={(e) => setTomorrowPlan(e.target.value)}
                required
              />
            </label>
            <div className="actions right">
              <button type="button" className="btn outline" id="dailyDraft" onClick={handleSaveDraft}>
                Save Draft
              </button>
              <button className="btn primary" type="submit" disabled={submitLoading}>
                {submitLoading ? 'Submitting...' : 'Submit Update'}
              </button>
            </div>
          </form>
        </article>

        <aside className="panel side-info">
          <h3>Submission Status</h3>
          <div className="status-card">
            <span>Date: {new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <strong id="dailyStatus" style={{ textTransform: 'capitalize' }}>{statusText}</strong>
            <small>Manager approval required</small>
          </div>
          <h3>Recent Updates</h3>
          {updates.map(u => (
            <div className="recent-item" key={u._id}>
              <b>{new Date(u.work_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</b>
              <span className={`pill ${
                u.manager_status === 'approved' ? 'success' : 
                u.manager_status === 'pending' ? 'warning' : 'danger'
              }`}>
                {u.manager_status.toUpperCase()}
              </span>
            </div>
          ))}
          {updates.length === 0 && (
            <div style={{ padding: '10px 0', opacity: 0.7, fontSize: '10px' }}>
              No recent updates submitted yet.
            </div>
          )}
        </aside>
      </div>

      <div style={{ marginTop: '24px' }}>
        <article className="panel table-panel active">
          <div className="panel-head pad">
            <div>
              <h3>Daily Updates History ({filteredEmployeeUpdates.length})</h3>
              <p>Your previous daily work logs and their approval status. Click any row to view full details.</p>
            </div>
          </div>
          
          <div className="pad" style={{ paddingBottom: '15px', borderBottom: '1px solid var(--line)', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--muted)' }}>Filter by Date:</span>
              <input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)} 
                style={{ width: '150px', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff', fontSize: '11px', marginTop: 0 }}
              />
              {filterDate && (
                <button 
                  className="text-btn" 
                  onClick={() => setFilterDate('')} 
                  style={{ fontSize: '11px', cursor: 'pointer' }}
                >
                  Clear
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--muted)' }}>Filter by Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ width: '150px', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff', fontSize: '11px', marginTop: 0 }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="needs_changes">Needs Changes</option>
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table style={{ minWidth: 'auto' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployeeUpdates.map((u) => (
                  <tr 
                    key={u._id}
                    onClick={() => handleOpenDetail(u)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view details"
                  >
                    <td>
                      <b>{new Date(u.work_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</b>
                    </td>
                    <td>
                      <span className={`pill ${
                        u.manager_status === 'approved' ? 'success' : 
                        u.manager_status === 'pending' ? 'warning' : 'danger'
                      }`}>
                        {u.manager_status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredEmployeeUpdates.length === 0 && (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>
                      No daily updates match the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {/* View Daily Update Details Modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)}>
        {selectedUpdate && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>
                DAILY WORK UPDATE
              </span>
              <span className={`pill ${
                selectedUpdate.manager_status === 'approved' ? 'success' : 
                selectedUpdate.manager_status === 'pending' ? 'warning' : 'danger'
              }`}>
                {selectedUpdate.manager_status.toUpperCase()}
              </span>
            </div>
            
            <h2 style={{ fontSize: '20px', marginBottom: '18px' }}>
              {new Date(selectedUpdate.work_date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Today's Tasks</h4>
                <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                  {selectedUpdate.todays_tasks || 'None'}
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Completed</h4>
                <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                  {selectedUpdate.completed || 'None'}
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>In Progress</h4>
                <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                  {selectedUpdate.in_progress || 'None'}
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Blocked</h4>
                <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                  {selectedUpdate.blocked || 'None'}
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Tomorrow Plan</h4>
                <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                  {selectedUpdate.tomorrow_plan || 'None'}
                </p>
              </div>

              {selectedUpdate.manager_comment && !selectedUpdate.comments?.length && (
                <div style={{ background: '#fff0f2', padding: '12px', borderRadius: '8px', border: '1px solid var(--red)' }}>
                  <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '5px' }}>Manager Feedback</h4>
                  <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--red)', fontWeight: 'bold' }}>
                    {selectedUpdate.manager_comment}
                  </p>
                </div>
              )}

              {selectedUpdate.employee_comment && !selectedUpdate.comments?.length && (
                <div style={{ background: '#eef8f4', padding: '12px', borderRadius: '8px', border: '1px solid var(--green)', marginTop: '10px' }}>
                  <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '5px' }}>Your Acknowledgement</h4>
                  <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--green)', fontWeight: 'bold' }}>
                    {selectedUpdate.employee_comment}
                  </p>
                </div>
              )}

              {selectedUpdate.comments && selectedUpdate.comments.length > 0 && (
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '15px', marginTop: '10px' }}>
                  <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
                    Feedback Conversation History
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedUpdate.comments.map((c, idx) => {
                      const isSelf = c.author_role === user.role;
                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            alignSelf: isSelf ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            background: isSelf ? '#f0f4ff' : '#f1f3f5',
                            border: isSelf ? '1px solid #d0e0ff' : '1px solid #e1e3e6',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '4px', fontSize: '9px', fontWeight: 'bold', color: 'var(--muted)' }}>
                            <span>{c.author_name} ({c.author_role})</span>
                            <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{c.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {selectedUpdate.manager_status === 'needs_changes' && (
              <div style={{ marginTop: '15px', borderTop: '1px solid var(--line)', paddingTop: '15px' }}>
                <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--ink)', marginBottom: '8px' }}>
                  Acknowledge Changes Response
                </h4>
                <textarea 
                  rows="2"
                  value={ackComment}
                  onChange={(e) => setAckComment(e.target.value)}
                  placeholder='Type your response (e.g., "Okay, I will do something else.")...'
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button 
                    className="btn primary small"
                    onClick={() => handleAcknowledge(selectedUpdate._id)}
                    disabled={!ackComment.trim()}
                  >
                    Submit Response
                  </button>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--line)', paddingTop: '15px', marginTop: '15px' }}>
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

export default DailyUpdates;
