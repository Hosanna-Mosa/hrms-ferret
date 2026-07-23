import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import Modal from '../components/Modal';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [metrics, setMetrics] = useState({ totalEmployees: 24, activeEmployees: 21, onboardingEmployees: 3, presentToday: 21, pendingLeaves: 7 });

  // Data states
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [leavesApproval, setLeavesApproval] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [roles, setRoles] = useState([]);

  // Create Employee modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Engineering');
  const [newEmpRole, setNewEmpRole] = useState('Employee');
  const [newEmpDate, setNewEmpDate] = useState('');

  // Fetch admin dashboard aggregated metrics
  const fetchAggregatedMetrics = async () => {
    try {
      const res = await apiRequest('/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setMetrics(prev => ({
          ...prev,
          totalEmployees: data.totalEmployees,
          onboardingEmployees: data.onboardingEmployees,
          presentToday: data.presentToday,
          pendingLeaves: data.pendingLeaves
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTabDetails = async () => {
    try {
      if (activeTab === 'employees') {
        const res = await apiRequest('/api/employees/admin/employees');
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
        }
      } else if (activeTab === 'attendance') {
        const res = await apiRequest('/api/attendance/admin/attendance/report');
        if (res.ok) {
          const data = await res.json();
          setAttendanceReport(data);
        }
      } else if (activeTab === 'leave') {
        const res = await apiRequest('/api/leave/manager/all');
        if (res.ok) {
          const data = await res.json();
          setLeavesApproval(data);
        }
      } else if (activeTab === 'onboarding') {
        // Track list of onboarding employees
        const res = await apiRequest('/api/employees/admin/employees');
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.filter(e => e.employment_status === 'onboarding'));
        }
      } else if (activeTab === 'documents') {
        const res = await apiRequest('/api/documents/admin/pending');
        if (res.ok) {
          const data = await res.json();
          setPendingDocs(data);
        }
      } else if (activeTab === 'roles') {
        const res = await apiRequest('/api/admin/roles');
        if (res.ok) {
          const data = await res.json();
          setRoles(data);
        }
      }
    } catch (error) {
      console.error('Error fetching admin tab content:', error);
    }
  };

  useEffect(() => {
    fetchAggregatedMetrics();
    fetchTabDetails();
  }, [activeTab]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/employees/admin/employees', {
        method: 'POST',
        body: JSON.stringify({
          full_name: newEmpName,
          work_email: newEmpEmail,
          department: newEmpDept,
          roleName: newEmpRole,
          joining_date: newEmpDate
        })
      });
      if (res.ok) {
        fetchTabDetails();
        fetchAggregatedMetrics();
        setAddModalOpen(false);
        setNewEmpName('');
        setNewEmpEmail('');
        setNewEmpDate('');
        alert('Employee profile created and onboarding checklists initialized.');
      } else {
        const err = await res.json();
        alert(err.message || 'Creation failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDeactivate = async (id) => {
    try {
      const res = await apiRequest(`/api/employees/admin/employees/${id}/deactivate`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchTabDetails();
        fetchAggregatedMetrics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveDecision = async (id, decision) => {
    try {
      const res = await apiRequest(`/api/leave/manager/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: decision }) // 'approved' or 'rejected'
      });
      if (res.ok) {
        fetchTabDetails();
        fetchAggregatedMetrics();
        alert(`Leave request has been ${decision}.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyDocument = async (id, decision) => {
    try {
      const res = await apiRequest(`/api/documents/admin/documents/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status: decision }) // 'verified' or 'rejected'
      });
      if (res.ok) {
        fetchTabDetails();
        alert(`Document verification set to ${decision}.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generatePayroll = async () => {
    try {
      // Trigger payroll download
      window.open('/api/admin/payroll/export', '_blank');
    } catch (e) {
      console.error(e);
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((x) => x[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">HR CONTROL CENTER</span>
          <h1>HR / Admin Dashboard</h1>
          <p>Manage employees, attendance, leave, onboarding, documents, payroll, performance, announcements, and roles.</p>
        </div>
        <button className="btn primary" id="addEmployee" onClick={() => setAddModalOpen(true)}>
          + Add Employee
        </button>
      </div>

      <div className="metrics four">
        <article className="metric">
          <span>Total Employees</span>
          <strong>{metrics.totalEmployees}</strong>
          <small>{metrics.onboardingEmployees} onboarding</small>
        </article>
        <article className="metric">
          <span>Present Today</span>
          <strong>{metrics.presentToday}</strong>
          <small>Active attendance</small>
        </article>
        <article className="metric">
          <span>Pending Onboarding</span>
          <strong>{metrics.onboardingEmployees}</strong>
          <small>Requires check-list follow-up</small>
        </article>
        <article className="metric">
          <span>Pending Approvals</span>
          <strong>{metrics.pendingLeaves}</strong>
          <small>Leave, documents, time</small>
        </article>
      </div>

      <div className="admin-tabs segmented" id="adminTabs">
        {['employees', 'attendance', 'leave', 'onboarding', 'documents', 'payroll', 'roles'].map(tab => (
          <button 
            key={tab} 
            className={activeTab === tab ? 'active' : ''} 
            onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'employees' && (
        <article className="panel admin-pane active">
          <div className="panel-head">
            <div>
              <h3>Employee Directory</h3>
              <p>Manage active and onboarding employees.</p>
            </div>
            <div className="search small-search">
              <span>⌕</span>
              <input 
                id="employeeSearch" 
                placeholder="Search employee" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Joining</th>
                  <th>Status</th>
                  <th>User State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div className="employee-cell">
                        <span>{getInitials(e.full_name)}</span>
                        <div>
                          <b>{e.full_name}</b>
                          <small>{e.work_email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{e.employee_code}</td>
                    <td>{e.department}</td>
                    <td>{new Date(e.joining_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>
                      <span className={`pill ${e.employment_status === 'active' ? 'success' : 'warning'}`}>
                        {e.employment_status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${e.is_active ? 'success' : 'danger'}`}>
                        {e.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      <button className="text-btn" onClick={() => toggleDeactivate(e.id)}>
                        {e.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {activeTab === 'attendance' && (
        <article className="panel admin-pane active">
          <div className="panel-head">
            <div>
              <h3>Attendance Reports</h3>
              <p>Today's organization attendance.</p>
            </div>
            <button className="btn outline small" onClick={exportCSV}>Export Report</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Mode</th>
                  <th>Check In</th>
                  <th>Hours Worked</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceReport.map(r => (
                  <tr key={r.id}>
                    <td><b>{r.full_name}</b></td>
                    <td>{r.employee_code}</td>
                    <td>{r.department}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.work_mode}</td>
                    <td>{r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td>{Math.floor(r.total_work_minutes / 60)}h {r.total_work_minutes % 60}m</td>
                    <td>
                      <span className={`pill ${r.status === 'present' ? 'success' : 'warning'}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {attendanceReport.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>No attendance check-ins recorded for today yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {activeTab === 'leave' && (
        <article className="panel admin-pane active">
          <div className="panel-head">
            <div>
              <h3>Leave Approvals</h3>
              <p>Approve or reject employee requests.</p>
            </div>
          </div>
          {leavesApproval.filter(l => l.status === 'pending').map(l => (
            <div className="approval-row" key={l.id}>
              <div>
                <b>{l.full_name}</b>
                <small>{l.leave_type} · {new Date(l.start_date).toLocaleDateString()} to {new Date(l.end_date).toLocaleDateString()} · {l.reason}</small>
              </div>
              <div className="actions">
                <button className="btn outline small reject" onClick={() => handleLeaveDecision(l.id, 'rejected')}>Reject</button>
                <button className="btn primary small approve" onClick={() => handleLeaveDecision(l.id, 'approved')}>Approve</button>
              </div>
            </div>
          ))}
          {leavesApproval.filter(l => l.status === 'pending').length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: 'var(--muted)' }}>
              No leave requests pending approvals.
            </div>
          )}
        </article>
      )}

      {activeTab === 'onboarding' && (
        <article className="panel admin-pane active">
          <div className="panel-head">
            <div>
              <h3>Onboarding Status</h3>
              <p>Track completion and follow-up.</p>
            </div>
          </div>
          {employees.map(e => (
            <div className="onboard-admin" key={e.id} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold' }}>
                <b>{e.full_name} ({e.employee_code})</b>
                <span>{e.employee_code === 'FER-2026-002' ? '60%' : e.employee_code === 'FER-2026-003' ? '80%' : '55%'}</span>
              </div>
              <div className="progress">
                <i style={{ width: e.employee_code === 'FER-2026-002' ? '60%' : e.employee_code === 'FER-2026-003' ? '80%' : '55%' }}></i>
              </div>
            </div>
          ))}
        </article>
      )}

      {activeTab === 'documents' && (
        <article className="panel admin-pane active">
          <div className="panel-head">
            <div>
              <h3>Document Verification</h3>
              <p>Review uploaded employee documents.</p>
            </div>
          </div>
          {pendingDocs.map(d => (
            <div className="approval-row" key={d.id}>
              <div>
                <b>{d.document_type} · {d.full_name}</b>
                <small>Uploaded {new Date(d.uploaded_at).toLocaleDateString()} · <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--blue)' }}>View Document</a></small>
              </div>
              <div className="actions">
                <button className="btn outline small reject" onClick={() => handleVerifyDocument(d.id, 'rejected')}>Reject</button>
                <button className="btn primary small approve" onClick={() => handleVerifyDocument(d.id, 'verified')}>Verify</button>
              </div>
            </div>
          ))}
          {pendingDocs.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: 'var(--muted)' }}>
              No employee documents awaiting verification audits.
            </div>
          )}
        </article>
      )}

      {activeTab === 'payroll' && (
        <article className="panel admin-pane active">
          <div className="panel-head">
            <div>
              <h3>Payroll Export</h3>
              <p>Prepare monthly payroll data.</p>
            </div>
            <button className="btn primary" onClick={generatePayroll}>Generate Payroll CSV</button>
          </div>
          <div className="summary-list">
            <div>
              <span>Payroll Month</span>
              <b>July 2026</b>
            </div>
            <div>
              <span>Employees Enrolled</span>
              <b>{metrics.totalEmployees}</b>
            </div>
            <div>
              <span>Attendance Locked</span>
              <b>{metrics.presentToday} / {metrics.totalEmployees}</b>
            </div>
            <div>
              <span>Pending Corrections</span>
              <b>0</b>
            </div>
          </div>
        </article>
      )}

      {activeTab === 'roles' && (
        <article className="panel admin-pane active">
          <div className="panel-head">
            <div>
              <h3>Roles & Permissions</h3>
              <p>Manage access levels.</p>
            </div>
            <button className="btn primary small" onClick={() => alert('Role creation integration stubbed.')}>+ New Role</button>
          </div>
          {roles.map(r => (
            <div className="role-row" key={r.id}>
              <div>
                <b>{r.name}</b>
                <small>Permissions: {Object.keys(r.permissions).join(', ')}</small>
              </div>
              <span>{r.user_count} user{parseInt(r.user_count) !== 1 ? 's' : ''}</span>
            </div>
          ))}
          {roles.length === 0 && (
            <>
              <div className="role-row">
                <div><b>HR Admin</b><small>Full employee and HR access</small></div>
                <span>1 user</span>
              </div>
              <div className="role-row">
                <div><b>Manager</b><small>Team approvals and reports</small></div>
                <span>1 user</span>
              </div>
              <div className="role-row">
                <div><b>Employee</b><small>Self-service employee access</small></div>
                <span>4 users</span>
              </div>
            </>
          )}
        </article>
      )}

      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)}>
        <h2>Add Employee</h2>
        <p>Create an employee record and onboarding invitation.</p>
        <form id="employeeForm" onSubmit={handleAddEmployee}>
          <label>
            Full Name
            <input value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} required />
          </label>
          <label>
            Work Email
            <input type="email" value={newEmpEmail} onChange={(e) => setNewEmpEmail(e.target.value)} required />
          </label>
          <div className="form-grid">
            <label>
              Department
              <select value={newEmpDept} onChange={(e) => setNewEmpDept(e.target.value)}>
                <option>Engineering</option>
                <option>HR</option>
                <option>Operations</option>
                <option>Sales</option>
              </select>
            </label>
            <label>
              Role
              <select value={newEmpRole} onChange={(e) => setNewEmpRole(e.target.value)}>
                <option>Employee</option>
                <option>Manager</option>
                <option>HR Admin</option>
              </select>
            </label>
          </div>
          <label>
            Joining Date
            <input type="date" value={newEmpDate} onChange={(e) => setNewEmpDate(e.target.value)} required />
          </label>
          <button className="btn primary full" type="submit">
            Create Employee
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Admin;
