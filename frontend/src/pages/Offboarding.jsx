import React, { useState } from 'react';

const Offboarding = () => {
  const [lwd, setLwd] = useState('');
  const [reason, setReason] = useState('Resignation');
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    alert('Offboarding request submitted to manager and HR.');
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">EMPLOYEE EXIT</span>
          <h1>Offboarding</h1>
          <p>Structured exit workflow for resignation, clearance, assets, access, and final settlement.</p>
        </div>
        <span className={`pill ${submitted ? 'warning' : 'neutral'}`}>
          {submitted ? 'Request Submitted' : 'Not Initiated'}
        </span>
      </div>

      <div className="grid two">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Start Offboarding Request</h3>
              <p>Submit resignation or exit request.</p>
            </div>
          </div>
          <form id="offboardForm" onSubmit={handleSubmit}>
            <label>
              Last Working Date
              <input 
                type="date" 
                value={lwd} 
                onChange={(e) => setLwd(e.target.value)} 
                required 
                disabled={submitted}
              />
            </label>
            <label>
              Reason
              <select 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                disabled={submitted}
              >
                <option>Resignation</option>
                <option>End of Contract</option>
                <option>Role Change</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Comments
              <textarea 
                rows="5" 
                placeholder="Add reason and handover details..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                required
                disabled={submitted}
              />
            </label>
            {!submitted && (
              <button className="btn primary" type="submit">
                Submit Offboarding Request
              </button>
            )}
          </form>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Exit Checklist</h3>
              <p>Completed after request approval.</p>
            </div>
          </div>
          <div className="checklist">
            <label><input type="checkbox" disabled checked={submitted} /> Knowledge transfer completed</label>
            <label><input type="checkbox" disabled /> Company assets returned</label>
            <label><input type="checkbox" disabled /> System access revoked</label>
            <label><input type="checkbox" disabled /> Manager clearance</label>
            <label><input type="checkbox" disabled /> HR exit interview</label>
            <label><input type="checkbox" disabled /> Final settlement processed</label>
            <label><input type="checkbox" disabled /> Experience letter issued</label>
          </div>
        </article>
      </div>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h3>Offboarding Workflow</h3>
            <p>What happens after submission.</p>
          </div>
        </div>
        <div className="workflow">
          <div className={submitted ? 'done' : ''}>
            <span>1</span>
            <b>Employee Request</b>
            <small>Submit resignation</small>
          </div>
          <i></i>
          <div>
            <span>2</span>
            <b>Manager Review</b>
            <small>Approve LWD and handover</small>
          </div>
          <i></i>
          <div>
            <span>3</span>
            <b>HR Clearance</b>
            <small>Documents and exit interview</small>
          </div>
          <i></i>
          <div>
            <span>4</span>
            <b>IT & Assets</b>
            <small>Return assets and revoke access</small>
          </div>
          <i></i>
          <div>
            <span>5</span>
            <b>Final Settlement</b>
            <small>Payroll and experience letter</small>
          </div>
        </div>
      </article>
    </div>
  );
};

export default Offboarding;
