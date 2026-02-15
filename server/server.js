const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { getRandomAnimalName } = require('./utils/nameGenerator');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Настройка CORS для Socket.IO
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// Простой GET endpoint для проверки работы сервера
app.get('/', (req, res) => {
  res.send('WebRTC Room Server работает!');
});

// Хранилище комнат и пользователей
// Структура rooms:
// {
//   'room123': {
//     users: {
//       'socketId1': { username: 'Happy Dog', socketId: 'socketId1' },
//       'socketId2': { username: 'Brave Cat', socketId: 'socketId2' }
//     }
//   }
// }
const rooms = {};

// Обработка подключений Socket.IO
io.on('connection', (socket) => {
  logger.info('Новое подключение:', socket.id);

  // 1. Присоединение к комнате
  socket.on('join-room', (data) => {
    const { roomId } = data;

    // Генерируем случайное имя для пользователя
    const username = getRandomAnimalName();

    // Создаем комнату если не существует
    if (!rooms[roomId]) {
      rooms[roomId] = { users: {} };
      logger.success(`Комната создана: ${roomId}`);
    }

    // Проверяем, не заполнена ли комната (максимум 2 человека)
    const usersInRoom = Object.keys(rooms[roomId].users).length;
    if (usersInRoom >= 2) {
      logger.warn(`Комната ${roomId} заполнена. Отклонение пользователя ${socket.id}`);
      socket.emit('room-full');
      return;
    }

    // Добавляем пользователя в комнату
    rooms[roomId].users[socket.id] = {
      username,
      socketId: socket.id
    };

    // Присоединяем сокет к комнате Socket.IO
    socket.join(roomId);

    // Сохраняем roomId в сокете для дальнейшего использования
    socket.roomId = roomId;
    socket.username = username;

    logger.success(`${username} (${socket.id}) присоединился к комнате ${roomId}`);

    // Отправляем пользователю его данные
    socket.emit('joined-room', {
      roomId,
      username,
      userId: socket.id
    });

    // Отправляем список пользователей в комнате всем участникам
    broadcastRoomUsers(roomId);
  });

  // 2. Инициация звонка (offer)
  socket.on('call-user', (data) => {
    const { to, offer } = data;
    logger.info(`Звонок от ${socket.username} (${socket.id}) к ${to}`);

    // Пересылаем offer целевому пользователю
    io.to(to).emit('call-incoming', {
      from: socket.id,
      fromUsername: socket.username,
      offer: offer
    });
  });

  // 3. Ответ на звонок (answer)
  socket.on('call-answer', (data) => {
    const { to, answer } = data;
    logger.info(`Ответ от ${socket.username} (${socket.id}) к ${to}`);

    // Пересылаем answer звонящему
    io.to(to).emit('call-answered', {
      from: socket.id,
      answer: answer
    });
  });

  // 4. Обмен ICE кандидатами
  socket.on('ice-candidate', (data) => {
    const { to, candidate } = data;

    // Пересылаем ICE кандидат собеседнику
    io.to(to).emit('ice-candidate', {
      from: socket.id,
      candidate: candidate
    });
  });

  // 5. Отключение пользователя
  socket.on('disconnect', () => {
    logger.info(`Пользователь отключился: ${socket.username || 'Unknown'} (${socket.id})`);

    const roomId = socket.roomId;

    if (roomId && rooms[roomId]) {
      // Удаляем пользователя из комнаты
      delete rooms[roomId].users[socket.id];

      // Уведомляем других пользователей в комнате
      socket.to(roomId).emit('user-disconnected', {
        userId: socket.id,
        username: socket.username
      });

      // Обновляем список пользователей
      broadcastRoomUsers(roomId);

      // Если комната пустая, удаляем её
      if (Object.keys(rooms[roomId].users).length === 0) {
        delete rooms[roomId];
        logger.info(`Комната ${roomId} удалена (пустая)`);
      }
    }
  });

  // Функция отправки списка пользователей в комнате
  function broadcastRoomUsers(roomId) {
    if (!rooms[roomId]) return;

    const usersList = Object.values(rooms[roomId].users).map(user => ({
      id: user.socketId,
      username: user.username
    }));

    logger.info(`Отправка списка пользователей для комнаты ${roomId}: ${usersList.length} онлайн`);

    // Отправляем только пользователям в этой комнате
    io.to(roomId).emit('room-users', usersList);
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('='.repeat(50));
  logger.success('WebRTC Room Server запущен');
  logger.info(`Порт: ${PORT}`);
  logger.info(`Время: ${new Date().toLocaleString()}`);
  console.log('='.repeat(50));
});