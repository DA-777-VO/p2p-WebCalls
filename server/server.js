const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Настройка CORS для Socket.IO
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:5173", // Адрес React приложения
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// Хранилище подключенных пользователей
// Структура: { socketId: { username: 'Имя' } }
const users = {};

// Обработка подключений Socket.IO
io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);

  // 1. Регистрация пользователя
  socket.on('register', (data) => {
    console.log(`Пользователь зарегистрирован: ${data.username} (${socket.id})`);
    users[socket.id] = {
      username: data.username
    };

    // Отправляем всем обновленный список пользователей
    broadcastUsersList();
  });

  // 2. Инициация звонка
  socket.on('call-user', (data) => {
    console.log(`Звонок от ${socket.id} к ${data.to}`);

    // Пересылаем offer целевому пользователю
    io.to(data.to).emit('call-incoming', {
      from: socket.id,
      fromUsername: users[socket.id]?.username || 'Неизвестный',
      offer: data.offer
    });
  });

  // 3. Ответ на звонок
  socket.on('call-answer', (data) => {
    console.log(`Ответ от ${socket.id} к ${data.to}`);

    // Пересылаем answer звонящему
    io.to(data.to).emit('call-answered', {
      from: socket.id,
      answer: data.answer
    });
  });

  // 4. Обмен ICE кандидатами
  socket.on('ice-candidate', (data) => {
    console.log(`ICE кандидат от ${socket.id} к ${data.to}`);

    // Пересылаем ICE кандидат собеседнику
    io.to(data.to).emit('ice-candidate', {
      from: socket.id,
      candidate: data.candidate
    });
  });

  // 5. Отключение пользователя
  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
    delete users[socket.id];

    // Обновляем список для всех
    broadcastUsersList();
  });

  // Функция отправки списка пользователей всем
  function broadcastUsersList() {
    const usersList = Object.keys(users).map(socketId => ({
      id: socketId,
      username: users[socketId].username
    }));

    io.emit('users-list', usersList);
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});