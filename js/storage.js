const Storage = {
  KEY_USERS: 'chess_users',
  KEY_SESSION: 'chess_session',
  KEY_POSITIONS: 'chess_positions',
  KEY_STRONG: 'chess_strong_positions',

  getUsers() { return JSON.parse(localStorage.getItem(this.KEY_USERS) || '{}'); },
  saveUsers(users) { localStorage.setItem(this.KEY_USERS, JSON.stringify(users)); },
  getSession() { return localStorage.getItem(this.KEY_SESSION); },
  setSession(u) { localStorage.setItem(this.KEY_SESSION, u); },
  clearSession() { localStorage.removeItem(this.KEY_SESSION); },

  getPositions() {
    const custom = JSON.parse(localStorage.getItem(this.KEY_POSITIONS) || '[]');
    return [...DEFAULT_POSITIONS, ...custom];
  },
  saveCustomPositions(positions) {
    localStorage.setItem(this.KEY_POSITIONS, JSON.stringify(positions));
  },

  getStrongPositions() {
    const custom = JSON.parse(localStorage.getItem(this.KEY_STRONG) || '[]');
    return [...STRONG_POSITIONS, ...custom];
  },
  saveStrongPositions(positions) {
    localStorage.setItem(this.KEY_STRONG, JSON.stringify(positions));
  },
};
