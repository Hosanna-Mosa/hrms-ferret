import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const Training = () => {
  const [courses, setCourses] = useState([]);

  const fetchCourses = async () => {
    try {
      const res = await apiRequest('/api/training/me');
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleContinueCourse = async (courseAss) => {
    const nextProgress = Math.min(100, courseAss.progress_percent + 25);
    try {
      const res = await apiRequest(`/api/training/${courseAss.id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ progress_percent: nextProgress })
      });
      if (res.ok) {
        fetchCourses();
        alert(`Course progress updated to ${nextProgress}%`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const completedCount = courses.filter(c => c.progress_percent === 100).length;
  const inProgressCount = courses.filter(c => c.progress_percent > 0 && c.progress_percent < 100).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">LEARNING & DEVELOPMENT</span>
          <h1>Training Portal</h1>
          <p>Assigned courses, videos, documents, quizzes, and certificates.</p>
        </div>
        <button className="btn outline" onClick={() => alert(`Available certificates to download: ${completedCount}`)}>
          My Certificates
        </button>
      </div>

      <div className="metrics three">
        <article className="metric">
          <span>Assigned Courses</span>
          <strong>{courses.length || 6}</strong>
          <small>{inProgressCount} in progress</small>
        </article>
        <article className="metric">
          <span>Completed</span>
          <strong>{completedCount}</strong>
          <small>All-time courses</small>
        </article>
        <article className="metric">
          <span>Certificates</span>
          <strong>{completedCount}</strong>
          <small>Available to download</small>
        </article>
      </div>

      <div className="course-grid" id="courseGrid">
        {courses.map((c) => (
          <article className="course-card" key={c.id}>
            <div className="course-cover">
              <span>FERRET LEARNING</span>
            </div>
            <div className="course-body">
              <h3>{c.title}</h3>
              <p>{c.course_type} · {c.duration_minutes} min</p>
              <div className="course-meta">
                <span>{c.progress_percent}% complete</span>
                <span>{c.progress_percent === 100 ? 'Certificate' : 'In progress'}</span>
              </div>
              <div className="progress">
                <i style={{ width: `${c.progress_percent}%` }}></i>
              </div>
              <button 
                className={`btn ${c.progress_percent === 100 ? 'outline' : 'primary'} full small course-btn`} 
                style={{ marginTop: '13px' }}
                onClick={() => handleContinueCourse(c)}
              >
                {c.progress_percent === 100 ? 'View Certificate' : 'Continue Course'}
              </button>
            </div>
          </article>
        ))}

        {courses.length === 0 && (
          <>
            <article className="course-card">
              <div className="course-cover"><span>FERRET LEARNING</span></div>
              <div className="course-body">
                <h3>Information Security Essentials</h3>
                <p>Video · 45 min</p>
                <div className="course-meta"><span>72% complete</span><span>In progress</span></div>
                <div className="progress"><i style={{ width: '72%' }}></i></div>
                <button className="btn primary full small course-btn" style={{ marginTop: '13px' }}>Continue Course</button>
              </div>
            </article>
            <article className="course-card">
              <div className="course-cover"><span>FERRET LEARNING</span></div>
              <div className="course-body">
                <h3>Ferret Code of Conduct</h3>
                <p>Document + Quiz</p>
                <div className="course-meta"><span>100% complete</span><span>Certificate</span></div>
                <div className="progress"><i style={{ width: '100%' }}></i></div>
                <button className="btn outline full small course-btn" style={{ marginTop: '13px' }}>View Certificate</button>
              </div>
            </article>
          </>
        )}
      </div>
    </div>
  );
};

export default Training;
