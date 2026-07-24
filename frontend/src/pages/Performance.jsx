import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Performance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('Q3 2026');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      setLoading(true);
      try {
        if (user && ['HR', 'SuperAdmin'].includes(user.role)) {
          const res = await apiRequest('/api/performance/all');
          if (res.ok) {
            const data = await res.json();
            setAllReviews(data);
          }
        } else {
          const res = await apiRequest('/api/performance/me');
          if (res.ok) {
            const data = await res.json();
            setReviews(data);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchPerformanceData();
    }
  }, [user]);

  const getStarRating = (rating) => {
    const stars = Math.min(5, Math.max(0, Math.round(rating)));
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  };

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '80vh', fontWeight: 'bold' }}>Loading performance data...</div>;
  }

  const isHrOrAdmin = user && ['HR', 'SuperAdmin'].includes(user.role);

  // Render HR / SuperAdmin View
  if (isHrOrAdmin) {
    const filteredAll = allReviews.filter(r => r.review_period === activeTab);

    // Calculate company-wide averages
    const avgAttendance = filteredAll.length > 0 ? filteredAll.reduce((acc, curr) => acc + curr.attendance_score, 0) / filteredAll.length : 0;
    const avgSprint = filteredAll.length > 0 ? filteredAll.reduce((acc, curr) => acc + curr.sprint_score, 0) / filteredAll.length : 0;
    const avgTask = filteredAll.length > 0 ? filteredAll.reduce((acc, curr) => acc + curr.task_score, 0) / filteredAll.length : 0;
    const avgRating = filteredAll.length > 0 ? filteredAll.reduce((acc, curr) => acc + curr.manager_rating, 0) / filteredAll.length : 0;

    // Separate into SDEs (employees) and Managers
    const sdeReviews = filteredAll.filter(r => r.employee_id && r.employee_id.role_name === 'Employee');
    const managerReviews = filteredAll.filter(r => r.employee_id && (r.employee_id.role_name === 'Manager' || r.employee_id.role_name === 'HR'));

    return (
      <div>
        <div className="page-head">
          <div>
            <span className="eyebrow">ENTERPRISE PERFORMANCE</span>
            <h1>Company Growth Dashboard</h1>
            <p>Monitor employee-wise and manager-wise performance metrics, average completion scores, and feedback reviews.</p>
          </div>
          <div className="segmented">
            <button className={activeTab === 'Q3 2026' ? 'active' : ''} onClick={() => setActiveTab('Q3 2026')}>Q3 2026</button>
            <button className={activeTab === 'Q2 2026' ? 'active' : ''} onClick={() => setActiveTab('Q2 2026')}>Q2 2026</button>
          </div>
        </div>

        {/* Company metrics */}
        <div className="metrics four">
          <article className="metric">
            <span>Avg Attendance</span>
            <strong>{Math.round(avgAttendance)}%</strong>
            <small>Across company</small>
            <div className="progress">
              <i style={{ width: `${avgAttendance}%` }}></i>
            </div>
          </article>
          <article className="metric">
            <span>Avg Sprint Completion</span>
            <strong>{Math.round(avgSprint)}%</strong>
            <small>Agile efficiency</small>
            <div className="progress">
              <i style={{ width: `${avgSprint}%` }}></i>
            </div>
          </article>
          <article className="metric">
            <span>Avg Task Completion</span>
            <strong>{Math.round(avgTask)}%</strong>
            <small>Done targets</small>
            <div className="progress">
              <i style={{ width: `${avgTask}%` }}></i>
            </div>
          </article>
          <article className="metric">
            <span>Avg Manager Rating</span>
            <strong>{avgRating.toFixed(1)} / 5.0</strong>
            <small>Overall feedback</small>
            <div className="progress">
              <i style={{ width: `${avgRating * 20}%` }}></i>
            </div>
          </article>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Employee-wise Reviews */}
          <article className="panel table-panel active">
            <div className="panel-head pad">
              <div>
                <h3>Employee-wise Performance ({sdeReviews.length})</h3>
                <p>Growth reviews and scores for standard SDE employees. Click a row to view their dashboard profile.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Employee Name</th>
                    <th>Designation</th>
                    <th>Attendance</th>
                    <th>Sprint</th>
                    <th>Tasks Done</th>
                    <th>Rating</th>
                    <th>Feedback Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {sdeReviews.map((r) => (
                    <tr 
                      key={r._id}
                      onClick={() => navigate(`/employee-detail/${r.employee_id?._id}`)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view full employee dashboard"
                    >
                      <td><code>{r.employee_id?.employee_code || 'N/A'}</code></td>
                      <td><b>{r.employee_id?.full_name || 'Unknown'}</b></td>
                      <td>{r.employee_id?.designation || 'Software Engineer'}</td>
                      <td>{Math.round(r.attendance_score)}%</td>
                      <td>{Math.round(r.sprint_score)}%</td>
                      <td>{Math.round(r.task_score)}%</td>
                      <td>
                        <span style={{ color: '#f0a500', fontWeight: 'bold' }}>
                          ★ {parseFloat(r.manager_rating).toFixed(1)}
                        </span>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.manager_feedback || 'No comments'}
                      </td>
                    </tr>
                  ))}
                  {sdeReviews.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', opacity: 0.7, padding: '25px' }}>No employee reviews recorded for this quarter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {/* Manager-wise Reviews */}
          <article className="panel table-panel active">
            <div className="panel-head pad">
              <div>
                <h3>Manager-wise Performance ({managerReviews.length})</h3>
                <p>Growth reviews and scores for project leads and operations managers. Click a row to view their team metrics.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Manager Name</th>
                    <th>Designation</th>
                    <th>Attendance</th>
                    <th>Sprint</th>
                    <th>Tasks Done</th>
                    <th>Rating</th>
                    <th>Feedback Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {managerReviews.map((r) => (
                    <tr 
                      key={r._id}
                      onClick={() => navigate(`/manager-detail/${r.employee_id?._id}`)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view full manager details"
                    >
                      <td><code>{r.employee_id?.employee_code || 'N/A'}</code></td>
                      <td><b>{r.employee_id?.full_name || 'Unknown'}</b></td>
                      <td>{r.employee_id?.designation || 'Project Manager'}</td>
                      <td>{Math.round(r.attendance_score)}%</td>
                      <td>{Math.round(r.sprint_score)}%</td>
                      <td>{Math.round(r.task_score)}%</td>
                      <td>
                        <span style={{ color: '#f0a500', fontWeight: 'bold' }}>
                          ★ {parseFloat(r.manager_rating).toFixed(1)}
                        </span>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.manager_feedback || 'No comments'}
                      </td>
                    </tr>
                  ))}
                  {managerReviews.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', opacity: 0.7, padding: '25px' }}>No manager reviews recorded for this quarter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </div>
    );
  }

  // Render Employee Personal View
  const latestReview = reviews[0];

  if (!latestReview) {
    return (
      <div>
        <div className="page-head">
          <div>
            <span className="eyebrow">GROWTH & FEEDBACK</span>
            <h1>Performance Dashboard</h1>
            <p>Track attendance, sprint contribution, tasks, feedback, and learning progress.</p>
          </div>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.7, background: '#fff', borderRadius: '14px', border: '1px solid var(--line)' }}>
          No performance reviews recorded yet.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">GROWTH & FEEDBACK</span>
          <h1>Performance Dashboard</h1>
          <p>Track attendance, sprint contribution, tasks, feedback, and learning progress.</p>
        </div>
        <div className="segmented">
          <button className={activeTab === 'Q3 2026' ? 'active' : ''} onClick={() => setActiveTab('Q3 2026')}>Q3 2026</button>
          <button className={activeTab === 'Q2 2026' ? 'active' : ''} onClick={() => setActiveTab('Q2 2026')}>Q2 2026</button>
        </div>
      </div>

      <div className="metrics four">
        <article className="metric">
          <span>Attendance</span>
          <strong>{Math.round(latestReview.attendance_score)}%</strong>
          <small>Target: 95%</small>
          <div className="progress">
            <i style={{ width: `${latestReview.attendance_score}%` }}></i>
          </div>
        </article>
        <article className="metric">
          <span>Sprint Completion</span>
          <strong>{Math.round(latestReview.sprint_score)}%</strong>
          <small>Target: 85%</small>
          <div className="progress">
            <i style={{ width: `${latestReview.sprint_score}%` }}></i>
          </div>
        </article>
        <article className="metric">
          <span>Task Completion</span>
          <strong>{Math.round(latestReview.task_score)}%</strong>
          <small>In-quarter targets</small>
          <div className="progress">
            <i style={{ width: `${latestReview.task_score}%` }}></i>
          </div>
        </article>
        <article className="metric">
          <span>Learning Progress</span>
          <strong>{Math.round(latestReview.learning_score)}%</strong>
          <small>Active courses</small>
          <div className="progress">
            <i style={{ width: `${latestReview.learning_score}%` }}></i>
          </div>
        </article>
      </div>

      <div className="grid two">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Manager Feedback</h3>
              <p>Latest review summary.</p>
            </div>
            <span className="score">{parseFloat(latestReview.manager_rating).toFixed(1)}</span>
          </div>
          <div className="rating-row">
            <span>Quality of Work</span>
            <div style={{ color: '#f0a500', letterSpacing: '2px' }}>{getStarRating(latestReview.manager_rating)}</div>
          </div>
          <div className="rating-row">
            <span>Delivery</span>
            <div style={{ color: '#f0a500', letterSpacing: '2px' }}>{getStarRating(latestReview.manager_rating - 0.4)}</div>
          </div>
          <div className="rating-row">
            <span>Collaboration</span>
            <div style={{ color: '#f0a500', letterSpacing: '2px' }}>{getStarRating(latestReview.manager_rating + 0.2)}</div>
          </div>
          <div className="rating-row">
            <span>Communication</span>
            <div style={{ color: '#f0a500', letterSpacing: '2px' }}>{getStarRating(latestReview.manager_rating - 0.2)}</div>
          </div>
          <blockquote>
            “{latestReview.manager_feedback}”
          </blockquote>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Goals</h3>
              <p>Quarterly objectives.</p>
            </div>
          </div>
          <div className="goal">
            <div><b>Complete Employee Portal MVP</b><span>85%</span></div>
            <div className="progress">
              <i style={{ width: '85%' }}></i>
            </div>
          </div>
          <div className="goal">
            <div><b>Finish ServiceNow certification</b><span>60%</span></div>
            <div className="progress">
              <i style={{ width: '60%' }}></i>
            </div>
          </div>
          <div className="goal">
            <div><b>Mentor SDE interns</b><span>40%</span></div>
            <div className="progress">
              <i style={{ width: '40%' }}></i>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default Performance;
