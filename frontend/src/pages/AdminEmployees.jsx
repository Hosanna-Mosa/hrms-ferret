import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const AdminEmployees = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [managersList, setManagersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Switch between directory list & full-page onboarding
  const [isCreating, setIsCreating] = useState(false);

  // New Employee fields
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Engineering');
  const [newEmpRole, setNewEmpRole] = useState('Employee');
  const [newEmpDate, setNewEmpDate] = useState('');
  const [newEmpDesig, setNewEmpDesig] = useState('Software Development Engineer');
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const isManager = user?.role === 'Manager';

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/employees/admin/employees');
      if (res.ok) {
        const data = await res.json();
        // If Manager, filter to show only their direct reporting SDEs
        if (isManager && user?.employeeId) {
          setEmployees(data.filter(e => e.role_name === 'Employee' && e.manager_id && e.manager_id._id === user.employeeId));
        } else {
          setEmployees(data.filter(e => e.role_name === 'Employee'));
        }
        setManagersList(data.filter(e => e.role_name === 'Manager'));
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user]);

  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/employees/admin/employees', {
        method: 'POST',
        body: JSON.stringify({
          full_name: newEmpName,
          work_email: newEmpEmail,
          department: newEmpDept,
          roleName: newEmpRole,
          joining_date: newEmpDate,
          designation: newEmpDesig,
          manager_id: selectedManagerId || undefined
        })
      });
      if (res.ok) {
        fetchEmployees();
        setIsCreating(false);
        setNewEmpName('');
        setNewEmpEmail('');
        setNewEmpDate('');
        setNewEmpDesig('Software Development Engineer');
        setSelectedManagerId('');
        alert('Employee onboarding profile created and linked to manager successfully.');
      } else {
        const err = await res.json();
        alert(err.message || 'Creation failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetStatusActive = async (id) => {
    try {
      const res = await apiRequest(`/api/employees/admin/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ employment_status: 'active' })
      });
      if (res.ok) {
        fetchEmployees();
        alert('Employee onboarding completed and profile status marked as active.');
      } else {
        const err = await res.json();
        alert(err.message || 'Status update failed.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDeactivate = async (id) => {
    try {
      const res = await apiRequest(`/api/employees/admin/employees/${id}/deactivate`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchEmployees();
      }
    } catch (err) {
      console.error(err);
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

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = employees.filter(e => e.is_active).length;
  const onboardingCount = employees.filter(e => e.employment_status === 'onboarding').length;

  if (isCreating && !isManager) {
    return (
      <div>
        <div className="page-head">
          <div>
            <span className="eyebrow">NEW PORTAL ONBOARDING</span>
            <h1>Onboard New Employee</h1>
            <p>Setup a new SDE profile, specify their profession, assign a manager, and trigger security checklists.</p>
          </div>
          <button className="btn outline" onClick={() => setIsCreating(false)}>
            ← Back to Directory
          </button>
        </div>

        <article className="panel">
          <h3 style={{ marginBottom: '5px' }}>Employee Credentials & Identity</h3>
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '22px' }}>
            Provide core onboarding details. System logins are initialized with temporary passwords automatically.
          </p>

          <form onSubmit={handleAddEmployeeSubmit}>
            <div className="form-grid">
              <label>
                Full Name
                <input
                  type="text"
                  required
                  placeholder="Enter candidate first and last name"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                />
              </label>

              <label>
                Work Email Address
                <input
                  type="email"
                  required
                  placeholder="name@ferrettechnologies.com"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                />
              </label>

              <label>
                Profession / Designation
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Development Engineer"
                  value={newEmpDesig}
                  onChange={(e) => setNewEmpDesig(e.target.value)}
                />
              </label>

              <label>
                Department
                <select
                  value={newEmpDept}
                  onChange={(e) => setNewEmpDept(e.target.value)}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="HR">HR</option>
                  <option value="Product">Product</option>
                  <option value="Sales">Sales</option>
                </select>
              </label>

              <label>
                System Sidebar Role
                <select
                  value={newEmpRole}
                  onChange={(e) => setNewEmpRole(e.target.value)}
                >
                  <option value="Employee">Employee (Standard SDE)</option>
                  <option value="Manager">Manager (Project Lead)</option>
                  <option value="HR">HR (Operations Lead)</option>
                </select>
              </label>

              <label>
                Reporting Manager (Name & Profession)
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                >
                  <option value="">-- Direct Reporting Manager --</option>
                  {managersList.map(m => (
                    <option key={m._id} value={m._id}>
                      {m.full_name} ({m.designation || 'Project Manager'} - {m.department})
                    </option>
                  ))}
                </select>
              </label>

              <label className="full-span">
                Joining Date
                <input
                  type="date"
                  required
                  value={newEmpDate}
                  onChange={(e) => setNewEmpDate(e.target.value)}
                />
              </label>
            </div>

            <div className="actions right border-top" style={{ marginTop: '20px', paddingTop: '20px' }}>
              <button type="button" className="btn outline" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="btn primary">
                Complete Registration & Onboard SDE
              </button>
            </div>
          </form>
        </article>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">{isManager ? 'TEAM DIRECTORY' : 'ADMINISTRATION CONTROL'}</span>
          <h1>{isManager ? 'My Direct Reports' : 'Employees Management'}</h1>
          <p>
            {isManager 
              ? 'Monitor your direct reporting team members, track onboarding, and manage project assignments.' 
              : 'Create profiles, link reporting managers, trigger onboarding, and manage employee directories.'
            }
          </p>
        </div>
        {!isManager && (
          <button className="btn primary" onClick={() => setIsCreating(true)}>
            + Onboard New Employee
          </button>
        )}
      </div>

      {/* Stats Widgets */}
      <div className="metrics three">
        <article className="metric">
          <span>{isManager ? 'Team SDEs' : 'Total Employees'}</span>
          <strong>{employees.length}</strong>
          <small>Direct reports</small>
        </article>
        <article className="metric">
          <span>Active Team</span>
          <strong style={{ color: 'var(--green)' }}>{activeCount}</strong>
          <small>Active credentials</small>
        </article>
        <article className="metric">
          <span>In Onboarding</span>
          <strong style={{ color: 'var(--amber)' }}>{onboardingCount}</strong>
          <small>Pending checklists</small>
        </article>
      </div>

      {/* Standalone Panel Directory */}
      <article className="panel table-panel admin-pane active">
        <div className="panel-head pad">
          <div>
            <h3>{isManager ? 'Team Member Profiles' : 'System Employees Directory'}</h3>
            <p>{isManager ? 'View contact emails, designations, and account status of your team.' : 'Manage active and onboarding employee profiles.'}</p>
          </div>
          <div className="search small-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search by name, code, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', fontWeight: 'bold' }}>Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', opacity: 0.7 }}>No reportees found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Reporting Manager</th>
                  <th>Joining Date</th>
                  <th>Status</th>
                  {!isManager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr 
                    key={emp._id}
                    onClick={(e) => {
                      if (e.target.closest('button')) return;
                      if (emp.role_name === 'Manager' || emp.role_name === 'HR') {
                        navigate(`/manager-detail/${emp._id}`);
                      } else {
                        navigate(`/employee-detail/${emp._id}`);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Click to view details"
                  >
                    <td><code>{emp.employee_code}</code></td>
                    <td>
                      <div className="employee-cell">
                        <span>{getInitials(emp.full_name)}</span>
                        <div>
                          <b>{emp.full_name}</b>
                          <small>{emp.work_email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{emp.department}</td>
                    <td>{emp.manager_name || <em style={{ opacity: 0.5 }}>None</em>}</td>
                    <td>{new Date(emp.joining_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`pill ${emp.employment_status === 'active' ? 'success' : 'warning'}`}>
                        {emp.employment_status}
                      </span>
                    </td>
                    {!isManager && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {emp.employment_status === 'onboarding' && (
                            <button
                              onClick={() => handleSetStatusActive(emp._id)}
                              className="btn primary small"
                              style={{ background: 'var(--green)', borderColor: 'var(--green)' }}
                            >
                              Approve & Activate
                            </button>
                          )}
                          <button
                            onClick={() => toggleDeactivate(emp._id)}
                            className={`btn ${emp.is_active ? 'outline' : 'primary'} small`}
                          >
                            {emp.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
};

export default AdminEmployees;
