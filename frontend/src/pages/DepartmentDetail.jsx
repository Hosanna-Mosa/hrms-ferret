import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';

const DepartmentDetail = () => {
  const { departmentId } = useParams();
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [subDepartments, setSubDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeptDetails = async () => {
      setLoading(true);
      try {
        // Fetch current department details
        const allDeptsRes = await apiRequest('/api/departments');
        if (allDeptsRes.ok) {
          const allDepts = await allDeptsRes.json();
          const current = allDepts.find(d => d._id === departmentId);
          setDepartment(current);

          // Filter children
          const children = allDepts.filter(d => d.parent_department_id?._id === departmentId);
          setSubDepartments(children);
        }

        // Fetch all employees to filter those in this department
        const empRes = await apiRequest('/api/employees/admin/employees');
        if (empRes.ok) {
          const allEmps = await empRes.json();
          // Match by name or department_id
          const deptEmps = allEmps.filter(e => 
            (e.department_id?._id === departmentId || e.department_id === departmentId) ||
            (department && e.department?.toLowerCase() === department.name?.toLowerCase())
          );
          setEmployees(deptEmps);
        }
      } catch (err) {
        console.error('Error fetching department details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (departmentId) {
      fetchDeptDetails();
    }
  }, [departmentId, department?.name]);

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '80vh', fontWeight: 'bold' }}>Loading department details...</div>;
  }

  if (!department) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Department not found</h2>
        <button onClick={() => navigate(-1)} className="btn primary" style={{ marginTop: '20px' }}>Go Back</button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">ORGANIZATION DETAILS</span>
          <h1>Department: {department.name}</h1>
          <p>View supervisory nodes, direct SDE assignments, and managed branches.</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn outline">
          ← Back
        </button>
      </div>

      <div className="profile-layout" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Left Card: Department Info */}
        <aside className="panel profile-card" style={{ height: 'fit-content', padding: '20px' }}>
          <div className="large-avatar" style={{ background: 'var(--primary)', color: '#fff', fontSize: '20px', borderRadius: '12px' }}>
            {department.code}
          </div>
          <h2 style={{ marginTop: '15px', marginBottom: '2px' }}>{department.name}</h2>
          <code style={{ fontSize: '11px', color: 'var(--muted)' }}>Code: {department.code}</code>

          <div className="profile-meta" style={{ marginTop: '20px' }}>
            <div>
              <small>Department Head (Manager)</small>
              <b>{department.manager_id ? department.manager_id.full_name : 'Unassigned'}</b>
            </div>
            <div>
              <small>Reports To (Parent)</small>
              <b>{department.parent_department_id ? `${department.parent_department_id.name} (${department.parent_department_id.code})` : '— Root Node'}</b>
            </div>
          </div>
        </aside>

        {/* Right Section: SDEs and Sub-departments */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Stats */}
          <div className="metrics two">
            <article className="metric">
              <span>Total Employees Assigned</span>
              <strong>{employees.length} Members</strong>
              <small>Developers & Managers</small>
            </article>
            <article className="metric">
              <span>Managed Sub-Departments</span>
              <strong>{subDepartments.length} Branches</strong>
              <small>Reporting child nodes</small>
            </article>
          </div>

          {/* SDE Members */}
          <article className="panel table-panel active">
            <div className="panel-head pad">
              <div>
                <h3>Assigned Employees ({employees.length})</h3>
                <p>List of employees currently working in this department. Click a name to view their profile dashboard.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>System Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
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
                      title="Click to view profile"
                    >
                      <td><code>{emp.employee_code}</code></td>
                      <td><b>{emp.full_name}</b></td>
                      <td>{emp.designation}</td>
                      <td>
                        <span className="pill warning" style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                          {emp.role_name}
                        </span>
                      </td>
                      <td>
                        <span className={`pill ${emp.employment_status === 'active' ? 'success' : 'warning'}`}>
                          {emp.employment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>No employees assigned to this department.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {/* Sub-Departments */}
          <article className="panel table-panel active">
            <div className="panel-head pad">
              <div>
                <h3>Managed Sub-Departments ({subDepartments.length})</h3>
                <p>Child nodes reporting directly to {department.name}.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Department Name</th>
                    <th>Department Head</th>
                  </tr>
                </thead>
                <tbody>
                  {subDepartments.map((sub) => (
                    <tr 
                      key={sub._id}
                      onClick={() => navigate(`/department-detail/${sub._id}`)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view details"
                    >
                      <td><code>{sub.code}</code></td>
                      <td><b>{sub.name}</b></td>
                      <td>{sub.manager_id ? sub.manager_id.full_name : <span style={{ opacity: 0.5 }}>Unassigned</span>}</td>
                    </tr>
                  ))}
                  {subDepartments.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>No sub-departments reporting to this node.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
};

export default DepartmentDetail;
