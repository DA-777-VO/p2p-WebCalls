import React, { useEffect, useRef } from 'react';

function VideoCall({
                     roomId,
                     username,
                     localStream,
                     remoteStream,
                     inCall,
                     isMuted,
                     isVideoOff,
                     onToggleMute,
                     onToggleVideo,
                     onLeaveRoom
                   }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Устанавливаем локальное видео
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Устанавливаем удаленное видео
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
      <div className="video-call-container">
        {/* Шапка с информацией о комнате */}
        <div className="room-header">
          <div className="room-info">
            <span className="room-code">Комната: {roomId}</span>
            <span className="room-divider">|</span>
            <span className="user-name">{username}</span>
          </div>
        </div>

        {/* Видео контейнер */}
        <div className="videos-grid">
          {/* Удаленное видео (собеседник) */}
          {inCall && remoteStream ? (
              <div className="video-wrapper remote-video-wrapper">
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="video remote-video"
                />
              </div>
          ) : (
              <div className="video-wrapper waiting-wrapper">
                <div className="waiting-content">
                  <div className="waiting-icon">⏳</div>
                  <h3>Ожидание собеседника...</h3>
                  <p>Поделитесь кодом комнаты: <strong>{roomId}</strong></p>
                </div>
              </div>
          )}

          {/* Локальное видео (ваше) - плавающее в углу */}
          <div className="local-video-container">
            <div className="video-wrapper local-video-wrapper">
              <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="video local-video"
              />
              {isVideoOff && (
                  <div className="video-off-overlay">
                    <div className="video-off-icon">📹</div>
                  </div>
              )}
              <div className="local-label">{username}</div>
            </div>
          </div>
        </div>

        {/* Панель управления (в стиле Google Meet) */}
        <div className="controls-container">
          <div className="controls">
            {/* Микрофон */}
            <button
                className={`control-btn ${isMuted ? 'control-btn-danger' : ''}`}
                onClick={onToggleMute}
                title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
            <span className="control-icon">
              {isMuted ? '🔇' : '🎤'}
            </span>
            </button>

            {/* Камера */}
            <button
                className={`control-btn ${isVideoOff ? 'control-btn-danger' : ''}`}
                onClick={onToggleVideo}
                title={isVideoOff ? 'Включить камеру' : 'Выключить камеру'}
            >
            <span className="control-icon">
              {isVideoOff ? '📹' : '📷'}
            </span>
            </button>

            {/* Покинуть комнату */}
            <button
                className="control-btn control-btn-leave"
                onClick={onLeaveRoom}
                title="Покинуть комнату"
            >
              <span className="control-icon">📞</span>
            </button>
          </div>
        </div>
      </div>
  );
}

export default VideoCall;