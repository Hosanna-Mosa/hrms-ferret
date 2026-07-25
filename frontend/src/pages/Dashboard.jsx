import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, setIsClockedIn } = useAuth();
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
  const [hrCount, setHrCount] = useState(0);
  const [onlyManagerCount, setOnlyManagerCount] = useState(0);
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState(null);
  const [projectTeam, setProjectTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Fetch initial dashboard metrics
  const fetchMetrics = async () => {
    try {
      if (user?.role === 'SuperAdmin') {
        const empRes = await apiRequest('/api/employees/admin/employees');
        if (empRes.ok) {
          const emps = await empRes.json();
          setEmployeeCount(emps.filter(e => e.role_name === 'Employee').length);
          setOnlyManagerCount(emps.filter(e => e.role_name === 'Manager').length);
          setHrCount(emps.filter(e => e.role_name === 'HR').length);
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
      let tasksData = [];
      if (user?.role === 'Manager') {
        const tasksRes = await apiRequest('/api/tasks/manager/all');
        if (tasksRes.ok) {
          tasksData = await tasksRes.json();
        }
      } else if (user?.role !== 'HR') {
        const tasksRes = await apiRequest('/api/tasks/me');
        if (tasksRes.ok) {
          tasksData = await tasksRes.json();
        }
      }

      if (user?.role === 'Manager') {
        const activeReporteeTasks = tasksData
          .filter(t => t.status !== 'done' && t.due_date)
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        setTasks(activeReporteeTasks.slice(0, 5));
      } else if (user?.role !== 'HR') {
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

  const handleProjectClick = async (project) => {
    setSelectedProjectDetail(project);
    setLoadingTeam(true);
    setProjectTeam([]);
    try {
      const res = await apiRequest(`/api/tasks/manager/all?project_id=${project._id}`);
      if (res.ok) {
        const tasksData = await res.json();
        const uniqueEmps = [];
        const seen = new Set();
        for (const t of tasksData) {
          if (t.employee_id && !seen.has(t.employee_id._id)) {
            seen.add(t.employee_id._id);
            uniqueEmps.push(t.employee_id);
          }
        }
        
        if (uniqueEmps.length === 0 && project.lead_id) {
          const empRes = await apiRequest('/api/employees/admin/employees');
          if (empRes.ok) {
            const allEmps = await empRes.json();
            const reportees = allEmps.filter(e => e.manager_id === project.lead_id._id || e.manager_name === project.lead_id.full_name);
            setProjectTeam(reportees);
          }
        } else {
          setProjectTeam(uniqueEmps);
        }
      }
    } catch (err) {
      console.error('Error fetching project team:', err);
    } finally {
      setLoadingTeam(false);
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
        setIsClockedIn(true);
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
        setIsClockedIn(false);
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
        <div className="metrics four" style={{ gap: '20px', marginBottom: '20px' }}>
          <article className="metric" style={{ cursor: 'pointer' }} onClick={() => navigate('/projects-sprints')}>
            <span>Active Projects</span>
            <strong>{projectCount} Workspaces</strong>
            <small>Total project codebases</small>
          </article>

          <article className="metric" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/managers')}>
            <span>Total Managers</span>
            <strong>{onlyManagerCount} Leads</strong>
            <small>Active Project Managers</small>
          </article>

          <article className="metric" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/managers')}>
            <span>Total HRs</span>
            <strong>{hrCount} Admins</strong>
            <small>Active HR Personnel</small>
          </article>

          <article className="metric" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/employees')}>
            <span>Total Developers</span>
            <strong>{employeeCount} SDEs</strong>
            <small>Active employee roster</small>
          </article>
        </div>

        <div className="grid two" style={{ gap: '20px', marginTop: '20px' }}>
          {/* Active Projects List */}
          <article className="panel">
            <div className="panel-head">
              <div>
                <h3>Project Portfolios</h3>
                <p>Enterprise client projects and designated leads. Click to inspect.</p>
              </div>
              <button className="text-btn" onClick={() => navigate('/projects-sprints')}>
                Manage Portfolios
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              {recentProjects.map(p => (
                <div 
                  key={p._id} 
                  onClick={() => handleProjectClick(p)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fafbfc', cursor: 'pointer' }}
                  title="Click to view details & team members"
                >
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

        {/* Project Details Modal */}
        {selectedProjectDetail && (
          <div className="modal" style={{ display: 'grid' }}>
            <div className="backdrop" onClick={() => setSelectedProjectDetail(null)}></div>
            <div className="modal-card" style={{ maxWidth: '520px' }}>
              <button className="modal-x" onClick={() => setSelectedProjectDetail(null)}>×</button>
              <span className="eyebrow" style={{ color: 'var(--blue)' }}>PROJECT WORKSPACE DETAILS</span>
              <h2 style={{ fontSize: '22px', margin: '4px 0 2px' }}>{selectedProjectDetail.name}</h2>
              <code style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '15px' }}>Key: {selectedProjectDetail.key}</code>
              
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '12px', margin: '0 0 6px', color: 'var(--muted)' }}>Description</h4>
                <p style={{ fontSize: '12px', margin: 0, lineHeight: '1.5', color: 'var(--ink)' }}>
                  {selectedProjectDetail.description || 'No project description provided.'}
                </p>
              </div>

              <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '10px', background: '#f5f6f8', border: '1px solid var(--line)' }}>
                <h4 style={{ fontSize: '11px', margin: '0 0 6px', color: 'var(--muted)', textTransform: 'uppercase' }}>Assigned Project Lead / Manager</h4>
                {selectedProjectDetail.lead_id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedProjectDetail.lead_id.profile_pic ? (
                        <img 
                          src={selectedProjectDetail.lead_id.profile_pic.startsWith('http') ? selectedProjectDetail.lead_id.profile_pic : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${selectedProjectDetail.lead_id.profile_pic}`} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
                          <rect width="24" height="24" fill="#233138"/>
                          <circle cx="12" cy="9.5" r="4.5" fill="#aebac1"/>
                          <path d="M12 16C7.58 16 4 19.58 4 24H20C20 19.58 16.42 16 12 16Z" fill="#aebac1"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', display: 'block' }}>{selectedProjectDetail.lead_id.full_name}</strong>
                      <small style={{ fontSize: '10px', color: 'var(--muted)' }}>{selectedProjectDetail.lead_id.work_email || 'manager@ferrettechnologies.com'}</small>
                    </div>
                  </div>
                ) : (
                  <em style={{ fontSize: '12px', color: 'var(--muted)' }}>No lead manager assigned</em>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '11px', margin: '0 0 8px', color: 'var(--muted)', textTransform: 'uppercase' }}>Team Members / SDEs Working on Project</h4>
                {loadingTeam ? (
                  <div style={{ fontSize: '12px', padding: '10px 0', fontWeight: 'bold' }}>Loading team members...</div>
                ) : projectTeam.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {projectTeam.map(member => (
                      <div key={member._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid #f0f1f3' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#eef0f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0a3ab', overflow: 'hidden' }}>
                          {member.profile_pic ? (
                            <img src={member.profile_pic.startsWith('http') ? member.profile_pic : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${member.profile_pic}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
                              <rect width="24" height="24" fill="#233138"/>
                              <circle cx="12" cy="9.5" r="4.5" fill="#aebac1"/>
                              <path d="M12 16C7.58 16 4 19.58 4 24H20C20 19.58 16.42 16 12 16Z" fill="#aebac1"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <strong style={{ fontSize: '12px', display: 'block' }}>{member.full_name}</strong>
                          <small style={{ fontSize: '9px', color: 'var(--muted)' }}>{member.designation || 'Software Development Engineer'}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--muted)', padding: '10px 0' }}>No active developers currently assigned tasks in this project.</div>
                )}
              </div>
            </div>
          </div>
        )}
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

      <div className={user?.role === 'HR' ? "grid two" : "grid three"}>
        {user?.role !== 'HR' && (
          <article className="panel">
            <div className="panel-head">
              <div>
                <h3>{user?.role === 'Manager' ? "Direct Reports' Tasks" : "Assigned Tasks"}</h3>
                <p>{user?.role === 'Manager' ? "Upcoming active tickets" : "High-priority work."}</p>
              </div>
              <button className="text-btn" onClick={() => navigate(user?.role === 'Manager' ? '/projects-sprints' : '/tasks')}>
                View all
              </button>
            </div>
            {tasks.length > 0 ? tasks.map(t => (
              <div className="task-mini" key={t._id || t.id}>
                <span className={`priority ${t.priority}`}>{t.priority.toUpperCase()}</span>
                <strong style={{ display: 'block', marginTop: '4px' }}>{t.title}</strong>
                {user?.role === 'Manager' && (
                  <div style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '2px' }}>
                    Assignee: <strong style={{ color: 'var(--ink)' }}>{t.full_name || 'Unknown'}</strong>
                  </div>
                )}
                <small style={{ display: 'block', marginTop: '4px' }}>{t.external_key} · Due {t.due_date ? new Date(t.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'TBD'}</small>
              </div>
            )) : (
              <div className="task-mini"><small>No active tasks.</small></div>
            )}
          </article>
        )}

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
