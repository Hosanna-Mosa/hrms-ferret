import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const Announcements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('Company Update');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const isAdmin = user && user.role === 'HR Admin';

  const fetchAnnouncements = async () => {
    try {
      const res = await apiRequest('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/announcements/admin', {
        method: 'POST',
        body: JSON.stringify({ category, title, body: message })
      });
      if (res.ok) {
        fetchAnnouncements();
        setModalOpen(false);
        setTitle('');
        setMessage('');
        alert('Announcement published.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await apiRequest(`/api/announcements/admin/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAnnouncements();
        alert('Announcement deleted.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">COMPANY COMMUNICATION</span>
          <h1>Announcements</h1>
          <p>Company updates, holidays, events, birthdays, and new joiners.</p>
        </div>
        {isAdmin && (
          <button className="btn primary admin-only" onClick={() => setModalOpen(true)}>
            + Publish Announcement
          </button>
        )}
      </div>

      <div className="announcement-grid">
        <article className="featured-announcement">
          <span>COMPANY UPDATE</span>
          <h2>Welcome to Ferret PeopleOS</h2>
          <p>Our new employee experience platform brings attendance, onboarding, leave, tasks, training, and HR services into one secure workspace.</p>
          <small>Published by HR · July 19, 2026</small>
        </article>

        <div id="announcementList" className="announcement-stack">
          {announcements.map((ann) => (
            <article className="ann-card" key={ann.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{ann.category?.toUpperCase()}</span>
                {isAdmin && (
                  <button 
                    className="text-btn" 
                    onClick={() => handleDelete(ann.id)} 
                    style={{ color: 'var(--red)', fontSize: '9px' }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <h3>{ann.title}</h3>
              <p>{ann.body}</p>
              <small>Published by {ann.author_name || 'HR'}</small>
            </article>
          ))}

          {announcements.length === 0 && (
            <>
              <article className="ann-card">
                <span>HOLIDAY</span>
                <h3>Independence Day Holiday</h3>
                <p>Office will remain closed on August 15.</p>
                <small>Published by HR</small>
              </article>
              <article className="ann-card">
                <span>EVENT</span>
                <h3>Monthly All-Hands</h3>
                <p>Join the company-wide meeting this Friday at 4 PM.</p>
                <small>Published by HR</small>
              </article>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <h2>Publish Announcement</h2>
        <form id="announcementForm" onSubmit={handleSubmit}>
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Company Update</option>
              <option>Holiday</option>
              <option>Event</option>
              <option>Birthday</option>
              <option>New Joiner</option>
            </select>
          </label>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Message
            <textarea rows="5" value={message} onChange={(e) => setMessage(e.target.value)} required />
          </label>
          <button className="btn primary full" type="submit">
            Publish
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Announcements;
