import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import Modal from '../components/Modal';

const AdminDepartments = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterManagerId, setFilterManagerId] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [managerId, setManagerId] = useState('');
  const [parentId, setParentId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchDepartments = async () => {
    try {
      const res = await apiRequest('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (e) {
      console.error('Error fetching departments:', e);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await apiRequest('/api/employees/admin/employees');
      if (res.ok) {
        const data = await res.json();
        // filter managers/HR/admins
        const filtered = data.filter(e => e.role_name === 'Manager' || e.role_name === 'SuperAdmin');
        setManagers(filtered);
      }
    } catch (e) {
      console.error('Error fetching managers:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchDepartments(), fetchManagers()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    const payload = {
      name,
      code: code.toUpperCase(),
      manager_id: managerId || null,
      parent_department_id: parentId || null
    };

    try {
      let res;
      if (editingId) {
        res = await apiRequest(`/api/departments/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiRequest('/api/departments', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        alert(editingId ? 'Department updated successfully!' : 'Department created successfully!');
        resetForm();
        setModalOpen(false);
        fetchDepartments();
      } else {
        const err = await res.json();
        alert(err.message || 'Action failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (dept) => {
    setEditingId(dept._id);
    setName(dept.name);
    setCode(dept.code);
    setManagerId(dept.manager_id?._id || dept.manager_id || '');
    setParentId(dept.parent_department_id?._id || dept.parent_department_id || '');
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      const res = await apiRequest(`/api/departments/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Department deleted successfully!');
        fetchDepartments();
      } else {
        const err = await res.json();
        alert(err.message || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setManagerId('');
    setParentId('');
  };

  const filteredDepartments = departments.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesManager = !filterManagerId || (d.manager_id?._id || d.manager_id) === filterManagerId;
    return matchesSearch && matchesManager;
  });

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '80vh', fontWeight: 'bold' }}>Loading departments...</div>;
  }

  return (
    <div>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="eyebrow">ORGANIZATION DESIGN</span>
          <h1>Departments Management</h1>
          <p>Configure company hierarchy, supervisory nodes, and department managers.</p>
        </div>
        <div>
          <button 
            className="btn primary" 
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
          >
            Onboard Department
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <article className="panel table-panel active">
          <div className="panel-head pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3>System Departments Directory</h3>
              <p>Monitor supervisors, parent branches, and functional keys.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="search small-search" style={{ margin: 0 }}>
                <span>⌕</span>
                <input
                  type="text"
                  placeholder="Search by name, code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={filterManagerId}
                onChange={(e) => setFilterManagerId(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', background: '#fff', fontSize: '13px', height: '34px', outline: 'none' }}
              >
                <option value="">All Managers</option>
                {managers.map(m => (
                  <option key={m._id} value={m._id}>{m.full_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Department Name</th>
                  <th>Department Head</th>
                  <th>Reports To (Parent)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr 
                    key={dept._id}
                    onClick={(e) => {
                      if (e.target.closest('button')) return;
                      navigate(`/department-detail/${dept._id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Click to view department details & employees"
                  >
                    <td><code>{dept.code}</code></td>
                    <td><b>{dept.name}</b></td>
                    <td>{dept.manager_id ? dept.manager_id.full_name : <span style={{ opacity: 0.5 }}>Unassigned</span>}</td>
                    <td>{dept.parent_department_id ? <code>{dept.parent_department_id.code} ({dept.parent_department_id.name})</code> : <span style={{ opacity: 0.5 }}>— Root</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleEdit(dept)} className="btn outline small">Edit</button>
                        <button onClick={() => handleDelete(dept._id)} className="btn outline small" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDepartments.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>No departments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {/* Onboard Department Modal */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
      >
        <h3>{editingId ? 'Edit Department' : 'Onboard New Department'}</h3>
        <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '15px' }}>
          Build structured reporting branches by defining sub-departments.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label>
            Department Name
            <input type="text" placeholder="e.g. Engineering" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Department Code
            <input type="text" placeholder="e.g. ENG" required value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <label>
            Department Manager (Head)
            <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">-- Assign Manager --</option>
              {managers.map(m => (
                <option key={m._id} value={m._id}>{m.full_name} ({m.employee_code})</option>
              ))}
            </select>
          </label>
          <label>
            Parent Department
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">-- None (Root Node) --</option>
              {departments.filter(d => d._id !== editingId).map(d => (
                <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
            <button 
              type="button" 
              className="btn outline" 
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={submitLoading}>
              {submitLoading ? 'Saving...' : editingId ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDepartments;
