import React, { useState, useEffect } from 'react';
import { apiRequest, getAccessToken } from '../utils/api';
import Modal from '../components/Modal';

const ProjectsSprints = () => {
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [managers, setManagers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal Open States
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [createProjectLoading, setCreateProjectLoading] = useState(false);
  const [createSprintLoading, setCreateSprintLoading] = useState(false);

  // Project Form States
  const [projName, setProjName] = useState('');
  const [projKey, setProjKey] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projLead, setProjLead] = useState('');
  const [githubRepo, setGithubRepo] = useState('');

  // Project Documents States
  const [projectDocs, setProjectDocs] = useState([]);
  const [prdFile, setPrdFile] = useState(null);
  const [pddFile, setPddFile] = useState(null);
  const [srsFile, setSrsFile] = useState(null);
  const [sddFile, setSddFile] = useState(null);

  // Individual Doc Upload States
  const [uploadType, setUploadType] = useState('PRD (Product Requirement Document)');
  const [uploadFile, setUploadFile] = useState(null);

  // Sprint Form States
  const [sprintName, setSprintName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [discussionOutput, setDiscussionOutput] = useState('');
  const [tasksToCreate, setTasksToCreate] = useState([]);

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
        setEmployees(data);
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

  const fetchProjectDocs = async (projId) => {
    if (!projId) return;
    try {
      const res = await apiRequest(`/api/documents/project/${projId}`);
      if (res.ok) {
        const data = await res.json();
        setProjectDocs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchSprints(selectedProjectId);
      fetchProjectDocs(selectedProjectId);
    } else {
      setSprints([]);
      setProjectDocs([]);
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

  const handleUploadProjectDoc = async (file, docType, projectId) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', docType);
    formData.append('project_id', projectId);

    try {
      await apiRequest('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
    } catch (e) {
      console.error(`Error uploading ${docType}:`, e);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreateProjectLoading(true);
    try {
      const res = await apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: projName,
          key: projKey.toUpperCase(),
          description: projDesc,
          lead_id: projLead || null,
          github_repo: githubRepo
        })
      });
      if (res.ok) {
        const createdProject = await res.json();
        const projectId = createdProject._id;

        // Upload any selected documents
        await Promise.all([
          handleUploadProjectDoc(prdFile, 'PRD (Product Requirement Document)', projectId),
          handleUploadProjectDoc(pddFile, 'PDD (Process Design Document)', projectId),
          handleUploadProjectDoc(srsFile, 'SRS (Software Requirement Specification)', projectId),
          handleUploadProjectDoc(sddFile, 'SDD (Software Design Document)', projectId)
        ]);

        alert('Project created and documents uploaded to cloud successfully!');
        setProjName('');
        setProjKey('');
        setProjDesc('');
        setProjLead('');
        setGithubRepo('');
        setPrdFile(null);
        setPddFile(null);
        setSrsFile(null);
        setSddFile(null);
        setProjectModalOpen(false);
        fetchProjects();
        if (projectId) {
          fetchProjectDocs(projectId);
        }
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create project');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreateProjectLoading(false);
    }
  };

  const handleUploadSelectedDoc = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please choose a file to upload first.');
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('document_type', uploadType);
    formData.append('project_id', selectedProjectId);

    try {
      const res = await apiRequest('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        alert('Project document uploaded successfully!');
        setUploadFile(null);
        const fileInput = document.getElementById('project-doc-file-input');
        if (fileInput) fileInput.value = '';
        fetchProjectDocs(selectedProjectId);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to upload document');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Please select a project first');
      return;
    }
    setCreateSprintLoading(true);
    try {
      const res = await apiRequest('/api/sprints', {
        method: 'POST',
        body: JSON.stringify({
          project_id: selectedProjectId,
          name: sprintName,
          start_date: startDate,
          end_date: endDate,
          discussion_output: discussionOutput
        })
      });
      if (res.ok) {
        const sprintData = await res.json();
        
        // Loop over tasksToCreate and post them!
        for (const t of tasksToCreate) {
          await apiRequest('/api/tasks', {
            method: 'POST',
            body: JSON.stringify({
              title: t.title,
              description: t.description || '',
              priority: t.priority,
              story_points: t.story_points,
              employee_id: t.assigned_to || undefined,
              project_id: selectedProjectId,
              sprint_id: sprintData._id,
              sprint: sprintData.name,
              due_date: t.due_date || endDate || undefined
            })
          });
        }

        alert('Sprint planned and tasks allocated successfully!');
        setSprintName('');
        setStartDate('');
        setEndDate('');
        setDiscussionOutput('');
        setTasksToCreate([]);
        setSprintModalOpen(false);
        fetchSprints(selectedProjectId);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to plan sprint');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreateSprintLoading(false);
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

  return (
    <div>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="eyebrow">AGILE PLANNING</span>
          <h1>Projects & Sprints</h1>
          <p>Configure project keys, lead owners, backlogs, and active sprint timelines.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn outline" onClick={() => setProjectModalOpen(true)}>
            Create Project
          </button>
          <button 
            className="btn primary" 
            onClick={() => {
              if (!selectedProjectId) {
                alert('Please select a project first');
                return;
              }
              setSprintModalOpen(true);
            }}
          >
            Schedule Sprint
          </button>
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

          {selectedProjectId && (
            <article className="panel" style={{ padding: '16px' }}>
              <h3>Project Documents</h3>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>
                Key blueprint files and specification resources.
              </p>
              
              {projects.find(p => p._id === selectedProjectId)?.github_repo && (
                <div style={{ marginBottom: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}>
                  <strong>GitHub Repo:</strong>{' '}
                  <a 
                    href={projects.find(p => p._id === selectedProjectId).github_repo} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', wordBreak: 'break-all' }}
                  >
                    {projects.find(p => p._id === selectedProjectId).github_repo}
                  </a>
                </div>
              )}
              
              {/* Documents List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                {projectDocs.length > 0 ? (
                  projectDocs.map(doc => (
                    <div 
                      key={doc._id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '8px 10px', 
                        background: '#f8fafc', 
                        borderRadius: '6px', 
                        border: '1px solid var(--line)',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', width: '100%' }}>
                        <span style={{ fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                          {doc.document_type}
                        </span>
                        <a 
                          href={`${import.meta.env.VITE_API_URL || ''}/api/documents/${doc._id}/download?token=${getAccessToken() || ''}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ fontSize: '10px', color: 'var(--primary)', textDecoration: 'none', display: 'inline-block', width: 'fit-content' }}
                        >
                          Download {doc.file_name}
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '11px', opacity: 0.6, fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                    No project documents uploaded yet.
                  </span>
                )}
              </div>

              {/* Upload New Document Form */}
              <form onSubmit={handleUploadSelectedDoc} style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>Upload New Document</h4>
                
                <label style={{ fontSize: '11px', margin: 0 }}>
                  Doc Type
                  <select 
                    value={uploadType} 
                    onChange={(e) => setUploadType(e.target.value)}
                    style={{ fontSize: '11px', padding: '4px', height: 'auto', marginTop: '4px' }}
                  >
                    <option value="PRD (Product Requirement Document)">PRD (Product Requirement Document)</option>
                    <option value="PDD (Process Design Document)">PDD (Process Design Document)</option>
                    <option value="SRS (Software Requirement Specification)">SRS (Software Requirement Specification)</option>
                    <option value="SDD (Software Design Document)">SDD (Software Design Document)</option>
                    <option value="Other Project Document">Other Project Document</option>
                  </select>
                </label>

                <label style={{ fontSize: '11px', margin: 0 }}>
                  File
                  <input 
                    type="file" 
                    id="project-doc-file-input"
                    required
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    style={{ fontSize: '11px', marginTop: '4px' }}
                  />
                </label>

                <button 
                  type="submit" 
                  className="btn primary small full" 
                  style={{ 
                    fontSize: '11px', 
                    padding: '9px 12px', 
                    marginTop: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>☁️</span> Upload to Cloud
                </button>
              </form>
            </article>
          )}
        </aside>

        {/* Sprints planning side */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
              <article className="panel table-panel active" style={{ marginTop: '5px' }}>
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
          </div>
        </section>
      </div>

      {/* Create Project Modal */}
      <Modal 
        isOpen={projectModalOpen} 
        onClose={() => setProjectModalOpen(false)}
        style={{ width: 'min(680px, 95vw)', maxWidth: 'none' }}
      >
        <h3>Create Project</h3>
        <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '15px' }}>
          Initialize a new workspace with a unique 3-letter project prefix and upload blueprint specification documents.
        </p>
        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Project Information</h4>
              <label style={{ margin: 0 }}>
                Project Name
                <input type="text" placeholder="e.g. Mobile Application" required value={projName} onChange={(e) => setProjName(e.target.value)} />
              </label>
              <label style={{ margin: 0 }}>
                Project Key (3 Letters)
                <input type="text" maxLength="3" placeholder="e.g. MOB" required value={projKey} onChange={(e) => setProjKey(e.target.value)} />
              </label>
              <label style={{ margin: 0 }}>
                Project Lead
                <select value={projLead} onChange={(e) => setProjLead(e.target.value)}>
                  <option value="">-- Assign Lead --</option>
                  {managers.map(m => (
                    <option key={m._id} value={m._id}>{m.full_name}</option>
                  ))}
                </select>
              </label>
              <label style={{ margin: 0 }}>
                GitHub Repository Link
                <input type="url" placeholder="https://github.com/org/repo" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} />
              </label>
              <label style={{ margin: 0 }}>
                Description
                <textarea rows="3" placeholder="Brief project summary..." value={projDesc} onChange={(e) => setProjDesc(e.target.value)} style={{ fontSize: '12px' }} />
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid var(--line)', paddingLeft: '15px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Initial Blueprint Documents</h4>
              
              <label style={{ margin: 0 }}>
                PRD (Product Requirement Document)
                <input type="file" onChange={(e) => setPrdFile(e.target.files[0])} style={{ fontSize: '11px', marginTop: '4px' }} />
                <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>Defines business features, user scope & behaviors</span>
              </label>

              <label style={{ margin: 0 }}>
                PDD (Process Design Document)
                <input type="file" onChange={(e) => setPddFile(e.target.files[0])} style={{ fontSize: '11px', marginTop: '4px' }} />
                <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>Maps operational processes and flows</span>
              </label>

              <label style={{ margin: 0 }}>
                SRS (Software Requirement Spec)
                <input type="file" onChange={(e) => setSrsFile(e.target.files[0])} style={{ fontSize: '11px', marginTop: '4px' }} />
                <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>Details system integrations & functional limits</span>
              </label>

              <label style={{ margin: 0 }}>
                SDD (Software Design Document)
                <input type="file" onChange={(e) => setSddFile(e.target.files[0])} style={{ fontSize: '11px', marginTop: '4px' }} />
                <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>Specifies architectures & DB models</span>
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--line)', paddingTop: '15px', marginTop: '10px' }}>
            <button type="button" className="btn outline" onClick={() => setProjectModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={createProjectLoading}>
              {createProjectLoading ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Sprint Modal */}
      <Modal 
        isOpen={sprintModalOpen} 
        onClose={() => setSprintModalOpen(false)}
        style={{ width: 'min(720px, 95vw)', maxWidth: 'none' }}
      >
        <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Schedule Sprint</h2>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
          Plan the next release cadence, set timeline deadlines, and allocate initial sprint backlog tasks for the selected project.
        </p>
        <form onSubmit={handleCreateSprint} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <label style={{ margin: 0 }}>
              Sprint Name
              <input type="text" placeholder="e.g. Sprint 13" required value={sprintName} onChange={(e) => setSprintName(e.target.value)} />
            </label>
            <label style={{ margin: 0 }}>
              Start Date
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label style={{ margin: 0 }}>
              End Date
              <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>

          <label style={{ margin: 0 }}>
            Discussion Output
            <textarea 
              rows="3" 
              placeholder="Summary of goals, scopes, or meeting outputs decided for this sprint..." 
              value={discussionOutput} 
              onChange={(e) => setDiscussionOutput(e.target.value)} 
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </label>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '15px', marginTop: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '16px', margin: 0 }}>Sprint Tasks</h3>
              <button 
                type="button" 
                className="btn outline small" 
                onClick={() => {
                  setTasksToCreate([...tasksToCreate, {
                    title: '',
                    description: '',
                    priority: 'medium',
                    story_points: 3,
                    assigned_to: '',
                    due_date: ''
                  }]);
                }}
              >
                + Add Task
              </button>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
              {tasksToCreate.map((t, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--line)', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--muted)' }}>
                      TASK #{idx + 1} &middot; {projects.find(p => p._id === selectedProjectId)?.key || 'PROJ'}-XXX
                    </span>
                    <button 
                      type="button" 
                      className="text-btn" 
                      style={{ color: 'var(--red)', fontSize: '11px' }}
                      onClick={() => {
                        const updated = [...tasksToCreate];
                        updated.splice(idx, 1);
                        setTasksToCreate(updated);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px' }}>
                    <label style={{ margin: 0 }}>
                      Task Name
                      <input 
                        type="text" 
                        required 
                        placeholder='e.g., Implement Login API'
                        value={t.title} 
                        onChange={(e) => {
                          const updated = [...tasksToCreate];
                          updated[idx].title = e.target.value;
                          setTasksToCreate(updated);
                        }} 
                      />
                    </label>
                    <label style={{ margin: 0 }}>
                      Priority
                      <select 
                        value={t.priority} 
                        onChange={(e) => {
                          const updated = [...tasksToCreate];
                          updated[idx].priority = e.target.value;
                          setTasksToCreate(updated);
                        }}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                    <label style={{ margin: 0 }}>
                      Story Points
                      <input 
                        type="number" 
                        min="0"
                        value={t.story_points} 
                        onChange={(e) => {
                          const updated = [...tasksToCreate];
                          updated[idx].story_points = parseInt(e.target.value) || 0;
                          setTasksToCreate(updated);
                        }} 
                      />
                    </label>
                    <label style={{ margin: 0 }}>
                      Assign To
                      <select 
                        value={t.assigned_to} 
                        onChange={(e) => {
                          const updated = [...tasksToCreate];
                          updated[idx].assigned_to = e.target.value;
                          setTasksToCreate(updated);
                        }}
                      >
                        <option value="">-- Unassigned --</option>
                        {employees.map(emp => (
                          <option key={emp._id} value={emp._id}>{emp.full_name} ({emp.role_name || 'SDE'})</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px', marginTop: '5px' }}>
                    <label style={{ margin: 0 }}>
                      Description
                      <input 
                        type="text" 
                        placeholder="Brief summary of task requirements..." 
                        value={t.description || ''} 
                        onChange={(e) => {
                          const updated = [...tasksToCreate];
                          updated[idx].description = e.target.value;
                          setTasksToCreate(updated);
                        }} 
                        style={{ fontSize: '12px' }}
                      />
                    </label>
                    <label style={{ margin: 0 }}>
                      Due Date
                      <input 
                        type="date" 
                        value={t.due_date || ''} 
                        onChange={(e) => {
                          const updated = [...tasksToCreate];
                          updated[idx].due_date = e.target.value;
                          setTasksToCreate(updated);
                        }} 
                        style={{ fontSize: '12px' }}
                      />
                    </label>
                  </div>
                </div>
              ))}
              {tasksToCreate.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', opacity: 0.5, border: '2px dashed var(--line)', borderRadius: '8px', fontSize: '13px' }}>
                  No initial tasks added. Click "+ Add Task" to allocate tasks to this sprint.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--line)', paddingTop: '15px', marginTop: '5px' }}>
            <button type="button" className="btn outline" onClick={() => setSprintModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={createSprintLoading}>
              {createSprintLoading ? 'Planning Sprint...' : 'Schedule Sprint'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectsSprints;
