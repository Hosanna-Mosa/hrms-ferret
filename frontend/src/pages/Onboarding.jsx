import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Onboarding = () => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState('personal');
  const [onboardPct, setOnboardPct] = useState('0%');

  // Personal state
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [emergency, setEmergency] = useState('');
  const [address, setAddress] = useState('');

  // Bank state
  const [accHolder, setAccHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accNum, setAccNum] = useState('');
  const [routingNum, setRoutingNum] = useState('');

  // Documents state
  const [uploadedDocs, setUploadedDocs] = useState([]);

  // Policies checklist
  const [policiesCheck, setPoliciesCheck] = useState({
    hr: false,
    leave: false,
    wfh: false,
    security: false,
    conduct: false,
    it: false
  });

  const fetchProfileAndDocs = async () => {
    try {
      let empData = null;
      let docData = [];

      const res = await apiRequest('/api/employees/me');
      if (res.ok) {
        empData = await res.json();
        setFullName(empData.full_name || '');
        setPhone(empData.phone || '');
        setDob(empData.date_of_birth ? empData.date_of_birth.slice(0, 10) : '');
        setAddress(empData.address || '');
        if (empData.emergency_contact) {
          setEmergency(empData.emergency_contact.name || '');
        }

        if (empData.profile_data?.bank) {
          const bank = empData.profile_data.bank;
          setAccHolder(bank.holder || empData.full_name || '');
          setBankName(bank.name || '');
          setAccNum(bank.number || '');
          setRoutingNum(bank.routing || '');
        }
      }

      const docRes = await apiRequest('/api/documents/me');
      if (docRes.ok) {
        docData = await docRes.json();
        setUploadedDocs(docData);
      }

      // Calculate dynamic progress percentage
      let pct = 0;
      if (empData) {
        // Step 1: Personal Details
        if (empData.phone && empData.address && empData.date_of_birth && empData.emergency_contact?.name) {
          pct += 20;
        }
        // Step 3: Bank Details
        if (empData.profile_data?.bank?.name && empData.profile_data?.bank?.number) {
          pct += 20;
        }
      }
      // Step 2: Documents
      const reqUploads = ['Profile Photo', 'Aadhaar / Passport', 'PAN Card', 'Driving License', 'Education Certificates', 'Resume'];
      const uploadedReqCount = docData.filter(d => reqUploads.includes(d.document_type)).length;
      if (uploadedReqCount > 0) {
        pct += Math.min(20, Math.round((uploadedReqCount / reqUploads.length) * 20));
      }
      // Step 4: Agreements
      const agreementsUploaded = docData.filter(d => ['NDA', 'Employment Agreement'].includes(d.document_type)).length;
      if (agreementsUploaded > 0) {
        pct += Math.min(20, Math.round((agreementsUploaded / 2) * 20));
      }
      // Step 5: Policies
      const allPoliciesChecked = Object.values(policiesCheck).every(v => v);
      if (allPoliciesChecked) {
        pct += 20;
      }

      setOnboardPct(`${pct}%`);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProfileAndDocs();
  }, []);

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/employees/me', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: fullName,
          date_of_birth: dob,
          phone: phone,
          emergency_contact: { name: emergency },
          address: address
        })
      });
      if (res.ok) {
        alert('Personal details saved.');
        setActiveStep('documents');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', type);

    try {
      const res = await apiRequest('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        fetchProfileAndDocs();
        alert(`${type} uploaded successfully!`);
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    try {
      // Get existing profile data
      const empRes = await apiRequest('/api/employees/me');
      let currentProfileData = {};
      if (empRes.ok) {
        const emp = await empRes.json();
        currentProfileData = emp.profile_data || {};
      }

      const updatedProfile = {
        ...currentProfileData,
        bank: {
          holder: accHolder,
          name: bankName,
          number: accNum,
          routing: routingNum
        }
      };

      const res = await apiRequest('/api/employees/me', {
        method: 'PATCH',
        body: JSON.stringify({ profile_data: updatedProfile })
      });
      if (res.ok) {
        alert('Bank details saved.');
        setActiveStep('agreements');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePoliciesSubmit = (e) => {
    e.preventDefault();
    const allChecked = Object.values(policiesCheck).every(v => v);
    if (!allChecked) {
      alert('Please read and acknowledge all company policies.');
      return;
    }
    setOnboardPct('100%');
    alert('Onboarding checklist completed! Your documentation has been submitted for HR auditing.');
  };

  const isDocUploaded = (type) => {
    return uploadedDocs.some(d => d.document_type === type);
  };

  const personalSteps = [
    { key: 'personal', num: 1, title: 'Personal Details', desc: 'Identity and contacts' },
    { key: 'documents', num: 2, title: 'Documents', desc: 'Identity and education' },
    { key: 'bank', num: 3, title: 'Bank Details', desc: 'Payroll information' },
    { key: 'agreements', num: 4, title: 'Agreements', desc: 'Offer, NDA, contract' },
    { key: 'policies', num: 5, title: 'Policies', desc: 'Read and acknowledge' }
  ];

  const uploadsList = ['Profile Photo', 'Aadhaar / Passport', 'PAN Card', 'Driving License', 'Education Certificates', 'Resume'];
  const policiesList = [
    { key: 'hr', name: 'HR Policy', desc: 'I have read and agree to this policy.' },
    { key: 'leave', name: 'Leave Policy', desc: 'I have read and agree to this policy.' },
    { key: 'wfh', name: 'Work From Home Policy', desc: 'I have read and agree to this policy.' },
    { key: 'security', name: 'Security Policy', desc: 'I have read and agree to this policy.' },
    { key: 'conduct', name: 'Code of Conduct', desc: 'I have read and agree to this policy.' },
    { key: 'it', name: 'IT Usage Policy', desc: 'I have read and agree to this policy.' }
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">NEW EMPLOYEE JOURNEY</span>
          <h1>Onboarding</h1>
          <p>Complete employee records, document verification, bank details, and policy acknowledgement.</p>
        </div>
        <div className="completion-ring">
          <strong id="onboardPct">{onboardPct}</strong>
          <small>Complete</small>
        </div>
      </div>

      <div className="wizard">
        <aside className="steps panel" id="onboardSteps">
          {personalSteps.map(step => (
            <button 
              key={step.key} 
              className={activeStep === step.key ? 'active' : ''} 
              onClick={() => setActiveStep(step.key)}
            >
              <span>{step.num}</span>
              <div>
                <b>{step.title}</b>
                <small>{step.desc}</small>
              </div>
            </button>
          ))}
        </aside>

        <article className="panel wizard-content">
          {activeStep === 'personal' && (
            <form id="onboardForm" onSubmit={handlePersonalSubmit}>
              <div className="step-pane active">
                <h3>Personal Details</h3>
                <p>Provide complete and accurate employee information.</p>
                <div className="form-grid">
                  <label>Full Name<input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
                  <label>Date of Birth<input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required /></label>
                  <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
                  <label>Emergency Contact<input value={emergency} onChange={(e) => setEmergency(e.target.value)} required /></label>
                  <label className="full-span">Address<textarea rows="3" value={address} onChange={(e) => setAddress(e.target.value)} required /></label>
                </div>
              </div>
              <div className="actions right border-top">
                <button type="button" className="btn outline" onClick={() => alert('Draft saved.')}>Save Draft</button>
                <button className="btn primary" type="submit">Save & Continue</button>
              </div>
            </form>
          )}

          {activeStep === 'documents' && (
            <div>
              <div className="step-pane active">
                <h3>Identity & Education Documents</h3>
                <p>Upload required documents for HR verification.</p>
                <div className="upload-grid" id="uploadGrid">
                  {uploadsList.map(type => {
                    const uploaded = isDocUploaded(type);
                    return (
                      <label className="upload-box" key={type} style={{ cursor: 'pointer', border: uploaded ? '1px solid var(--green)' : '' }}>
                        <input type="file" onChange={(e) => handleFileUpload(e, type)} />
                        <span>{uploaded ? '✓' : '＋'}</span>
                        <b>{type}</b>
                        <small>{uploaded ? 'Uploaded (Review Pending)' : 'PDF, JPG or PNG'}</small>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="actions right border-top">
                <button className="btn primary" onClick={() => setActiveStep('bank')}>Continue</button>
              </div>
            </div>
          )}

          {activeStep === 'bank' && (
            <form onSubmit={handleBankSubmit}>
              <div className="step-pane active">
                <h3>Bank Details</h3>
                <p>Used only for salary and reimbursements.</p>
                <div className="form-grid">
                  <label>Account Holder<input value={accHolder} onChange={(e) => setAccHolder(e.target.value)} required /></label>
                  <label>Bank Name<input placeholder="Enter bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} required /></label>
                  <label>Account Number<input placeholder="Enter account number" value={accNum} onChange={(e) => setAccNum(e.target.value)} required /></label>
                  <label>IFSC / Routing Number<input placeholder="Enter code" value={routingNum} onChange={(e) => setRoutingNum(e.target.value)} required /></label>
                </div>
              </div>
              <div className="actions right border-top">
                <button className="btn primary" type="submit">Save & Continue</button>
              </div>
            </form>
          )}

          {activeStep === 'agreements' && (
            <div>
              <div className="step-pane active">
                <h3>Employment Agreements</h3>
                <p>Review and upload signed company agreements.</p>
                <div className="document-check">
                  <span>Offer Letter</span>
                  <b className="ok">Uploaded</b>
                </div>
                <div className="document-check">
                  <span>NDA</span>
                  {isDocUploaded('NDA') ? (
                    <b className="ok">Uploaded</b>
                  ) : (
                    <label className="btn outline small" style={{ margin: 0, padding: '6px 12px', display: 'inline-block', cursor: 'pointer' }}>
                      Upload
                      <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'NDA')} />
                    </label>
                  )}
                </div>
                <div className="document-check">
                  <span>Employment Agreement</span>
                  {isDocUploaded('Employment Agreement') ? (
                    <b className="ok">Uploaded</b>
                  ) : (
                    <label className="btn outline small" style={{ margin: 0, padding: '6px 12px', display: 'inline-block', cursor: 'pointer' }}>
                      Upload
                      <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'Employment Agreement')} />
                    </label>
                  )}
                </div>
              </div>
              <div className="actions right border-top">
                <button className="btn primary" onClick={() => setActiveStep('policies')}>Continue</button>
              </div>
            </div>
          )}

          {activeStep === 'policies' && (
            <form onSubmit={handlePoliciesSubmit}>
              <div className="step-pane active">
                <h3>Company Policies</h3>
                <p>Read every policy and acknowledge your agreement.</p>
                <div id="policyList" className="policy-list">
                  {policiesList.map(pol => (
                    <label key={pol.key} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input 
                        className="policy-check" 
                        type="checkbox" 
                        checked={policiesCheck[pol.key]} 
                        onChange={(e) => setPoliciesCheck({ ...policiesCheck, [pol.key]: e.target.checked })} 
                      />
                      <div>
                        <b>{pol.name}</b>
                        <small>{pol.desc}</small>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="actions right border-top">
                <button className="btn primary" type="submit">Complete Onboarding</button>
              </div>
            </form>
          )}
        </article>
      </div>
    </div>
  );
};

export default Onboarding;
