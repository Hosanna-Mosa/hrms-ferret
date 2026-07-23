import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const Performance = () => {
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('Q3 2026');

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await apiRequest('/api/performance/me');
        if (res.ok) {
          const data = await res.json();
          setReviews(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchReviews();
  }, []);

  const latestReview = reviews[0] || {
    attendance_score: 96.00,
    sprint_score: 89.00,
    task_score: 92.00,
    learning_score: 68.00,
    manager_rating: 4.40,
    manager_feedback: 'Consistently delivers high-quality work and collaborates well across the team. Focus next quarter on estimation and technical documentation.'
  };

  const getStarRating = (rating) => {
    const stars = Math.round(rating);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  };

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
          <small>23 of 25 tasks</small>
          <div className="progress">
            <i style={{ width: `${latestReview.task_score}%` }}></i>
          </div>
        </article>
        <article className="metric">
          <span>Learning Progress</span>
          <strong>{Math.round(latestReview.learning_score)}%</strong>
          <small>3 active courses</small>
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
