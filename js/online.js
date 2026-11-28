const Online = {
  peer: null,
  conn: null,
  roomCode: '',
  myName: 'Bạn',
  opponentName: 'Đối thủ',
  isHost: false,
  myColor: 'w',

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  },

  getPeerId(code) { return CONFIG.PEER_PREFIX + code; },

  openMenu() {
    const nameInput = document.getElementById('onlineName');
    if (Auth.currentUser) nameInput.value = Auth.currentUser.username;
    UI.openModal('onlineModal');
  },

  createRoom() {
    const name = document.getElementById('onlineName').value.trim();
    if (!name) { UI.toast('Nhập tên của bạn', 'error'); return; }
    this.myName = name;
    this.isHost = true;
    this.roomCode = this.generateCode();
    this.myColor = 'w';

    UI.closeModal('onlineModal');
    UI.toast('Đang tạo phòng...');

    this.peer = new Peer(this.getPeerId(this.roomCode), { debug: 1 });

    this.peer.on('open', () => {
      document.getElementById('roomInfo').classList.add('show');
      document.getElementById('roomCode').textContent = this.roomCode;
      document.getElementById('roomStatus').textContent = '✅ Phòng đã tạo. Chờ đối thủ...';
      UI.toast('Phòng đã tạo! Chia sẻ mã: ' + this.roomCode, 'success');
      document.getElementById('chatPanel').classList.add('show');
    });

    this.peer.on('connection', (conn) => {
      this.conn = conn;
      this.setupConnection();
    });

    this.peer.on('error', (err) => {
      console.error(err);
      UI.toast('Lỗi kết nối: ' + err.type, 'error');
      this.cleanup();
    });

    Game.setMode('online', true);
  },

  joinRoom() {
    const name = document.getElementById('onlineName').value.trim();
    const code = document.getElementById('joinCode').value.trim().toUpperCase();
    if (!name) { UI.toast('Nhập tên', 'error'); return; }
    if (code.length !== 6) { UI.toast('Mã phòng phải 6 ký tự', 'error'); return; }

    this.myName = name;
    this.roomCode = code;
    this.isHost = false;
    this.myColor = 'b';

    UI.closeModal('onlineModal');
    UI.toast('Đang kết nối...');

    this.peer = new Peer({ debug: 1 });

    this.peer.on('open', () => {
      this.conn = this.peer.connect(this.getPeerId(code), { reliable: true });
      this.setupConnection();
    });

    this.peer.on('error', (err) => {
      console.error(err);
      UI.toast('Không kết nối được. Kiểm tra mã phòng!', 'error');
    });

    Game.setMode('online', true);
  },

  setupConnection() {
    this.conn.on('open', () => {
      document.getElementById('roomInfo').classList.add('show');
      document.getElementById('roomCode').textContent = this.roomCode;
      document.getElementById('roomStatus').textContent = '✅ Đã kết nối!';
      document.getElementById('chatPanel').classList.add('show');
      UI.toast('Đã kết nối với đối thủ!', 'success');

      this.conn.send({ type: 'hello', name: this.myName, color: this.myColor });
      if (this.isHost) this.conn.send({ type: 'assignColor', color: 'b' });

      Game.onOnlineReady();
    });

    this.conn.on('data', (data) => this.handleData(data));

    this.conn.on('close', () => {
      UI.toast('Đối thủ đã rời phòng', 'error');
      document.getElementById('roomStatus').textContent = '❌ Đối thủ ngắt kết nối';
    });
  },

  handleData(data) {
    switch (data.type) {
      case 'hello':
        this.opponentName = data.name;
        document.getElementById(this.myColor === 'w' ? 'blackName' : 'whiteName').textContent = data.name;
        break;
      case 'assignColor':
        if (!this.isHost) {
          this.myColor = data.color;
          UI.flipBoard(this.myColor === 'b');
          UI.toast('Bạn cầm quân ' + (data.color === 'w' ? 'Trắng' : 'Đen'), 'success');
        }
        break;
      case 'move':
        Game.applyRemoteMove(data.from, data.to);
        break;
      case 'chat':
        UI.addChatMessage(data.name, data.text, false);
        break;
      case 'reset':
        Game.reset(false);
        break;
      case 'applyStrong':
        // Đối thủ nhận thế cờ mạnh từ admin
        ChessEngine.loadFromFen(data.fen);
        Game.selected = null;
        Game.possible = [];
        Game.lastMove = null;
        Game.moveHistory = [];
        Game.gameOver = false;
        UI.hideGameOver();
        // Đối thủ cầm bên ngược lại
        Game.myColor = data.adminColor === 'w' ? 'b' : 'w';
        Game.onlineReady = true;
        UI.flipBoard(Game.myColor === 'b');
        Game.render();
        Game.startClock();
        UI.toast('⚡ Admin đã áp dụng: ' + data.name, 'success');
        // Hiển thị choáng
        document.getElementById(Game.myColor === 'w' ? 'whiteName' : 'blackName').textContent = this.myName;
        document.getElementById(Game.myColor === 'w' ? 'blackName' : 'whiteName').textContent = '👑 Admin';
        break;
    }
  },

  sendMove(from, to) {
    if (this.conn && this.conn.open) this.conn.send({ type: 'move', from, to });
  },

  sendChat() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !this.conn || !this.conn.open) return;
    this.conn.send({ type: 'chat', name: this.myName, text });
    UI.addChatMessage('Bạn', text, true);
    input.value = '';
  },

  copyCode() {
    navigator.clipboard.writeText(this.roomCode);
    UI.toast('Đã copy mã phòng!', 'success');
  },

  cleanup() {
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
    this.peer = null;
    this.conn = null;
    this.roomCode = '';
    document.getElementById('roomInfo').classList.remove('show');
    document.getElementById('chatPanel').classList.remove('show');
    document.getElementById('chatMessages').innerHTML = '';
    Game.setMode('local');
  }
};
