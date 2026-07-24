import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Local States
  const [attendance, setAttendance] = useState({ status: 'idle', in: null, out: null, breakStart: null, breakTotal: 0 });
  const [sprint, setSprint] = useState({ sprint: 'Sprint 12', total_points: 23, completed_points: 18 });
  const [leaves, setLeaves] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [news, setNews] = useState([]);
  const [perfScore, setPerfScore] = useState('No rating');
  const [clock, setClock] = useState('00:00:00');
  const [todayDateStr, setTodayDateStr] = useState('');

  // SuperAdmin CRM States
  const [employeeCount, setEmployeeCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [managerCount, setManagerCount] = useState(0);
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);

  // Fetch initial dashboard metrics
  const fetchMetrics = async () => {
    try {
      if (user?.role === 'SuperAdmin') {
        const empRes = await apiRequest('/api/employees/admin/employees');
        if (empRes.ok) {
          const emps = await empRes.json();
          setEmployeeCount(emps.filter(e => e.role_name === 'Employee').length);
          setManagerCount(emps.filter(e => e.role_name === 'Manager' || e.role_name === 'HR').length);
          setRecentEmployees(emps.slice(0, 5));
        }

        const projRes = await apiRequest('/api/projects');
        if (projRes.ok) {
          const projs = await projRes.json();
          setProjectCount(projs.length);
          setRecentProjects(projs.slice(0, 5));
        }

        const annRes = await apiRequest('/api/announcements');
        if (annRes.ok) {
          const annData = await annRes.json();
          setNews(annData.slice(0, 2));
        }
        return;
      }

      // 1. Fetch current month attendance to extract today's status
      const month = new Date().toISOString().slice(0, 7);
      const attRes = await apiRequest(`/api/attendance/me?month=${month}`);
      if (attRes.ok) {
        const attHistory = await attRes.json();
        const today = new Date().toISOString().slice(0, 10);
        const todaySession = attHistory.find(s => s.work_date.slice(0, 10) === today);
        if (todaySession) {
          // Check if checked out
          if (todaySession.check_out_at) {
            setAttendance({
              status: 'done',
              in: todaySession.check_in_at,
              out: todaySession.check_out_at,
              breakTotal: todaySession.total_break_minutes * 60000,
              workedMinutes: todaySession.total_work_minutes
            });
          } else {
            // Check if currently on break (active break where ended_at is null)
            const activeBreak = todaySession.breaks?.find(b => !b.ended_at);
            if (activeBreak) {
              setAttendance({
                status: 'break',
                in: todaySession.check_in_at,
                breakStart: activeBreak.started_at,
                breakTotal: (todaySession.total_break_minutes || 0) * 60000
              });
            } else {
              setAttendance({
                status: 'working',
                in: todaySession.check_in_at,
                breakTotal: (todaySession.total_break_minutes || 0) * 60000
              });
            }
          }
        }
      }

      // 2. Fetch Sprint status
      const sprintRes = await apiRequest('/api/tasks/sprints/current');
      if (sprintRes.ok) {
        const sprintData = await sprintRes.json();
        setSprint(sprintData);
      }

      // 3. Fetch Tasks
      const tasksRes = await apiRequest('/api/tasks/me');
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.filter(t => t.status !== 'done').slice(0, 3));
      }

      // 4. Fetch Leave requests
      const leavesRes = await apiRequest('/api/leave/me');
      if (leavesRes.ok) {
        const leavesData = await leavesRes.json();
        setLeaves(leavesData);
      }

      // 5. Fetch Announcements
      const annRes = await apiRequest('/api/announcements');
      if (annRes.ok) {
        const annData = await annRes.json();
        setNews(annData.slice(0, 2));
      }

      // 6. Fetch Performance score
      const perfRes = await apiRequest('/api/performance/me');
      if (perfRes.ok) {
        const perfData = await perfRes.json();
        if (perfData.length > 0) {
          setPerfScore(`${perfData[0].manager_rating} / 5`);
        } else {
          setPerfScore('No rating');
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard details:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  useEffect(() => {
    // Clock ticker
    const interval = setInterval(() => {
      const n = new Date();
      setClock(n.toLocaleTimeString());
      setTodayDateStr(n.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format Helpers
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDurationString = (ms) => {
    const m = Math.max(0, Math.floor(ms / 60000));
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
  };

  const getWorkedTimeMs = () => {
    if (!attendance.in) return 0;
    if (attendance.status === 'done' && attendance.workedMinutes) {
      return attendance.workedMinutes * 60000;
    }
    const end = attendance.out ? new Date(attendance.out).getTime() : Date.now();
    const start = new Date(attendance.in).getTime();
    return Math.max(0, end - start);
  };

  const getBreakTimeMs = () => {
    let br = attendance.breakTotal || 0;
    if (attendance.status === 'break' && attendance.breakStart) {
      br += Date.now() - new Date(attendance.breakStart).getTime();
    }
    return br;
  };

  // Actions
  const handleCheckIn = async () => {
    try {
      const res = await apiRequest('/api/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ work_mode: 'remote' })
      });
      if (res.ok) {
        fetchMetrics();
        alert('Clocked in successfully!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBreak = async () => {
    try {
      const endpoint = attendance.status === 'working' ? '/api/attendance/break/start' : '/api/attendance/break/end';
      const res = await apiRequest(endpoint, { method: 'POST' });
      if (res.ok) {
        fetchMetrics();
        alert(attendance.status === 'working' ? 'Break started.' : 'Break stopped.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await apiRequest('/api/attendance/check-out', { method: 'POST' });
      if (res.ok) {
        fetchMetrics();
        alert('Clocked out successfully!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Calculated Metrics
  const activeLeavesCount = leaves.filter(l => l.status === 'pending').length;
  const sprintPct = sprint.total_points > 0 ? Math.round((sprint.completed_points / sprint.total_points) * 100) : 0;

  // Leave Balance calculation
  const totalCasual = 10;
  const totalSick = 5;
  let approvedCasual = 0;
  let approvedSick = 0;

  leaves.forEach(l => {
    if (l.status === 'approved') {
      const days = Math.round((new Date(l.end_date) - new Date(l.start_date)) / (1000 * 60 * 60 * 24)) + 1;
      if (l.leave_type === 'Sick Leave') {
        approvedSick += days;
      } else {
        approvedCasual += days;
      }
    }
  });

  const remainingCasual = Math.max(0, totalCasual - approvedCasual);
  const remainingSick = Math.max(0, totalSick - approvedSick);
  const totalRemaining = remainingCasual + remainingSick;

  if (user?.role === 'SuperAdmin') {
    return (
      <div>
        <div className="page-head">
          <div>
            <span className="eyebrow">ENTERPRISE CENTRAL</span>
            <h1>Operations Control Panel</h1>
            <p>Real-time corporate metrics, active projects, team size, and communication channels.</p>
          </div>
          <div className="date-chip" id="todayDate">{todayDateStr}</div>
        </div>

        {/* CRM Metric Cards */}
        <div className="metrics three" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <article className="metric" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/employees')}>
            <span>Total Developers</span>
            <strong>{employeeCount} SDEs</strong>
            <small>Active employee roster</small>
          </article>

          <article className="metric" style={{ cursor: 'pointer' }} onClick={() => navigate('/projects-sprints')}>
            <span>Active Projects</span>
            <strong>{projectCount} Workspaces</strong>
            <small>Total project codebases</small>
          </article>

          <article className="metric" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/managers')}>
            <span>Management Team</span>
            <strong>{managerCount} Leads</strong>
            <small>Active Project Managers & HRs</small>
          </article>
        </div>

        <div className="grid two" style={{ gap: '20px', marginTop: '20px' }}>
          {/* Active Projects List */}
          <article className="panel">
            <div className="panel-head">
              <div>
                <h3>Project Portfolios</h3>
                <p>Enterprise client projects and designated leads.</p>
              </div>
              <button className="text-btn" onClick={() => navigate('/projects-sprints')}>
                Manage Portfolios
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              {recentProjects.map(p => (
                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fafbfc' }}>
                  <div>
                    <code style={{ fontSize: '10px', fontWeight: 'bold' }}>{p.key}</code>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>{p.name}</div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    Lead: <strong>{p.lead_id ? p.lead_id.full_name : 'Unassigned'}</strong>
                  </span>
                </div>
              ))}
              {recentProjects.length === 0 && (
                <div style={{ padding: '15px', textAlign: 'center', opacity: 0.5 }}>No active projects recorded.</div>
              )}
            </div>
          </article>

          {/* Company Announcements */}
          <article className="panel">
            <div className="panel-head">
              <div>
                <h3>Announcements & Updates</h3>
                <p>Latest corporate bulletin posts.</p>
              </div>
              <button className="text-btn" onClick={() => navigate('/announcements')}>
                Go to Bulletin
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              {news.map(n => (
                <div key={n._id || n.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fafbfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 'bold', color: 'var(--primary)' }}>
                    <span>{n.category?.toUpperCase()}</span>
                    <span style={{ fontWeight: 'normal', color: 'var(--muted)' }}>{new Date(n.published_at || n.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <strong style={{ fontSize: '13px', display: 'block', marginTop: '4px', marginBottom: '4px' }}>{n.title}</strong>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {n.body}
                  </p>
                </div>
              ))}
              {news.length === 0 && (
                <div style={{ padding: '15px', textAlign: 'center', opacity: 0.5 }}>No announcements published.</div>
              )}
            </div>
          </article>
        </div>

        {/* Corporate Team Directory preview */}
        <article className="panel table-panel active" style={{ marginTop: '20px' }}>
          <div className="panel-head pad">
            <div>
              <h3>Recent Company Boardings</h3>
              <p>Overview of newly onboarded team profiles. Click row to inspect.</p>
            </div>
            <button className="btn outline small" onClick={() => navigate('/admin/employees')}>
              All Employees
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Full Name</th>
                  <th>Designation</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEmployees.map(emp => (
                  <tr 
                    key={emp._id} 
                    onClick={() => {
                      if (emp.role_name === 'Manager' || emp.role_name === 'HR') {
                        navigate(`/manager-detail/${emp._id}`);
                      } else {
                        navigate(`/employee-detail/${emp._id}`);
                      }
                    }} 
                    style={{ cursor: 'pointer' }}
                  >
                    <td><code>{emp.employee_code}</code></td>
                    <td><b>{emp.full_name}</b></td>
                    <td>{emp.designation}</td>
                    <td>
                      <span className="pill warning" style={{ fontSize: '9px', textTransform: 'uppercase' }}>{emp.role_name}</span>
                    </td>
                    <td>
                      <span className={`pill ${emp.employment_status === 'active' ? 'success' : 'warning'}`}>{emp.employment_status}</span>
                    </td>
                  </tr>
                ))}
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
          <span className="eyebrow">EMPLOYEE OVERVIEW</span>
          <h1>Good afternoon, {user ? user.name.split(' ')[0] : 'Employee'}.</h1>
          <p>Here is your work, attendance, meetings, and company activity.</p>
        </div>
        <div className="date-chip" id="todayDate">{todayDateStr}</div>
      </div>

      <div className="metrics four">
        <article className="metric">
          <span>Today's Attendance</span>
          <strong id="dashAttendance">
            {attendance.status === 'idle' && 'Not clocked in'}
            {attendance.status === 'working' && 'Clocked in'}
            {attendance.status === 'break' && 'On break'}
            {attendance.status === 'done' && 'Day completed'}
          </strong>
          <small id="dashAttendanceSub">
            {attendance.status === 'idle' && 'Start your workday'}
            {attendance.status === 'done' && getDurationString(getWorkedTimeMs())}
            {attendance.status !== 'idle' && attendance.status !== 'done' && `Since ${formatTime(attendance.in)}`}
          </small>
          {attendance.status === 'idle' && (
            <button className="btn primary small" id="dashCheckBtn" onClick={handleCheckIn}>
              Clock In
            </button>
          )}
        </article>

        <article className="metric">
          <span>Current Sprint</span>
          <strong>{sprintPct}%</strong>
          <small>{sprint.completed_points} of {sprint.total_points} story points</small>
          <div className="progress">
            <i style={{ width: `${sprintPct}%` }}></i>
          </div>
        </article>

        <article className="metric">
          <span>Leave Balance</span>
          <strong>{totalRemaining} days</strong>
          <small>{remainingCasual} casual · {remainingSick} sick</small>
          <div className="progress">
            <i style={{ width: `${(totalRemaining / 15) * 100}%` }}></i>
          </div>
        </article>

        <article className="metric">
          <span>Performance Score</span>
          <strong>{perfScore}</strong>
          <small>{perfScore === 'No rating' ? 'Awaiting Q3 review' : 'Latest review: Excellent'}</small>
          <div className="progress">
            <i style={{ width: perfScore === 'No rating' ? '0%' : '88%' }}></i>
          </div>
        </article>
      </div>

      <div className="grid two">
        <article className="panel attendance-widget">
          <div className="panel-head">
            <div>
              <h3>Today's Attendance</h3>
              <p>Track work time and breaks.</p>
            </div>
            <span className={`pill ${
              attendance.status === 'idle' ? 'neutral' : 
              attendance.status === 'break' ? 'warning' : 'success'
            }`} id="dashStatusPill">
              {attendance.status === 'idle' && 'Not Started'}
              {attendance.status === 'working' && 'Working'}
              {attendance.status === 'break' && 'On Break'}
              {attendance.status === 'done' && 'Completed'}
            </span>
          </div>
          <div className="big-clock" id="dashClock">{clock}</div>
          <div className="attendance-row">
            <div>
              <small>Clock In</small>
              <strong id="dashIn">{formatTime(attendance.in)}</strong>
            </div>
            <div>
              <small>Break</small>
              <strong id="dashBreak">{getDurationString(getBreakTimeMs())}</strong>
            </div>
            <div>
              <small>Clock Out</small>
              <strong id="dashOut">{formatTime(attendance.out)}</strong>
            </div>
            <div>
              <small>Worked</small>
              <strong id="dashWorked">{getDurationString(getWorkedTimeMs())}</strong>
            </div>
          </div>
          <div className="actions center">
            <button 
              className="btn primary" 
              id="checkInBtn" 
              onClick={handleCheckIn} 
              disabled={attendance.status !== 'idle'}
            >
              Clock In
            </button>
            <button 
              className="btn outline" 
              id="breakBtn" 
              onClick={handleToggleBreak} 
              disabled={attendance.status !== 'working' && attendance.status !== 'break'}
            >
              {attendance.status === 'break' ? 'Stop Break' : 'Start Break'}
            </button>
            <button 
              className="btn dark" 
              id="checkOutBtn" 
              onClick={handleCheckOut} 
              disabled={attendance.status !== 'working' && attendance.status !== 'break'}
            >
              Clock Out
            </button>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Upcoming Meetings</h3>
              <p>Your next scheduled meetings.</p>
            </div>
            <button className="text-btn" onClick={() => navigate('/attendance')}>
              View calendar
            </button>
          </div>
          <div className="meeting-list">
            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.7, fontSize: '11px' }}>
              No upcoming meetings scheduled.
            </div>
          </div>
        </article>
      </div>

      <div className="grid three">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Assigned Tasks</h3>
              <p>High-priority work.</p>
            </div>
            <button className="text-btn" onClick={() => navigate('/tasks')}>
              View all
            </button>
          </div>
          {tasks.length > 0 ? tasks.map(t => (
            <div className="task-mini" key={t.id}>
              <span className={`priority ${t.priority}`}>{t.priority.toUpperCase()}</span>
              <strong>{t.title}</strong>
              <small>{t.external_key} · Due {t.due_date ? t.due_date.slice(5, 10) : 'TBD'}</small>
            </div>
          )) : (
            <div className="task-mini"><small>No active pending tasks.</small></div>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Pending Approvals</h3>
              <p>Requests waiting for action.</p>
            </div>
          </div>
          <div className="approval" style={{ cursor: 'pointer' }} onClick={() => navigate('/leave')}>
            <span>Leave</span>
            <div>
              <strong>{activeLeavesCount} request{activeLeavesCount !== 1 ? 's' : ''} pending</strong>
              <small>Manager approval required</small>
            </div>
          </div>
          <div className="approval" style={{ cursor: 'pointer' }} onClick={() => navigate('/attendance')}>
            <span>Time</span>
            <div>
              <strong>0 corrections</strong>
              <small>Awaiting review</small>
            </div>
          </div>
          <div className="approval" style={{ cursor: 'pointer' }} onClick={() => navigate('/onboarding')}>
            <span>Doc</span>
            <div>
              <strong>Onboarding Files</strong>
              <small>Audit checklist status</small>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Company News</h3>
              <p>Latest from Ferret.</p>
            </div>
          </div>
          {news.length > 0 ? news.map(n => (
            <div className="news" key={n._id || n.id}>
              <b>{n.title}</b>
              <p>{n.body}</p>
              <small>Published recently</small>
            </div>
          )) : (
            <div className="news">
              <small>No news published yet.</small>
            </div>
          )}
        </article>
      </div>
    </div>
  );
};

export default Dashboard;
