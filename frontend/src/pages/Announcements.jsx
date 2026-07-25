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
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().substring(0, 10));

  const isAdmin = user && ['HR', 'SuperAdmin', 'Manager'].includes(user.role);

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
        body: JSON.stringify({ category, title, body: message, published_at: publishedAt })
      });
      if (res.ok) {
        fetchAnnouncements();
        setModalOpen(false);
        setTitle('');
        setMessage('');
        setPublishedAt(new Date().toISOString().substring(0, 10));
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
        {announcements.length > 0 ? (
          <article className="featured-announcement">
            <span>{announcements[0].category?.toUpperCase() || 'COMPANY UPDATE'}</span>
            <h2>{announcements[0].title}</h2>
            <p>{announcements[0].body}</p>
            <small>Published by {announcements[0].author_name || 'HR'} · {new Date(announcements[0].published_at || announcements[0].createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</small>
          </article>
        ) : (
          <article className="featured-announcement">
            <span>ANNOUNCEMENTS</span>
            <h2>No Announcements</h2>
            <p>There are no company updates published at the moment.</p>
          </article>
        )}

        <div id="announcementList" className="announcement-stack">
          {announcements.slice(1).map((ann) => (
            <article className="ann-card" key={ann._id || ann.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{ann.category?.toUpperCase()}</span>
                {isAdmin && (
                  <button 
                    className="text-btn" 
                    onClick={() => handleDelete(ann._id || ann.id)} 
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

          {announcements.length <= 1 && (
            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.7, fontSize: '11px', background: '#fff', borderRadius: '13px', border: '1px solid var(--line)' }}>
              No other announcements.
            </div>
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
            Publish Date
            <input type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} required />
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
