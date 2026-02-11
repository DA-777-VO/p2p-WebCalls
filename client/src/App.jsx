import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';
import UserList from './components/UserList';
import VideoCall from './components/VideoCall';
import IncomingCall from './components/IncomingCall';

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
  const [username, setUsername] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [users, setUsers] = useState([]);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  // Refs для WebRTC и Socket
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteUserIdRef = useRef(null);


  // Обработка входящего звонка
  const handleIncomingCall = (data) => {
    console.log('Входящий звонок от:', data.fromUsername);
    setIncomingCall(data);
  };

  // Обработка ответа на наш звонок
  const handleCallAnswered = async (data) => {
    console.log('Звонок принят:', data);
    try {
      await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
      );
    } catch (error) {
      console.error('Ошибка при обработке ответа:', error);
    }
  };

  const handleNewICECandidate = async (data) => {
    console.log('Получен ICE кандидат');
    try {
      if (data.candidate) {
        await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
        );
      }
    } catch (error) {
      console.error('Ошибка добавления ICE кандидата:', error);
    }
  };

  // Подключение к Socket.IO при монтировании компонента
  useEffect(() => {
    socketRef.current = io(SERVER_URL);

    // Получение списка пользователей
    socketRef.current.on('users-list', (usersList) => {
      console.log('Список пользователей:', usersList);
      // Фильтруем себя из списка
      const filteredUsers = usersList.filter(
          user => user.id !== socketRef.current.id
      );
      setUsers(filteredUsers);
    });

    // Входящий звонок
    socketRef.current.on('call-incoming', handleIncomingCall);

    // Ответ на наш звонок
    socketRef.current.on('call-answered', handleCallAnswered);

    // Получение ICE кандидата
    socketRef.current.on('ice-candidate', handleNewICECandidate);

    return () => {
      // Очистка при размонтировании
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Регистрация пользователя
  const handleRegister = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socketRef.current.emit('register', { username });
      setIsRegistered(true);
    }
  };

  // Инициация звонка
  const callUser = async (userId) => {
    try {
      console.log('Звоним пользователю:', userId);
      remoteUserIdRef.current = userId;

      // Получаем доступ к камере и микрофону
      const stream = await navigator.mediaDevices.getUserMedia({
        // video: true,
        audio: true
      });

      localStreamRef.current = stream;

      // Создаем WebRTC соединение
      createPeerConnection();

      // Добавляем локальные треки в соединение
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Создаем offer
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      // Отправляем offer через сигнальный сервер
      socketRef.current.emit('call-user', {
        to: userId,
        offer: offer
      });

      setInCall(true);
    } catch (error) {
      console.error('Ошибка при звонке:', error);
      alert('Не удалось получить доступ к камере/микрофону');
    }
  };

  

  // Принятие звонка
  const acceptCall = async () => {
    try {
      const { from, offer } = incomingCall;
      remoteUserIdRef.current = from;

      // Получаем доступ к камере и микрофону
      const stream = await navigator.mediaDevices.getUserMedia({
        // video: true,
        audio: true
      });

      localStreamRef.current = stream;

      // Создаем WebRTC соединение
      createPeerConnection();

      // Добавляем локальные треки
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Устанавливаем удаленное описание (offer)
      await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(offer)
      );

      // Создаем answer
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      // Отправляем answer
      socketRef.current.emit('call-answer', {
        to: from,
        answer: answer
      });

      setInCall(true);
      setIncomingCall(null);
    } catch (error) {
      console.error('Ошибка при принятии звонка:', error);
      alert('Не удалось принять звонок');
    }
  };

  // Отклонение звонка
  const rejectCall = () => {
    setIncomingCall(null);
  };

  

  // Обработка нового ICE кандидата
  

  // Создание WebRTC соединения
  const createPeerConnection = () => {
    peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS);

    // Обработка ICE кандидатов
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Отправка ICE кандидата');
        socketRef.current.emit('ice-candidate', {
          to: remoteUserIdRef.current,
          candidate: event.candidate
        });
      }
    };

    // Получение удаленного потока
    peerConnectionRef.current.ontrack = (event) => {
      console.log('Получен удаленный поток');
      remoteStreamRef.current = event.streams[0];
    };

    // Отслеживание состояния соединения
    peerConnectionRef.current.onconnectionstatechange = () => {
      console.log(
          'Состояние соединения:',
          peerConnectionRef.current.connectionState
      );
    };
  };

  // Завершение звонка
  const endCall = () => {
    // Останавливаем локальный поток
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Закрываем WebRTC соединение
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Сбрасываем состояния
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    remoteUserIdRef.current = null;
    setInCall(false);
  };

  return (
      <div className="App">
        <h1>WebRTC Видеозвонки</h1>

        {!isRegistered ? (
            <div className="registration">
              <h2>Введите ваше имя</h2>
              <form onSubmit={handleRegister}>
                <input
                    type="text"
                    placeholder="Ваше имя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <button type="submit">Войти</button>
              </form>
            </div>
        ) : (
            <>
              {!inCall ? (
                  <UserList users={users} onCallUser={callUser} />
              ) : (
                  <VideoCall
                      localStream={localStreamRef.current}
                      remoteStream={remoteStreamRef.current}
                      onEndCall={endCall}
                  />
              )}

              {incomingCall && (
                  <IncomingCall
                      caller={incomingCall.fromUsername}
                      onAccept={acceptCall}
                      onReject={rejectCall}
                  />
              )}
            </>
        )}
      </div>
  );
}

export default App;