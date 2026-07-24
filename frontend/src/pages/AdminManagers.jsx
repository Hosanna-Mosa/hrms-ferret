import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';

const AdminManagers = () => {
  const navigate = useNavigate();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Onboarding Manager Form States
  const [isCreating, setIsCreating] = useState(false);
  const [newMgrName, setNewMgrName] = useState('');
  const [newMgrEmail, setNewMgrEmail] = useState('');
  const [newMgrDept, setNewMgrDept] = useState('Engineering');
  const [newMgrDate, setNewMgrDate] = useState('');
  const [newMgrDesig, setNewMgrDesig] = useState('Project Manager');
  const [newMgrRole, setNewMgrRole] = useState('Manager');

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/employees/admin/employees');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter(e => e.role_name === 'Manager' || e.role_name === 'HR');
        setManagers(filtered);
      }
    } catch (err) {
      console.error('Error fetching managers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleAddManagerSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/employees/admin/employees', {
        method: 'POST',
        body: JSON.stringify({
          full_name: newMgrName,
          work_email: newMgrEmail,
          department: newMgrDept,
          roleName: newMgrRole,
          joining_date: newMgrDate,
          designation: newMgrDesig
        })
      });
      if (res.ok) {
        fetchManagers();
        setIsCreating(false);
        setNewMgrName('');
        setNewMgrEmail('');
        setNewMgrDate('');
        setNewMgrDesig('Project Manager');
        setNewMgrRole('Manager');
        alert('Manager onboarding profile created successfully.');
      } else {
        const err = await res.json();
        alert(err.message || 'Creation failed');
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
        fetchManagers();
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

  const filteredManagers = managers.filter(m => 
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = managers.filter(m => m.is_active).length;
  const inactiveCount = managers.length - activeCount;

  if (isCreating) {
    return (
      <div>
        <div className="page-head">
          <div>
            <span className="eyebrow">NEW PORTAL ONBOARDING</span>
            <h1>Onboard New Manager</h1>
            <p>Setup a new Manager profile, specify their designation, department, and joining date.</p>
          </div>
          <button className="btn outline" onClick={() => setIsCreating(false)}>
            ← Back to Directory
          </button>
        </div>

        <article className="panel">
          <h3 style={{ marginBottom: '5px' }}>Manager Credentials & Identity</h3>
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '22px' }}>
            Provide core onboarding details. System logins are initialized with temporary passwords automatically.
          </p>

          <form onSubmit={handleAddManagerSubmit}>
            <div className="form-grid">
              <label>
                Full Name
                <input
                  type="text"
                  required
                  placeholder="Enter candidate first and last name"
                  value={newMgrName}
                  onChange={(e) => setNewMgrName(e.target.value)}
                />
              </label>

              <label>
                Work Email Address
                <input
                  type="email"
                  required
                  placeholder="name@ferrettechnologies.com"
                  value={newMgrEmail}
                  onChange={(e) => setNewMgrEmail(e.target.value)}
                />
              </label>

              <label>
                Profession / Designation
                <input
                  type="text"
                  required
                  placeholder="e.g. Project Manager"
                  value={newMgrDesig}
                  onChange={(e) => setNewMgrDesig(e.target.value)}
                />
              </label>
              
              <label>
                Portal Role
                <select
                  value={newMgrRole}
                  onChange={(e) => setNewMgrRole(e.target.value)}
                >
                  <option value="Manager">Manager</option>
                  <option value="HR">HR Manager</option>
                </select>
              </label>

              <label>
                Department
                <select
                  value={newMgrDept}
                  onChange={(e) => setNewMgrDept(e.target.value)}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="HR">HR</option>
                  <option value="Product">Product</option>
                  <option value="Sales">Sales</option>
                </select>
              </label>

              <label>
                Joining Date
                <input
                  type="date"
                  required
                  value={newMgrDate}
                  onChange={(e) => setNewMgrDate(e.target.value)}
                />
              </label>
            </div>

            <button type="submit" className="btn primary" style={{ marginTop: '20px' }}>
              Onboard Manager
            </button>
          </form>
        </article>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">ADMINISTRATION CONTROL</span>
          <h1>Managers Management</h1>
          <p>Monitor project managers, assign roles, and configure organization hierarchy.</p>
        </div>
        <button className="btn primary" onClick={() => setIsCreating(true)}>
          + Onboard Manager
        </button>
      </div>

      {/* Stats Widgets */}
      <div className="metrics three">
        <article className="metric">
          <span>Total Managers</span>
          <strong>{managers.length}</strong>
          <small>Registered in system</small>
        </article>
        <article className="metric">
          <span>Active Managers</span>
          <strong style={{ color: 'var(--green)' }}>{activeCount}</strong>
          <small>Active credentials</small>
        </article>
        <article className="metric">
          <span>Deactivated</span>
          <strong style={{ color: 'var(--red)' }}>{inactiveCount}</strong>
          <small>Suspended logins</small>
        </article>
      </div>

      {/* Standalone Panel Directory */}
      <article className="panel table-panel admin-pane active">
        <div className="panel-head pad">
          <div>
            <h3>System Managers Directory</h3>
            <p>View manager emails, codes, designations, and account status.</p>
          </div>
          <div className="search small-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search by name, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', fontWeight: 'bold' }}>Loading managers...</div>
        ) : filteredManagers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', opacity: 0.7 }}>No managers found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Manager Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Work Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredManagers.map((m) => (
                  <tr 
                    key={m._id}
                    onClick={(e) => {
                      if (e.target.closest('button')) return;
                      navigate(`/manager-detail/${m._id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Click to view full manager details and team SDEs"
                  >
                    <td><code>{m.employee_code}</code></td>
                    <td>
                      <div className="employee-cell">
                        <span>{getInitials(m.full_name)}</span>
                        <div>
                          <b>{m.full_name} {m.role_name === 'HR' && <span className="pill warning" style={{ fontSize: '9px', padding: '2px 4px', marginLeft: '6px', textTransform: 'uppercase' }}>HR</span>}</b>
                          <small>{m.department}</small>
                        </div>
                      </div>
                    </td>
                    <td>{m.department}</td>
                    <td>{m.designation || 'Project Manager'}</td>
                    <td>{m.work_email}</td>
                    <td>
                      <span className={`pill ${m.is_active ? 'success' : 'danger'}`}>
                        {m.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleDeactivate(m._id)}
                        className={`btn ${m.is_active ? 'outline' : 'primary'} small`}
                      >
                        {m.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
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

export default AdminManagers;
