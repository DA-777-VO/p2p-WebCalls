const info = (...params) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ℹ️`, ...params);
};

const error = (...params) => {
  const timestamp = new Date().toLocaleTimeString();
  console.error(`[${timestamp}] ❌`, ...params);
};

const success = (...params) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ✅`, ...params);
};

const warn = (...params) => {
  const timestamp = new Date().toLocaleTimeString();
  console.warn(`[${timestamp}] ⚠️`, ...params);
};

module.exports = {
  info,
  error,
  success,
  warn
};