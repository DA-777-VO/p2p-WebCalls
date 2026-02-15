import React, { useState } from 'react';

function RoomJoin({ onJoinRoom }) {
  const [code, setCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    // Проверяем что код содержит только цифры
    if (!/^\d+$/.test(code)) {
      alert('Код комнаты должен содержать только цифры');
      return;
    }

    if (code.length < 3) {
      alert('Код комнаты должен содержать минимум 3 цифры');
      return;
    }

    onJoinRoom(code);
  };

  const handleInputChange = (e) => {
    // Разрешаем только цифры
    const value = e.target.value.replace(/\D/g, '');
    setCode(value);
  };

  return (
      <div className="room-join">
        <div className="room-join-container">
          <div className="logo">
            <div className="logo-icon">📹</div>
            <h1>Video Meet</h1>
          </div>

          <div className="join-card">
            <h2>Присоединиться к встрече</h2>
            <p className="subtitle">
              Введите код комнаты для создания или присоединения
            </p>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <input
                    type="text"
                    placeholder="Код комнаты (только цифры)"
                    value={code}
                    onChange={handleInputChange}
                    autoFocus
                    maxLength="10"
                />
              </div>

              <button type="submit" className="join-button">
                Присоединиться
              </button>
            </form>

            <div className="help-text">
              <p>💡 Создайте код из цифр и поделитесь с собеседником</p>
              <p>💡 Максимум 2 участника в комнате</p>
            </div>
          </div>
        </div>
      </div>
  );
}

export default RoomJoin;