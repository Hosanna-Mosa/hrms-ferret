import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Documents = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');

  const fetchEmployees = async () => {
    try {
      const res = await apiRequest('/api/employees/admin/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        if (data.length > 0) {
          setSelectedEmpId(user.employeeId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocs = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/documents/me';
      if (user && ['HR', 'SuperAdmin'].includes(user.role) && selectedEmpId) {
        endpoint = `/api/documents/employee/${selectedEmpId}`;
      }
      const res = await apiRequest(endpoint);
      if (res.ok) {
        const data = await res.json();
        setDocs(data);
      }
    } catch (e) {
      console.error('Error fetching documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (['HR', 'SuperAdmin'].includes(user.role)) {
        fetchEmployees();
      } else {
        setSelectedEmpId(user.employeeId);
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedEmpId) {
      fetchDocs();
    }
  }, [selectedEmpId]);

  const handleUploadClick = () => {
    const categoryInput = prompt("Enter document category (e.g. Employment, Policies, Payroll, Tax):", "Employment");
    if (categoryInput === null) return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.jpg,.jpeg,.png';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', categoryInput || 'Other');
      if (user && ['HR', 'SuperAdmin'].includes(user.role) && selectedEmpId) {
        formData.append('target_employee_id', selectedEmpId);
      }

      try {
        const res = await apiRequest('/api/documents/upload', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          fetchDocs();
          alert('Document uploaded successfully!');
        } else {
          const err = await res.json();
          alert(err.message || 'Upload failed');
        }
      } catch (err) {
        alert('Upload failed: ' + err.message);
      }
    };
    fileInput.click();
  };

  const filteredDocs = activeTab === 'All' 
    ? docs 
    : docs.filter(d => (d.document_type || 'Other').toLowerCase() === activeTab.toLowerCase());

  const tabs = ['All', 'Employment', 'Policies', 'Payroll', 'Tax'];

  return (
    <div>
      {user && ['HR', 'SuperAdmin'].includes(user.role) && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>Select Employee / Manager:</span>
          <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff', fontSize: '13px' }}>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.full_name} ({emp.employee_code} - {emp.role_name})</option>
            ))}
          </select>
        </div>
      )}
      <div className="page-head">
        <div>
          <span className="eyebrow">EMPLOYEE FILES</span>
          <h1>Company Documents</h1>
          <p>Access employment, policy, payroll, tax, and company documents.</p>
        </div>
        <button className="btn outline" onClick={handleUploadClick}>
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', fontWeight: 'bold' }}>Loading documents...</div>
      ) : (
        <div className="doc-grid" id="documentGrid">
          {filteredDocs.map(doc => (
            <article className="doc-card" key={doc._id}>
              <div className="doc-icon">
                {doc.mime_type?.includes('pdf') ? 'PDF' : 'IMG'}
              </div>
              <h3>{doc.file_name}</h3>
              <p>{doc.document_type}</p>
              <div>
                <small>{new Date(doc.uploaded_at).toLocaleDateString()}</small>
                <button 
                  className="btn outline small" 
                  onClick={() => window.open(`/api/documents/${doc._id}/download`, '_blank')}
                >
                  Download
                </button>
              </div>
            </article>
          ))}

          {filteredDocs.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', opacity: 0.7, background: '#fff', borderRadius: '14px', border: '1px solid var(--line)' }}>
              No documents found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Documents;
