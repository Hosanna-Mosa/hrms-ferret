import React, { useState } from 'react';

const Documents = () => {
  const [activeTab, setActiveTab] = useState('All');

  const docs = [
    { name: 'Offer Letter', category: 'Employment', size: 'PDF · 248 KB' },
    { name: 'Appointment Letter', category: 'Employment', size: 'PDF · 312 KB' },
    { name: 'HR Policy', category: 'Policies', size: 'PDF · 1.2 MB' },
    { name: 'Employee Handbook', category: 'Policies', size: 'PDF · 2.4 MB' },
    { name: 'Holiday List 2026', category: 'Policies', size: 'PDF · 184 KB' },
    { name: 'June Salary Slip', category: 'Payroll', size: 'PDF · 226 KB' },
    { name: 'Form 16 / Tax Document', category: 'Tax', size: 'PDF · 475 KB' }
  ];

  const handleDownload = (name) => {
    alert(`Downloading ${name}... (In production, this triggers S3 download url)`);
  };

  const filteredDocs = activeTab === 'All' 
    ? docs 
    : docs.filter(d => d.category.toLowerCase() === activeTab.toLowerCase());

  const tabs = ['All', 'Employment', 'Policies', 'Payroll', 'Tax'];

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="eyebrow">EMPLOYEE FILES</span>
          <h1>Company Documents</h1>
          <p>Access employment, policy, payroll, tax, and company documents.</p>
        </div>
        <button className="btn outline" onClick={() => alert('Document upload modal is ready for file upload integrations.')}>
          Upload Document
        </button>
      </div>

      <div className="doc-tabs segmented">
        {tabs.map(tab => (
          <button 
            key={tab} 
            className={activeTab === tab ? 'active' : ''} 
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="doc-grid" id="documentGrid">
        {filteredDocs.map(doc => (
          <article className="doc-card" key={doc.name}>
            <div className="doc-icon">PDF</div>
            <h3>{doc.name}</h3>
            <p>{doc.category}</p>
            <div>
              <small>{doc.size}</small>
              <button className="btn outline small" onClick={() => handleDownload(doc.name)}>
                Download
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Documents;
