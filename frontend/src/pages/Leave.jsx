import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const Leave = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  
  // SDE Apply fields
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const isManager = user?.role === 'Manager';
  const isAdminOrManager = user && ['Manager', 'HR', 'SuperAdmin'].includes(user.role);

  const fetchLeaves = async () => {
    try {
      const endpoint = isAdminOrManager ? '/api/leave/manager/all' : '/api/leave/me';
      const res = await apiRequest(endpoint);
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeaves();
    }
  }, [user]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/leave', {
        method: 'POST',
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason: reason
        })
      });
      if (res.ok) {
        fetchLeaves();
        setModalOpen(false);
        setStartDate('');
        setEndDate('');
        setReason('');
        alert('Leave request submitted successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelLeave = async (id) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      const res = await apiRequest(`/api/leave/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchLeaves();
        alert('Leave request cancelled successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveLeave = async (id, status) => {
    if (!confirm(`Are you sure you want to mark this request as ${status}?`)) return;
    try {
      const res = await apiRequest(`/api/leave/manager/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchLeaves();
        alert(`Leave request ${status} successfully.`);
      } else {
        const err = await res.json();
        alert(err.message || 'Action failed.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDateRange = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString([], { month: 'short', day: 'numeric' })}–${e.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  const getDaysCount = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(1, Math.round((e - s) / 86400000) + 1);
  };

  // Leave Allowance Metrics (Only for standard employees)
  const totalCasualAllowed = 10;
  const totalSickAllowed = 5;

  let approvedCasual = 0;
  let approvedSick = 0;

  leaves.forEach(l => {
    if (l.status === 'approved') {
      const days = getDaysCount(l.start_date, l.end_date);
      if (l.leave_type === 'Sick Leave') {
        approvedSick += days;
      } else {
        approvedCasual += days;
      }
    }
  });

  const remainingCasual = Math.max(0, totalCasualAllowed - approvedCasual);
  const remainingSick = Math.max(0, totalSickAllowed - approvedSick);
  const usedCount = approvedCasual + approvedSick;
  const pendingCount = leaves.filter(l => l.status === 'pending').length;

  if (isAdminOrManager) {
    return (
      <div>
        <div className="page-head">
          <div>
            <span className="eyebrow">TEAM MANAGEMENT</span>
            <h1>Leave Approvals</h1>
            <p>Review and authorize leave requests submitted by SDEs reporting to you.</p>
          </div>
        </div>

        <div className="metrics three" style={{ marginBottom: '22px' }}>
          <article className="metric">
            <span>Pending Requests</span>
            <strong style={{ color: 'var(--amber)' }}>{pendingCount}</strong>
            <small>Requires action</small>
          </article>
          <article className="metric">
            <span>Approved Requests</span>
            <strong style={{ color: 'var(--green)' }}>
              {leaves.filter(l => l.status === 'approved').length}
            </strong>
            <small>Current month</small>
          </article>
          <article className="metric">
            <span>Total Requests</span>
            <strong>{leaves.length}</strong>
            <small>All time</small>
          </article>
        </div>

        <article className="panel table-panel active">
          <div className="panel-head pad">
            <div>
              <h3>Team Leave Requests</h3>
              <p>Resolve SDE leave applications.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Leave Type</th>
                  <th>Dates Requested</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr 
                    key={l._id}
                    onClick={(e) => {
                      if (e.target.closest('button')) return;
                      navigate(`/employee-detail/${l.employee_id?._id || l.employee_id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Click to view employee work & attendance profile"
                  >
                    <td><b>{l.full_name || 'Team SDE'}</b></td>
                    <td>{l.leave_type}</td>
                    <td>{formatDateRange(l.start_date, l.end_date)}</td>
                    <td>{getDaysCount(l.start_date, l.end_date)}</td>
                    <td><span style={{ fontSize: '10px', color: '#555' }}>{l.reason || 'No reason provided.'}</span></td>
                    <td>
                      <span className={`pill ${
                        l.status === 'approved' ? 'success' : 
                        l.status === 'pending' ? 'warning' : 'danger'
                      }`}>
                        {l.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {l.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn primary small" 
                            style={{ background: 'var(--green)', borderColor: 'var(--green)' }}
                            onClick={() => handleResolveLeave(l._id, 'approved')}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn primary small" 
                            style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
                            onClick={() => handleResolveLeave(l._id, 'rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', opacity: 0.7, padding: '40px' }}>
                      No incoming leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">TIME OFF</span>
          <h1>Leave Management</h1>
          <p>Apply, cancel, track approvals, and view leave and holiday calendars.</p>
        </div>
        <button className="btn primary" id="openLeave" onClick={() => setModalOpen(true)}>
          + Apply Leave
        </button>
      </div>

      <div className="metrics four">
        <article className="metric">
          <span>Casual Leave</span>
          <strong>{remainingCasual}</strong>
          <small>Available days</small>
        </article>
        <article className="metric">
          <span>Sick Leave</span>
          <strong>{remainingSick}</strong>
          <small>Available days</small>
        </article>
        <article className="metric">
          <span>Used</span>
          <strong>{usedCount}</strong>
          <small>Current year</small>
        </article>
        <article className="metric">
          <span>Pending</span>
          <strong id="pendingLeaves">{pendingCount}</strong>
          <small>Awaiting approval</small>
        </article>
      </div>

      <div className="grid two">
        <article className="panel table-panel">
          <div className="panel-head pad">
            <div>
              <h3>My Leave Requests</h3>
              <p>Current and past requests.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="leaveTable">
                {leaves.map((l) => (
                  <tr key={l._id}>
                    <td>{l.leave_type}</td>
                    <td>{formatDateRange(l.start_date, l.end_date)}</td>
                    <td>{getDaysCount(l.start_date, l.end_date)}</td>
                    <td>
                      <span className={`pill ${
                        l.status === 'approved' ? 'success' : 
                        l.status === 'pending' ? 'warning' : 'danger'
                      }`}>
                        {l.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {l.status === 'pending' ? (
                        <button className="text-btn cancel-leave" onClick={() => handleCancelLeave(l._id)}>
                          Cancel
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', opacity: 0.7, padding: '30px' }}>
                      No leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Holiday Calendar</h3>
              <p>Upcoming company holidays.</p>
            </div>
          </div>
          <div className="holiday">
            <div><b>15</b><small>AUG</small></div>
            <span>
              <strong>Independence Day</strong>
              <small>Saturday</small>
            </span>
          </div>
          <div className="holiday">
            <div><b>27</b><small>AUG</small></div>
            <span>
              <strong>Ganesh Chaturthi</strong>
              <small>Thursday</small>
            </span>
          </div>
          <div className="holiday">
            <div><b>02</b><small>OCT</small></div>
            <span>
              <strong>Gandhi Jayanti</strong>
              <small>Friday</small>
            </span>
          </div>
        </article>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <h2>Apply Leave</h2>
        <p>Submit a leave request for manager approval.</p>
        <form id="leaveForm" onSubmit={handleApplyLeave}>
          <label>
            Leave Type
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
          </label>
          <div className="form-grid">
            <label>
              Start Date
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </label>
            <label>
              End Date
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </label>
          </div>
          <label>
            Reason
            <textarea 
              rows="4" 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              required 
            />
          </label>
          <button className="btn primary full" type="submit">
            Submit Request
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Leave;
