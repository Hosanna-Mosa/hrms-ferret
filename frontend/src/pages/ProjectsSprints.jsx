import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const ProjectsSprints = () => {
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [managers, setManagers] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);

  // Project Form States
  const [projName, setProjName] = useState('');
  const [projKey, setProjKey] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projLead, setProjLead] = useState('');

// Sprint Form States
  const [sprintName, setSprintName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Task Allocation States
  const [sprintTasks, setSprintTasks] = useState([]);
  const [activeSprintDetailId, setActiveSprintDetailId] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await apiRequest('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await apiRequest('/api/employees/admin/employees');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter(e => e.role_name === 'Manager' || e.role_name === 'SuperAdmin');
        setManagers(filtered);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSprints = async (projId) => {
    if (!projId) return;
    try {
      const res = await apiRequest(`/api/sprints?project_id=${projId}`);
      if (res.ok) {
        const data = await res.json();
        setSprints(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchProjects(), fetchManagers()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchSprints(selectedProjectId);
    } else {
      setSprints([]);
    }
  }, [selectedProjectId]);

  const fetchSprintTasks = async (sprintId) => {
    if (!sprintId || !selectedProjectId) return;
    try {
      const res = await apiRequest(`/api/tasks/manager/all?project_id=${selectedProjectId}&sprint_id=${sprintId}`);
      if (res.ok) {
        const data = await res.json();
        setSprintTasks(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeSprintDetailId) {
      fetchSprintTasks(activeSprintDetailId);
    } else {
      setSprintTasks([]);
    }
  }, [activeSprintDetailId]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: projName,
          key: projKey.toUpperCase(),
          description: projDesc,
          lead_id: projLead || null
        })
      });
      if (res.ok) {
        alert('Project created successfully!');
        setProjName('');
        setProjKey('');
        setProjDesc('');
        setProjLead('');
        fetchProjects();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create project');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Please select a project first');
      return;
    }
    try {
      const res = await apiRequest('/api/sprints', {
        method: 'POST',
        body: JSON.stringify({
          project_id: selectedProjectId,
          name: sprintName,
          start_date: startDate,
          end_date: endDate
        })
      });
      if (res.ok) {
        alert('Sprint planned successfully!');
        setSprintName('');
        setStartDate('');
        setEndDate('');
        fetchSprints(selectedProjectId);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to plan sprint');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSprintStatus = async (sprintId, newStatus) => {
    try {
      const res = await apiRequest(`/api/sprints/${sprintId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        alert(`Sprint status updated to ${newStatus}`);
        fetchSprints(selectedProjectId);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update sprint status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await apiRequest(`/api/projects/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Project deleted successfully!');
        setSelectedProjectId('');
        fetchProjects();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete project');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '80vh', fontWeight: 'bold' }}>Loading projects...</div>;
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">AGILE PLANNING</span>
          <h1>Projects & Sprints</h1>
          <p>Configure project keys, lead owners, backlogs, and active sprint timelines.</p>
        </div>
      </div>

      <div className="profile-layout" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Projects sidebar list & onboarding */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <article className="panel" style={{ padding: '16px' }}>
            <h3>Active Projects</h3>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>
              Select a project to manage its sprints.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {projects.map(p => (
                <div 
                  key={p._id}
                  onClick={() => setSelectedProjectId(p._id)}
                  style={{ 
                    padding: '10px', 
                    borderRadius: '8px', 
                    background: selectedProjectId === p._id ? 'var(--line)' : 'transparent',
                    border: '1px solid var(--line)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <code style={{ fontSize: '11px', fontWeight: 'bold' }}>{p.key}</code>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '2px' }}>{p.name}</div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(p._id); }}
                    className="text-btn" 
                    style={{ color: 'var(--red)', fontSize: '11px' }}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {projects.length === 0 && (
                <div style={{ textAlign: 'center', opacity: 0.5, padding: '15px' }}>No projects available.</div>
              )}
            </div>
          </article>

          <article className="panel" style={{ padding: '16px' }}>
            <h3>Create Project</h3>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <label>
                Project Name
                <input type="text" placeholder="e.g. Mobile Application" required value={projName} onChange={(e) => setProjName(e.target.value)} />
              </label>
              <label>
                Project Key (3 Letters)
                <input type="text" maxLength="3" placeholder="e.g. MOB" required value={projKey} onChange={(e) => setProjKey(e.target.value)} />
              </label>
              <label>
                Project Lead
                <select value={projLead} onChange={(e) => setProjLead(e.target.value)}>
                  <option value="">-- Assign Lead --</option>
                  {managers.map(m => (
                    <option key={m._id} value={m._id}>{m.full_name}</option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea rows="3" placeholder="Brief project summary..." value={projDesc} onChange={(e) => setProjDesc(e.target.value)} />
              </label>
              <button type="submit" className="btn primary full" style={{ marginTop: '5px' }}>
                Create Project
              </button>
            </form>
          </article>
        </aside>

        {/* Sprints planning side */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="grid two" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <article className="panel table-panel active">
              <div className="panel-head pad">
                <div>
                  <h3>Planned Sprints</h3>
                  <p>Timeline, scheduling, and control states.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sprint Name</th>
                      <th>Dates</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sprints.map((s) => (
                      <tr 
                        key={s._id}
                        onClick={(e) => {
                          if (e.target.closest('button')) return;
                          setActiveSprintDetailId(s._id);
                        }}
                        style={{ cursor: 'pointer', background: activeSprintDetailId === s._id ? 'var(--line)' : 'transparent' }}
                        title="Click to view task allocations & SDE assignments"
                      >
                        <td><b>{s.name}</b></td>
                        <td style={{ fontSize: '12px' }}>
                          {new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()}
                        </td>
                        <td>
                          <span className={`pill ${s.status === 'active' ? 'success' : s.status === 'completed' ? 'secondary' : 'warning'}`}>
                            {s.status?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {s.status === 'planned' && (
                            <button onClick={() => handleUpdateSprintStatus(s._id, 'active')} className="btn primary small">
                              Activate
                            </button>
                          )}
                          {s.status === 'active' && (
                            <button onClick={() => handleUpdateSprintStatus(s._id, 'completed')} className="btn outline small">
                              Complete
                            </button>
                          )}
                          {s.status === 'completed' && <span style={{ opacity: 0.5 }}>Closed</span>}
                        </td>
                      </tr>
                    ))}
                    {sprints.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>
                          No sprints planned for this project.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            {activeSprintDetailId && (
              <article className="panel table-panel active" style={{ gridColumn: '1 / -1', marginTop: '15px' }}>
                <div className="panel-head pad">
                  <div>
                    <h3>Sprint Resource Allocations</h3>
                    <p>Task assignments and SDEs working in the selected sprint.</p>
                  </div>
                  <button onClick={() => setActiveSprintDetailId('')} className="btn outline small">Close Allocations</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Task Title</th>
                        <th>Assigned Employee</th>
                        <th>Points</th>
                        <th>Priority</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sprintTasks.map((t) => (
                        <tr key={t._id}>
                          <td><code>{t.external_key}</code></td>
                          <td><b>{t.title}</b></td>
                          <td>{t.full_name || 'Unassigned'}</td>
                          <td>{t.story_points || 0} pts</td>
                          <td>
                            <span className={`pill ${t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'neutral'}`} style={{ fontSize: '9px' }}>
                              {t.priority}
                            </span>
                          </td>
                          <td>
                            <span className={`pill ${t.status === 'done' ? 'success' : t.status === 'review' ? 'warning' : 'neutral'}`} style={{ fontSize: '9px' }}>
                              {t.status?.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {sprintTasks.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>No tasks assigned to SDEs in this sprint yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            )}

            <article className="panel" style={{ padding: '16px', height: 'fit-content' }}>
              <h3>Schedule Sprint</h3>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>
                Plan the next release cadence.
              </p>
              <form onSubmit={handleCreateSprint} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label>
                  Sprint Name
                  <input type="text" placeholder="e.g. Sprint 13" required value={sprintName} onChange={(e) => setSprintName(e.target.value)} />
                </label>
                <label>
                  Start Date
                  <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </label>
                <label>
                  End Date
                  <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </label>
                <button type="submit" className="btn primary full" style={{ marginTop: '10px' }}>
                  Plan Sprint
                </button>
              </form>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProjectsSprints;
