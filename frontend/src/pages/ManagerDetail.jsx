import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';

const ManagerDetail = () => {
  const { managerId } = useParams();
  const navigate = useNavigate();

  // Data states
  const [manager, setManager] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch Profile
        const profileRes = await apiRequest(`/api/employees/${managerId}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setManager(profileData);
        }

        // Fetch All Employees (to filter direct reports)
        const empRes = await apiRequest('/api/employees/admin/employees');
        if (empRes.ok) {
          const empData = await empRes.json();
          setAllEmployees(empData);
        }

        // Fetch Attendance
        const attRes = await apiRequest(`/api/attendance/employee/${managerId}`);
        if (attRes.ok) {
          const attData = await attRes.json();
          setAttendance(attData);
        }

        // Fetch Leaves
        const leaveRes = await apiRequest(`/api/leave/employee/${managerId}`);
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          setLeaves(leaveData);
        }
      } catch (err) {
        console.error('Error fetching manager details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (managerId) {
      fetchAllData();
    }
  }, [managerId]);

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '80vh', fontWeight: 'bold' }}>Loading manager details...</div>;
  }

  if (!manager) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Manager not found</h2>
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

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDurationString = (minutes) => {
    if (!minutes) return '0h 00m';
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  };

  const directReports = allEmployees.filter(
    (e) => e.role_name === 'Employee' && e.manager_id && (e.manager_id._id || e.manager_id) === manager._id
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">ADMINISTRATIVE VIEW</span>
          <h1>Manager Dashboard</h1>
          <p>Review project manager profiles, team reporting structure, and attendance records.</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn outline">
          ← Back
        </button>
      </div>

      <div className="profile-layout">
        <aside className="panel profile-card">
          <div className="large-avatar">{getInitials(manager.full_name)}</div>
          <h2>{manager.full_name}</h2>
          <p>{manager.designation || 'Project Manager'}</p>
          <span className="pill success" style={{ textTransform: 'capitalize', marginBottom: '10px' }}>
            {manager.employment_status || 'active'} Manager
          </span>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, color: 'var(--muted)', marginTop: '8px' }}>
            Department: <strong style={{ color: 'var(--ink)' }}>{manager.department}</strong>
          </div>

          <div className="profile-meta">
            <div>
              <small>Employee Code</small>
              <b>{manager.employee_code}</b>
            </div>
            <div>
              <small>Work Email</small>
              <b>{manager.work_email}</b>
            </div>
            <div>
              <small>Joining Date</small>
              <b>{manager.joining_date ? new Date(manager.joining_date).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</b>
            </div>
            {manager.phone && (
              <div>
                <small>Phone Number</small>
                <b>{manager.phone}</b>
              </div>
            )}
          </div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="metrics three">
            <article className="metric">
              <span>Direct Reports</span>
              <strong>{directReports.length} SDEs</strong>
              <small>Reporting under team</small>
            </article>
            <article className="metric">
              <span>Attendance Rate</span>
              <strong>{attendance.length > 0 ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 100}%</strong>
              <small>Present vs total days</small>
            </article>
            <article className="metric">
              <span>Leaves Taken</span>
              <strong>{leaves.filter(l => l.status === 'approved').length} Days</strong>
              <small>Approved leave request logs</small>
            </article>
          </div>

          <div className="segmented">
            <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>Reporting Employees</button>
            <button className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')}>Attendance History</button>
            <button className={activeTab === 'leaves' ? 'active' : ''} onClick={() => setActiveTab('leaves')}>Leave History</button>
          </div>

          {activeTab === 'reports' && (
            <article className="panel table-panel active">
              <div className="panel-head pad">
                <div>
                  <h3>Direct SDE Reports ({directReports.length})</h3>
                  <p>List of software engineers reporting directly to this manager. Click a name to view their profile dashboard and performance reviews.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directReports.map((emp) => (
                      <tr 
                        key={emp._id}
                        onClick={() => navigate(`/employee-detail/${emp._id}`)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view employee details & performance"
                      >
                        <td><code>{emp.employee_code}</code></td>
                        <td><b>{emp.full_name}</b></td>
                        <td>{emp.department}</td>
                        <td>
                          <span className={`pill ${emp.employment_status === 'active' ? 'success' : 'warning'}`} style={{ textTransform: 'capitalize' }}>
                            {emp.employment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {directReports.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>No direct SDE reports assigned to this manager.</td>
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
                  <p>Manager clock-in times and break logs.</p>
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

          {activeTab === 'leaves' && (
            <article className="panel table-panel active">
              <div className="panel-head pad">
                <div>
                  <h3>Leaves Record</h3>
                  <p>Manager leave requests history.</p>
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
        </section>
      </div>
    </div>
  );
};

export default ManagerDetail;
