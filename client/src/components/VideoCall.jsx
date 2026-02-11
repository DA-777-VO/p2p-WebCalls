import React, {useEffect, useRef, useState} from 'react';
import '../App.css'

function VideoCall({ localStream, remoteStream, onEndCall }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);


  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Переключение камеры
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

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
      <div className="video-call">
        <div className="video-container">
          <div className="remote-video-wrapper">
            <video ref={remoteVideoRef} autoPlay playsInline />
          </div>
          <div className="local-video-wrapper">
            <video ref={localVideoRef} autoPlay playsInline muted />
          </div>
        </div>

        <div className="controls">
          <button
              className={`control-button ${isMuted ? 'active' : ''}`}
              onClick={toggleMute}
          >
            {isMuted ? '🔇 Микрофон выкл' : '🔊 Микрофон вкл'}
          </button>

          <button
              className={`control-button ${isVideoOff ? 'active' : ''}`}
              onClick={toggleVideo}
          >
            {isVideoOff ? '📹 Камера выкл' : '📷 Камера вкл'}
          </button>

          <button className="end-call-button" onClick={onEndCall}>
            ❌ Завершить
          </button>
        </div>
      </div>
  );
}

export default VideoCall;