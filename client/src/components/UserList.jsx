import React from 'react';

function UserList({ users, onCallUser }) {
  return (
      <div className="user-list">
        <h2>Онлайн пользователи ({users.length})</h2>

        {users.length === 0 ? (
            <p className="no-users">Нет других пользователей онлайн</p>
        ) : (
            <ul>
              {users.map(user => (
                  <li key={user.id} className="user-item">
                    <span className="user-name">{user.username}</span>
                    <button
                        className="call-button"
                        onClick={() => onCallUser(user.id)}
                    >
                      📞 Позвонить
                    </button>
                  </li>
              ))}
            </ul>
        )}
      </div>
  );
}

export default UserList;