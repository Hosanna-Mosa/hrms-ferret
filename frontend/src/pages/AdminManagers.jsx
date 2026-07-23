import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const AdminManagers = () => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/employees/admin/employees');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter(e => e.role_name === 'Manager');
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

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">ADMINISTRATION CONTROL</span>
          <h1>Managers Management</h1>
          <p>Monitor project managers, assign roles, and configure organization hierarchy.</p>
        </div>
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
                  <tr key={m._id}>
                    <td><code>{m.employee_code}</code></td>
                    <td>
                      <div className="employee-cell">
                        <span>{getInitials(m.full_name)}</span>
                        <div>
                          <b>{m.full_name}</b>
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
