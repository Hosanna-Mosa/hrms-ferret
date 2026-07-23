import React from 'react';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="backdrop" onClick={onClose}></div>
      <div className="modal-card">
        <button className="modal-x" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
