import React from 'react';

function IncomingCall({ caller, onAccept, onReject }) {
  return (
      <div className="incoming-call-overlay">
        <div className="incoming-call-modal">
          <h2>📞 Входящий звонок</h2>
          <p className="caller-name">{caller}</p>
          <p className="calling-text">звонит вам...</p>

          <div className="call-actions">
            <button className="accept-button" onClick={onAccept}>
              ✅ Принять
            </button>
            <button className="reject-button" onClick={onReject}>
              ❌ Отклонить
            </button>
          </div>
        </div>
      </div>
  );
}

export default IncomingCall;