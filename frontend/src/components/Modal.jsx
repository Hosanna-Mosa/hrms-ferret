import React from 'react';

const Modal = ({ isOpen, onClose, children, style }) => {
  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="backdrop" onClick={onClose}></div>
      <div className="modal-card" style={style}>
        <button className="modal-x" onClick={onClose}>×</button>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
