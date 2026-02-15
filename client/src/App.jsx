import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';
import RoomJoin from './components/RoomJoin';
import VideoCall from './components/VideoCall';

// Адрес сигнального сервера
const SERVER_URL = 'http://localhost:5000';

// Конфигурация ICE серверов (STUN сервер Google)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

function App() {
  // Состояния
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Refs для WebRTC и Socket
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteUserIdRef = useRef(null);
  const currentRoomRef = useRef(null);

  // Подключение к Socket.IO при монтировании компонента
  useEffect(() => {
    socketRef.current = io(SERVER_URL);

    // Успешное присоединение к комнате
    socketRef.current.on('joined-room', (data) => {
      console.log('✅ Присоединились к комнате:', data);
      setRoomId(data.roomId);
      setUsername(data.username);
      setInRoom(true);
      currentRoomRef.current = data.roomId;
    });

    // Комната заполнена
    socketRef.current.on('room-full', () => {
      alert('Комната заполнена! Максимум 2 участника.');
    });

    // Список пользователей в комнате
    socketRef.current.on('room-users', (usersList) => {
      console.log('📋 Пользователи в комнате:', usersList);
      const filteredUsers = usersList.filter(
          user => user.id !== socketRef.current.id
      );
      setRoomUsers(filteredUsers);

      // Автоматически звоним если есть другой пользователь и еще не в звонке
      if (filteredUsers.length > 0 && !inCall && localStreamRef.current) {
        const otherUser = filteredUsers[0];
        callUser(otherUser.id);
      }
    });

    // Входящий звонок
    socketRef.current.on('call-incoming', handleIncomingCall);

    // Ответ на наш звонок
    socketRef.current.on('call-answered', handleCallAnswered);

    // Получение ICE кандидата
    socketRef.current.on('ice-candidate', handleNewICECandidate);

    // Пользователь отключился
    socketRef.current.on('user-disconnected', (data) => {
      console.log('👋 Пользователь вышел:', data.username);
      alert(`${data.username} покинул комнату`);
      endCall();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
    // eslint-disable-next-line
  }, []);

  // Присоединение к комнате
  const joinRoom = async (code) => {
    try {
      // Сразу запрашиваем доступ к камере и микрофону
      const stream = await navigator.mediaDevices.getUserMedia({
        // video: true,
        audio: true
      });

      console.log('🎥 Доступ к медиа получен');
      localStreamRef.current = stream;

      // Отправляем запрос на присоединение к комнате
      socketRef.current.emit('join-room', { roomId: code });
    } catch (error) {
      console.error('❌ Ошибка доступа к камере:', error);
      alert('Не удалось получить доступ к камере/микрофону. Проверьте разрешения браузера.');
    }
  };

  // Инициация звонка
  const callUser = async (userId) => {
    try {
      console.log('📞 Звоним пользователю:', userId);
      remoteUserIdRef.current = userId;

      // Создаем WebRTC соединение
      createPeerConnection();

      // Добавляем локальные треки в соединение
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });

      // Создаем offer
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      console.log('📤 Отправка offer');
      // Отправляем offer через сигнальный сервер
      socketRef.current.emit('call-user', {
        to: userId,
        offer: offer
      });

      setInCall(true);
    } catch (error) {
      console.error('❌ Ошибка при звонке:', error);
    }
  };

  // Обработка входящего звонка
  const handleIncomingCall = async (data) => {
    try {
      console.log('📲 Входящий звонок от:', data.fromUsername);
      remoteUserIdRef.current = data.from;

      // Создаем WebRTC соединение
      createPeerConnection();

      // Добавляем локальные треки
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });

      // Устанавливаем удаленное описание (offer)
      await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
      );

      // Создаем answer
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      console.log('📤 Отправка answer');
      // Отправляем answer
      socketRef.current.emit('call-answer', {
        to: data.from,
        answer: answer
      });

      setInCall(true);
    } catch (error) {
      console.error('❌ Ошибка при принятии звонка:', error);
    }
  };

  // Обработка ответа на наш звонок
  const handleCallAnswered = async (data) => {
    console.log('✅ Звонок принят:', data.from);
    try {
      await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
      );
    } catch (error) {
      console.error('❌ Ошибка при обработке ответа:', error);
    }
  };

  // Обработка нового ICE кандидата
  const handleNewICECandidate = async (data) => {
    console.log('🧊 Получен ICE кандидат');
    try {
      if (data.candidate) {
        await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
        );
      }
    } catch (error) {
      console.error('❌ Ошибка добавления ICE кандидата:', error);
    }
  };

  // Создание WebRTC соединения
  const createPeerConnection = () => {
    console.log('🔗 Создание WebRTC соединения');
    peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS);

    // Обработка ICE кандидатов
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('📤 Отправка ICE кандидата');
        socketRef.current.emit('ice-candidate', {
          to: remoteUserIdRef.current,
          candidate: event.candidate
        });
      }
    };

    // Получение удаленного потока
    peerConnectionRef.current.ontrack = (event) => {
      console.log('📥 Получен удаленный поток');
      remoteStreamRef.current = event.streams[0];
      setInCall(prev => prev); // Форсируем обновление
    };

    // Отслеживание состояния соединения
    peerConnectionRef.current.onconnectionstatechange = () => {
      console.log('🔌 Состояние:', peerConnectionRef.current.connectionState);

      if (peerConnectionRef.current.connectionState === 'disconnected' ||
          peerConnectionRef.current.connectionState === 'failed') {
        endCall();
      }
    };
  };

  // Переключение микрофона
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Переключение камеры
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Завершение звонка и выход из комнаты
  const leaveRoom = () => {
    // Останавливаем локальный поток
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Закрываем WebRTC соединение
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Отключаемся от Socket.IO
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = io(SERVER_URL);

      // Переподключаем обработчики
      socketRef.current.on('joined-room', (data) => {
        setRoomId(data.roomId);
        setUsername(data.username);
        setInRoom(true);
        currentRoomRef.current = data.roomId;
      });

      socketRef.current.on('room-full', () => {
        alert('Комната заполнена! Максимум 2 участника.');
      });

      socketRef.current.on('room-users', (usersList) => {
        const filteredUsers = usersList.filter(
            user => user.id !== socketRef.current.id
        );
        setRoomUsers(filteredUsers);

        if (filteredUsers.length > 0 && !inCall && localStreamRef.current) {
          const otherUser = filteredUsers[0];
          callUser(otherUser.id);
        }
      });

      socketRef.current.on('call-incoming', handleIncomingCall);
      socketRef.current.on('call-answered', handleCallAnswered);
      socketRef.current.on('ice-candidate', handleNewICECandidate);
      socketRef.current.on('user-disconnected', (data) => {
        alert(`${data.username} покинул комнату`);
        endCall();
      });
    }

    // Сбрасываем состояния
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    remoteUserIdRef.current = null;
    currentRoomRef.current = null;
    setInCall(false);
    setInRoom(false);
    setRoomUsers([]);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // Просто завершить звонок, но остаться в комнате
  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    remoteStreamRef.current = null;
    remoteUserIdRef.current = null;
    setInCall(false);
  };

  return (
      <div className="App">
        {!inRoom ? (
            <RoomJoin onJoinRoom={joinRoom} />
        ) : (
            <VideoCall
                roomId={roomId}
                username={username}
                localStream={localStreamRef.current}
                remoteStream={remoteStreamRef.current}
                inCall={inCall}
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                onLeaveRoom={leaveRoom}
            />
        )}
      </div>
  );
}

export default App;