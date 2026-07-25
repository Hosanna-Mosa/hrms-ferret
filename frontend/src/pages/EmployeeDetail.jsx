import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';

const EmployeeDetail = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  // Data states
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');

  // Meetings States
  const [meetings, setMeetings] = useState([]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  const fetchMeetings = async () => {
    try {
      const res = await apiRequest(`/api/meetings/employee/${employeeId}`);
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest(`/api/meetings/employee/${employeeId}`, {
        method: 'POST',
        body: JSON.stringify({
          title: meetingTitle,
          description: meetingDesc,
          meeting_date: meetingDate,
          start_time: startTime,
          end_time: endTime
        })
      });
      if (res.ok) {
        alert('Meeting scheduled successfully!');
        setMeetingTitle('');
        setMeetingDesc('');
        setShowScheduleForm(false);
        fetchMeetings();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to schedule meeting');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Performance review states
  const [reviewPeriod, setReviewPeriod] = useState('Q3 2026');
  const [attScore, setAttScore] = useState(95);
  const [sprintScore, setSprintScore] = useState(90);
  const [taskScore, setTaskScore] = useState(92);
  const [learnScore, setLearnScore] = useState(80);
  const [mgrRating, setMgrRating] = useState(4.5);
  const [mgrFeedback, setMgrFeedback] = useState('');

  useEffect(() => {
    if (attendance.length > 0) {
      const present = attendance.filter(a => a.status === 'present').length;
      setAttScore(Math.round((present / attendance.length) * 100));
    }
  }, [attendance]);

  useEffect(() => {
    if (tasks.length > 0) {
      const completed = tasks.filter(t => t.status === 'done').length;
      const pct = Math.round((completed / tasks.length) * 100);
      setSprintScore(pct);
      setTaskScore(pct);
    }
  }, [tasks]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest(`/api/performance/manager/${employeeId}`, {
        method: 'POST',
        body: JSON.stringify({
          review_period: reviewPeriod,
          attendance_score: attScore,
          sprint_score: sprintScore,
          task_score: taskScore,
          learning_score: learnScore,
          manager_rating: mgrRating,
          manager_feedback: mgrFeedback
        })
      });
      if (res.ok) {
        alert('Performance review submitted successfully!');
        setMgrFeedback('');
        setActiveTab('tasks');
      } else {
        const err = await res.json();
        alert(err.message || 'Submission failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch Profile
        const profileRes = await apiRequest(`/api/employees/${employeeId}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setEmployee(profileData);
        }

        // Fetch Attendance
        const attRes = await apiRequest(`/api/attendance/employee/${employeeId}`);
        if (attRes.ok) {
          const attData = await attRes.json();
          setAttendance(attData);
        }

        // Fetch Daily Updates
        const duRes = await apiRequest(`/api/daily-updates/employee/${employeeId}`);
        if (duRes.ok) {
          const duData = await duRes.json();
          setDailyUpdates(duData);
        }

        // Fetch Leaves
        const leaveRes = await apiRequest(`/api/leave/employee/${employeeId}`);
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          setLeaves(leaveData);
        }

        // Fetch Tasks
        const taskRes = await apiRequest(`/api/tasks/employee/${employeeId}`);
        if (taskRes.ok) {
          const taskData = await taskRes.json();
          setTasks(taskData);
        }

        // Fetch Meetings
        await fetchMeetings();

      } catch (err) {
        console.error('Error fetching employee details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchAllData();
    }
  }, [employeeId]);

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '80vh', fontWeight: 'bold' }}>Loading employee details...</div>;
  }

  if (!employee) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Employee not found</h2>
        <button onClick={() => navigate(-1)} className="btn primary" style={{ marginTop: '20px' }}>Go Back</button>
      </div>
    );
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((x) => x[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getPriorityClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return '';
    }
  };

  // Helper formats
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDurationString = (minutes) => {
    if (!minutes) return '0h 00m';
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  };

  // Attendance stats calculations
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const lateDays = attendance.filter(a => a.status === 'late').length;
  const wfhDays = attendance.filter(a => a.work_mode === 'wfh').length;
  const totalHours = Math.round(attendance.reduce((sum, s) => sum + (s.total_work_minutes || 0), 0) / 60);

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">ADMINISTRATIVE VIEW</span>
          <h1>Employee Dashboard</h1>
          <p>Review work profiles, attendance history, task logs, and leave trends.</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn outline">
          ← Back
        </button>
      </div>

      <div className="profile-layout">
        <aside className="panel profile-card">
          {employee.profile_pic ? (
            <img 
              src={employee.profile_pic.startsWith('http') ? employee.profile_pic : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${employee.profile_pic}`} 
              alt={employee.full_name} 
              style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px' }}
            />
          ) : (
            <div className="large-avatar" style={{ overflow: 'hidden', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', borderRadius: '50%' }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
                <rect width="24" height="24" fill="#233138"/>
                <circle cx="12" cy="9.5" r="4.5" fill="#aebac1"/>
                <path d="M12 16C7.58 16 4 19.58 4 24H20C20 19.58 16.42 16 12 16Z" fill="#aebac1"/>
              </svg>
            </div>
          )}
          <h2>{employee.full_name}</h2>
          <p>{employee.designation}</p>
          <span className={`pill ${employee.employment_status === 'active' ? 'success' : 'warning'}`} style={{ textTransform: 'capitalize', marginBottom: '10px' }}>
            {employee.employment_status} Employee
          </span>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, color: 'var(--muted)', marginTop: '8px' }}>
            Work Mode: <strong style={{ textTransform: 'capitalize', color: 'var(--ink)' }}>{employee.work_mode || 'remote'}</strong>
          </div>

          <div className="profile-meta">
            <div>
              <small>Employee Code</small>
              <b>{employee.employee_code}</b>
            </div>
            <div>
              <small>Work Email</small>
              <b>{employee.work_email}</b>
            </div>
            <div>
              <small>Department</small>
              <b>{employee.department}</b>
            </div>
            <div>
              <small>Joining Date</small>
              <b>{employee.joining_date ? new Date(employee.joining_date).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</b>
            </div>
            {employee.phone && (
              <div>
                <small>Phone Number</small>
                <b>{employee.phone}</b>
              </div>
            )}
            {employee.profile_data?.skills && employee.profile_data.skills.length > 0 && (
              <div>
                <small>Key Skills</small>
                <b>{employee.profile_data.skills.join(', ')}</b>
              </div>
            )}
            {employee.profile_data?.summary && (
              <div>
                <small>Professional Summary</small>
                <p style={{ fontSize: '0.75rem', margin: '4px 0 0 0', lineHeight: 1.4, color: 'var(--muted)' }}>{employee.profile_data.summary}</p>
              </div>
            )}
          </div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="metrics four">
            <article className="metric">
              <span>Present Today</span>
              <strong>{presentDays}</strong>
              <small>Days in office/remote</small>
            </article>
            <article className="metric">
              <span>Late Logins</span>
              <strong style={{ color: lateDays > 0 ? 'var(--amber)' : 'inherit' }}>{lateDays}</strong>
              <small>Exceeded grace period</small>
            </article>
            <article className="metric">
              <span>WFH Days</span>
              <strong>{wfhDays}</strong>
              <small>Work from home</small>
            </article>
            <article className="metric">
              <span>Total Hours</span>
              <strong>{totalHours} hrs</strong>
              <small>Worked this month</small>
            </article>
          </div>

          <div className="segmented">
            <button className={activeTab === 'tasks' ? 'active' : ''} onClick={() => setActiveTab('tasks')}>Sprint Tasks</button>
            <button className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')}>Attendance History</button>
            <button className={activeTab === 'updates' ? 'active' : ''} onClick={() => setActiveTab('updates')}>Daily Task Updates</button>
            <button className={activeTab === 'leaves' ? 'active' : ''} onClick={() => setActiveTab('leaves')}>Leave History</button>
            <button className={activeTab === 'meetings' ? 'active' : ''} onClick={() => setActiveTab('meetings')}>Meetings</button>
            <button className={activeTab === 'review' ? 'active' : ''} onClick={() => setActiveTab('review')}>Post Review</button>
          </div>

          {activeTab === 'tasks' && (
            <article className="panel table-panel active">
              <div className="panel-head pad">
                <div>
                  <h3>Assigned Sprint Tasks</h3>
                  <p>Sprint tasks and tickets assigned to this employee.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Task Title</th>
                      <th>Story Points</th>
                      <th>Priority</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task._id}>
                        <td><code>{task.external_key}</code></td>
                        <td><b>{task.title}</b></td>
                        <td>{task.story_points} pts</td>
                        <td>
                          <span className={`priority ${getPriorityClass(task.priority)}`}>
                            {task.priority?.toUpperCase()}
                          </span>
                        </td>
                        <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</td>
                        <td>
                          <span className={`pill ${task.status === 'done' ? 'success' : task.status === 'review' ? 'warning' : 'danger'}`}>
                            {task.status?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {tasks.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>No assigned tasks found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          )}

          {activeTab === 'attendance' && (
            <article className="panel table-panel active">
              <div className="panel-head pad">
                <div>
                  <h3>Attendance Log</h3>
                  <p>Daily clock-in times and break logs.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Clock In</th>
                      <th>Break</th>
                      <th>Clock Out</th>
                      <th>Hours Worked</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((log) => (
                      <tr key={log._id}>
                        <td><b>{new Date(log.work_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</b></td>
                        <td style={{ textTransform: 'capitalize' }}>{log.work_mode}</td>
                        <td>{formatTime(log.check_in_at)}</td>
                        <td>{log.total_break_minutes || 0}m</td>
                        <td>{formatTime(log.check_out_at)}</td>
                        <td>{getDurationString(log.total_work_minutes)}</td>
                        <td>
                          <span className={`pill ${log.status === 'present' ? 'success' : log.status === 'late' ? 'warning' : 'danger'}`}>
                            {log.status?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {attendance.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>No attendance records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          )}

          {activeTab === 'updates' && (
            <article className="panel active">
              <div className="panel-head">
                <div>
                  <h3>Task Updates & Logs</h3>
                  <p>Daily sprint updates submitted by the employee.</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dailyUpdates.map((update) => (
                  <div key={update._id} style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong>{new Date(update.work_date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                      <span className={`pill ${update.manager_status === 'approved' ? 'success' : update.manager_status === 'pending' ? 'warning' : 'danger'}`}>
                        {update.manager_status?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: 'var(--muted)', fontSize: '0.7rem', display: 'block', fontWeight: 'bold' }}>COMPLETED TODAY</span>
                        <p style={{ margin: '4px 0 0 0' }}>{update.completed || '—'}</p>
                      </div>
                      <div>
                        <span style={{ color: 'var(--muted)', fontSize: '0.7rem', display: 'block', fontWeight: 'bold' }}>TOMORROW'S PLAN</span>
                        <p style={{ margin: '4px 0 0 0' }}>{update.tomorrow_plan || '—'}</p>
                      </div>
                      {update.blocked && (
                        <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                          <span style={{ color: 'var(--red)', fontSize: '0.7rem', display: 'block', fontWeight: 'bold' }}>⚠ BLOCKED BY</span>
                          <p style={{ margin: '4px 0 0 0', color: 'var(--red)' }}>{update.blocked}</p>
                        </div>
                      )}
                      {update.manager_comment && (
                        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--line)', paddingTop: '10px', marginTop: '6px' }}>
                          <span style={{ color: 'var(--muted)', fontSize: '0.7rem', display: 'block', fontWeight: 'bold' }}>MANAGER COMMENT</span>
                          <p style={{ margin: '4px 0 0 0', fontStyle: 'italic' }}>“{update.manager_comment}”</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {dailyUpdates.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center', opacity: 0.7, border: '1px solid var(--line)', borderRadius: '10px' }}>No daily updates submitted.</div>
                )}
              </div>
            </article>
          )}

          {activeTab === 'leaves' && (
            <article className="panel table-panel active">
              <div className="panel-head pad">
                <div>
                  <h3>Leaves Record</h3>
                  <p>History of all sick and casual leave applications.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => (
                      <tr key={leave._id}>
                        <td><b>{leave.leave_type}</b></td>
                        <td>{new Date(leave.start_date).toLocaleDateString()}</td>
                        <td>{new Date(leave.end_date).toLocaleDateString()}</td>
                        <td>{leave.reason || 'No reason provided.'}</td>
                        <td>
                          <span className={`pill ${leave.status === 'approved' ? 'success' : leave.status === 'pending' ? 'warning' : 'danger'}`}>
                            {leave.status?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {leaves.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>No leave applications found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          )}

          {activeTab === 'meetings' && (
            <article className="panel active">
              <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Scheduled Meetings ({meetings.length})</h3>
                  <p>Meetings scheduled between you (manager) and this employee.</p>
                </div>
                <button 
                  className="btn primary small" 
                  onClick={() => setShowScheduleForm(!showScheduleForm)}
                >
                  {showScheduleForm ? 'Cancel' : 'Schedule Meeting'}
                </button>
              </div>

              {showScheduleForm && (
                <div style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', background: '#fafbfc', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>New Meeting</h4>
                  <form onSubmit={handleScheduleMeeting}>
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <label style={{ gridColumn: '1 / -1' }}>
                        Meeting Title
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. 1-on-1 Performance Check-in" 
                          value={meetingTitle} 
                          onChange={(e) => setMeetingTitle(e.target.value)} 
                        />
                      </label>
                      <label style={{ gridColumn: '1 / -1' }}>
                        Description
                        <textarea 
                          rows="2" 
                          placeholder="List meeting objectives..." 
                          value={meetingDesc} 
                          onChange={(e) => setMeetingDesc(e.target.value)} 
                        />
                      </label>
                      <label>
                        Date
                        <input 
                          type="date" 
                          required 
                          value={meetingDate} 
                          onChange={(e) => setMeetingDate(e.target.value)} 
                        />
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label style={{ flex: 1 }}>
                          Start Time
                          <input 
                            type="time" 
                            required 
                            value={startTime} 
                            onChange={(e) => setStartTime(e.target.value)} 
                          />
                        </label>
                        <label style={{ flex: 1 }}>
                          End Time
                          <input 
                            type="time" 
                            required 
                            value={endTime} 
                            onChange={(e) => setEndTime(e.target.value)} 
                          />
                        </label>
                      </div>
                    </div>
                    <button type="submit" className="btn primary" style={{ marginTop: '15px' }}>
                      Create Meeting
                    </button>
                  </form>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {meetings.map((meeting) => (
                  <div 
                    key={meeting._id} 
                    style={{ 
                      border: '1px solid var(--line)', 
                      borderRadius: '10px', 
                      padding: '16px', 
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="pill success" style={{ textTransform: 'uppercase', fontSize: '9px' }}>
                        Upcoming Sync
                      </span>
                      <strong style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {new Date(meeting.meeting_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </strong>
                    </div>
                    
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--ink)' }}>{meeting.title}</h4>
                    {meeting.description && (
                      <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: 'var(--muted)' }}>{meeting.description}</p>
                    )}
                    
                    <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '11px', color: 'var(--muted)' }}>
                      <div>
                        Time: <strong style={{ color: 'var(--ink)' }}>{meeting.start_time} - {meeting.end_time || '--:--'}</strong>
                      </div>
                      <div>
                        Organizer: <strong style={{ color: 'var(--ink)' }}>{meeting.manager_id?.full_name || 'Manager'}</strong>
                      </div>
                    </div>
                  </div>
                ))}

                {meetings.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center', opacity: 0.7, border: '1px solid var(--line)', borderRadius: '10px' }}>
                    No meetings scheduled yet.
                  </div>
                )}
              </div>
            </article>
          )}

          {activeTab === 'review' && (
            <article className="panel active">
              <div className="panel-head">
                <div>
                  <h3>Submit Performance Review</h3>
                  <p>Assess SDE contribution for the current review cycle.</p>
                </div>
              </div>
              <form onSubmit={handleSubmitReview} style={{ marginTop: '15px' }}>
                <div className="form-grid">
                  <label>
                    Review Period
                    <input type="text" required value={reviewPeriod} onChange={(e) => setReviewPeriod(e.target.value)} />
                  </label>
                  <label>
                    Manager Rating (1.0 - 5.0)
                    <input type="number" step="0.1" min="1.0" max="5.0" required value={mgrRating} onChange={(e) => setMgrRating(parseFloat(e.target.value))} />
                  </label>
                  <label>
                    Attendance Score (%)
                    <input type="number" min="0" max="100" required value={attScore} onChange={(e) => setAttScore(parseInt(e.target.value))} />
                  </label>
                  <label>
                    Sprint Completion Score (%)
                    <input type="number" min="0" max="100" required value={sprintScore} onChange={(e) => setSprintScore(parseInt(e.target.value))} />
                  </label>
                  <label>
                    Task Completion Score (%)
                    <input type="number" min="0" max="100" required value={taskScore} onChange={(e) => setTaskScore(parseInt(e.target.value))} />
                  </label>
                  <label>
                    Learning Progress (%)
                    <input type="number" min="0" max="100" required value={learnScore} onChange={(e) => setLearnScore(parseInt(e.target.value))} />
                  </label>
                </div>
                <label style={{ display: 'block', marginTop: '15px' }}>
                  Manager Feedback & Summary
                  <textarea rows="4" required placeholder="Provide detailed feedback on employee performance..." value={mgrFeedback} onChange={(e) => setMgrFeedback(e.target.value)} />
                </label>
                <button type="submit" className="btn primary" style={{ marginTop: '20px' }}>
                  Submit Performance Review
                </button>
              </form>
            </article>
          )}
        </section>
      </div>
    </div>
  );
};

export default EmployeeDetail;
