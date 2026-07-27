import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const Profile = () => {
  const [employee, setEmployee] = useState(null);
  const [editing, setEditing] = useState(false);

  // Form states
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');
  const [certifications, setCertifications] = useState('');
  const [summary, setSummary] = useState('');

  const fetchProfile = async () => {
    try {
      const res = await apiRequest('/api/employees/me');
      if (res.ok) {
        const data = await res.json();
        setEmployee(data);
        setPhone(data.phone || '');
        setSkills(data.profile_data?.skills?.join(', ') || '');
        setCertifications(data.profile_data?.certifications?.join(', ') || '');
        setSummary(data.profile_data?.summary || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', 'Profile Photo');

    try {
      const res = await apiRequest('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        alert('Profile photo updated successfully!');
        fetchProfile();
      } else {
        const err = await res.json();
        alert(err.message || 'Upload failed');
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const updatedProfile = {
        ...employee.profile_data,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        certifications: certifications.split(',').map(c => c.trim()).filter(Boolean),
        summary: summary
      };

      const res = await apiRequest('/api/employees/me', {
        method: 'PATCH',
        body: JSON.stringify({
          phone: phone,
          profile_data: updatedProfile
        })
      });

      if (res.ok) {
        fetchProfile();
        setEditing(false);
        alert('Profile updated.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!employee) {
    return <div>Loading profile details...</div>;
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((x) => x[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">EMPLOYEE RECORD</span>
          <h1>My Profile</h1>
          <p>Manage personal, professional, skills, certification, and employment information.</p>
        </div>
        {!editing ? (
          <button className="btn outline" id="editProfile" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        ) : (
          <button className="btn outline" id="cancelEdit" onClick={() => { setEditing(false); fetchProfile(); }}>
            Cancel
          </button>
        )}
      </div>

      <div className="profile-layout">
        <aside className="panel profile-card">
          {employee.profile_pic ? (
            <img 
              src={employee.profile_pic.startsWith('http') ? employee.profile_pic : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${employee.profile_pic}`} 
              alt={employee.full_name} 
              style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto 15px' }}
            />
          ) : (
            <div className="large-avatar" style={{ overflow: 'hidden', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', borderRadius: '50%' }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
                <rect width="24" height="24" fill="#233138"/>
                <circle cx="12" cy="9.5" r="4.5" fill="#aebac1"/>
                <path d="M12 16C7.58 16 4 19.58 4 24H20C20 19.58 16.42 16 12 16Z" fill="#aebac1"/>
              </svg>
            </div>
          )}

          {editing && (
            <label className="btn outline small" style={{ cursor: 'pointer', display: 'block', margin: '0 auto 15px', width: 'fit-content', padding: '6px 12px', fontSize: '11px' }}>
              Change Photo
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handlePhotoUpload} 
              />
            </label>
          )}

          <h2>{employee.full_name}</h2>
          <p>{employee.designation}</p>
          <span className="pill success" style={{ textTransform: 'capitalize' }}>
            {employee.employment_status} Employee
          </span>
          <div className="profile-meta">
            <div>
              <small>Employee ID</small>
              <b>{employee.employee_code}</b>
            </div>
            <div>
              <small>Department</small>
              <b>{employee.department}</b>
            </div>
            <div>
              <small>Manager</small>
              <b>{employee.manager_name || 'None'}</b>
            </div>
            <div>
              <small>Joining Date</small>
              <b>{new Date(employee.joining_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</b>
            </div>
          </div>
        </aside>

        <article className="panel">
          <form id="profileForm" onSubmit={handleSave}>
            <div className="form-grid">
              <label>
                Work Email
                <input value={employee.work_email} disabled />
              </label>
              <label>
                Phone
                <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!editing} />
              </label>
              <label>
                Department
                <input value={employee.department} disabled />
              </label>
              <label>
                Manager
                <input value={employee.manager_name || 'None'} disabled />
              </label>
              <label>
                Skills (comma-separated)
                <input value={skills} onChange={(e) => setSkills(e.target.value)} disabled={!editing} />
              </label>
              <label>
                Certifications (comma-separated)
                <input value={certifications} onChange={(e) => setCertifications(e.target.value)} disabled={!editing} />
              </label>
              <label className="full-span">
                Professional Summary
                <textarea rows="5" value={summary} onChange={(e) => setSummary(e.target.value)} disabled={!editing} />
              </label>
            </div>
            {editing && (
              <button className="btn primary" id="saveProfile" type="submit">
                Save Changes
              </button>
            )}
          </form>
        </article>
      </div>
    </div>
  );
};

export default Profile;
