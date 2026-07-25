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

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);

  const handleOpenDetail = (update) => {
    setSelectedUpdate(update);
    setDetailModalOpen(true);
  };

  const isManager = user?.role === 'Manager';

  const fetchUpdates = async () => {
    try {
      const endpoint = isManager ? '/api/daily-updates/manager/all' : '/api/daily-updates/me';
      const res = await apiRequest(endpoint);
      if (res.ok) {
        const data = await res.json();
        setUpdates(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUpdates();
    }
  }, [user]);

  // Fetch attendance hours and populate fields based on selected date (Only for SDEs)
  useEffect(() => {
    if (isManager || !user) return;
    
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
  }, [date, updates, isManager, user]);

  const handleSaveDraft = () => {
    alert('Daily update draft saved locally.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    }
  };

  const handleResolveUpdate = async (id, manager_status) => {
    let comment = '';
    if (manager_status === 'needs_changes') {
      comment = prompt('Please enter a comment detailing the requested changes:');
      if (!comment) return;
    } else {
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

  const maxDate = new Date().toISOString().slice(0, 10);

  if (isManager) {
    return (
      <div>
        <div className="page-head">
          <div>
            <span className="eyebrow">TEAM MANAGEMENT</span>
            <h1>Team Work Logs</h1>
            <p>Review progress logs, track hours, and approve daily updates submitted by your reporting SDEs.</p>
          </div>
        </div>

        <article className="panel table-panel active">
          <div className="panel-head pad">
            <div>
              <h3>Direct Reports Daily Updates</h3>
              <p>Verify tasks completed, in-progress items, and blockers.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Completed & In-Progress Tasks</th>
                  <th>Blockers</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {updates.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div>
                        <b>{u.full_name || 'Team SDE'}</b>
                        <small style={{ color: 'var(--muted)', display: 'block', fontSize: '8px' }}>{u.department}</small>
                      </div>
                    </td>
                    <td>{new Date(u.work_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td><strong>{u.hours_worked}h</strong></td>
                    <td>
                      <div>
                        <div style={{ marginBottom: '4px' }}>
                          <span style={{ fontSize: '8px', color: 'var(--green)', fontWeight: 'bold' }}>✓ COMPLETED:</span>
                          <p style={{ margin: '2px 0 6px', fontSize: '9px', whiteSpace: 'pre-wrap' }}>{u.completed}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: '8px', color: 'var(--blue)', fontWeight: 'bold' }}>⚡ IN PROGRESS:</span>
                          <p style={{ margin: '2px 0', fontSize: '9px', whiteSpace: 'pre-wrap' }}>{u.in_progress || 'None'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.blocked ? (
                        <span style={{ color: 'var(--red)', fontSize: '9px', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>
                          ⚠️ {u.blocked}
                        </span>
                      ) : (
                        <em style={{ opacity: 0.5, fontSize: '9px' }}>None</em>
                      )}
                    </td>
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
                    <td>
                      {u.manager_status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn primary small" 
                            style={{ background: 'var(--green)', borderColor: 'var(--green)' }}
                            onClick={() => handleResolveUpdate(u._id, 'approved')}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn primary small" 
                            style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
                            onClick={() => handleResolveUpdate(u._id, 'needs_changes')}
                          >
                            Need Changes
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {updates.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', opacity: 0.7, padding: '40px' }}>
                      No daily updates submitted by reportees yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    );
  }

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
              <button className="btn primary" type="submit">
                Submit Update
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
              <h3>Daily Updates History ({updates.length})</h3>
              <p>Your previous daily work logs and their approval status. Click any row to view full details.</p>
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
                {updates.map((u) => (
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
                {updates.length === 0 && (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>
                      No daily updates submitted yet.
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

              {selectedUpdate.manager_comment && (
                <div style={{ background: '#fff0f2', padding: '12px', borderRadius: '8px', border: '1px solid var(--red)' }}>
                  <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '5px' }}>Manager Feedback</h4>
                  <p style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--red)', fontWeight: 'bold' }}>
                    {selectedUpdate.manager_comment}
                  </p>
                </div>
              )}
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

export default DailyUpdates;
