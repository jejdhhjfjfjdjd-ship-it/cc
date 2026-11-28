const Game = {
  mode: 'local',
  selected: null,
  possible: [],
  lastMove: null,
  moveHistory: [],
  gameOver: false,
  clocks: { w: CONFIG.DEFAULT_CLOCK, b: CONFIG.DEFAULT_CLOCK },
  clockInterval: null,
  onlineReady: false,
  myColor: 'w',

  init() {
    Auth.ensureAdmin();
    Auth.init();
    Admin.refreshPublicPositions();
    Music.init(); // Khởi động nhạc
    this.reset();
  },

  reset(broadcast = true) {
    ChessEngine.init();
    this.selected = null;
    this.possible = [];
    this.lastMove = null;
    this.moveHistory = [];
    this.gameOver = false;
    this.clocks = { w: CONFIG.DEFAULT_CLOCK, b: CONFIG.DEFAULT_CLOCK };
    UI.hideGameOver();
    this.render();
    this.startClock();
    if (broadcast && this.mode === 'online' && Online.conn?.open) {
      Online.conn.send({ type: 'reset' });
    }
  },

  setMode(mode, silent = false) {
    this.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === mode)
    );
    if (mode !== 'online') {
      this.myColor = 'w';
      UI.flipBoard(false);
    }
    if (!silent) {
      document.getElementById('whiteName').textContent = 'Người chơi Trắng';
      document.getElementById('blackName').textContent = mode === 'ai' ? '🤖 Máy' : 'Người chơi Đen';
      this.reset();
    }
  },

  onOnlineReady() {
    this.onlineReady = true;
    this.myColor = Online.myColor;
    UI.flipBoard(this.myColor === 'b');
    document.getElementById('whiteName').textContent = this.myColor === 'w' ? Online.myName : Online.opponentName;
    document.getElementById('blackName').textContent = this.myColor === 'b' ? Online.myName : Online.opponentName;
    this.reset();
  },

  render() {
    UI.renderBoard({
      board: ChessEngine.getBoard(),
      selected: this.selected,
      possible: this.possible,
      lastMove: this.lastMove,
      turn: ChessEngine.getTurn(),
      gameOver: this.gameOver,
    });
    UI.updateStatus({ turn: ChessEngine.getTurn(), gameOver: this.gameOver });
    UI.updateMovesList(this.moveHistory);
    UI.updateClocks(this.clocks);
  },

  handleSquareClick(r, c) {
    if (this.gameOver) return;
    if (this.mode === 'online') {
      if (!this.onlineReady) return;
      const myTurn = (this.myColor === 'w' && ChessEngine.getTurn() === 'white') ||
                     (this.myColor === 'b' && ChessEngine.getTurn() === 'black');
      if (!myTurn) return;
    }
    if (this.mode === 'ai' && ChessEngine.getTurn() === 'black') return;

    const board = ChessEngine.getBoard();
    const piece = board[r][c];

    if (this.selected) {
      const isValid = this.possible.some(m => m.r === r && m.c === c);
      if (isValid) { this.makeMove(this.selected, { r, c }, true); return; }
      if (piece && piece[0] === ChessEngine.getTurn()[0]) this.select(r, c);
      else this.deselect();
    } else {
      if (piece && piece[0] === ChessEngine.getTurn()[0]) this.select(r, c);
    }
  },

  select(r, c) {
    this.selected = { r, c };
    this.possible = ChessEngine.getLegalMoves(r, c);
    this.render();
  },

  deselect() {
    this.selected = null;
    this.possible = [];
    this.render();
  },

  makeMove(from, to, isLocal) {
    const board = ChessEngine.getBoard();
    const piece = board[from.r][from.c];
    const captured = board[to.r][to.c];
    const turnBefore = ChessEngine.getTurn();

    let san = '';
    if (piece[1] === 'K' && Math.abs(to.c - from.c) === 2) {
      san = to.c === 6 ? 'O-O' : 'O-O-O';
    } else {
      const tc = piece[1] !== 'P' ? piece[1] : '';
      const isCap = captured || ((piece === 'wP' || piece === 'bP') && ChessEngine.getEnPassant() &&
        to.r === ChessEngine.getEnPassant().r && to.c === ChessEngine.getEnPassant().c);
      san = tc + (isCap ? 'x' : '') + String.fromCharCode(97 + to.c) + (8 - to.r);
    }

    const moveData = {
      from: { ...from }, to: { ...to }, piece, captured,
      enPassantTarget: ChessEngine.getEnPassant(),
      castlingRights: { ...ChessEngine.getCastling() },
      san
    };

    if ((piece === 'wP' || piece === 'bP') && ChessEngine.getEnPassant() &&
        to.r === ChessEngine.getEnPassant().r && to.c === ChessEngine.getEnPassant().c && !captured) {
      const capRow = piece === 'wP' ? to.r + 1 : to.r - 1;
      moveData.enPassantCapture = { r: capRow, c: to.c, piece: board[capRow][to.c] };
      board[capRow][to.c] = '';
    }

    board[to.r][to.c] = piece;
    board[from.r][from.c] = '';

    if (piece === 'wK' && Math.abs(to.c - from.c) === 2) {
      if (to.c === 6) { board[7][5] = 'wR'; board[7][7] = ''; }
      else if (to.c === 2) { board[7][3] = 'wR'; board[7][0] = ''; }
    }
    if (piece === 'bK' && Math.abs(to.c - from.c) === 2) {
      if (to.c === 6) { board[0][5] = 'bR'; board[0][7] = ''; }
      else if (to.c === 2) { board[0][3] = 'bR'; board[0][0] = ''; }
    }

    if (piece === 'wP' && to.r === 0) { board[to.r][to.c] = 'wQ'; moveData.san += '=Q'; }
    if (piece === 'bP' && to.r === 7) { board[to.r][to.c] = 'bQ'; moveData.san += '=Q'; }

    const cr = ChessEngine.getCastling();
    if (piece === 'wK') { cr.wK = cr.wQ = false; }
    if (piece === 'bK') { cr.bK = cr.bQ = false; }
    if (piece === 'wR' && from.r === 7 && from.c === 0) cr.wQ = false;
    if (piece === 'wR' && from.r === 7 && from.c === 7) cr.wK = false;
    if (piece === 'bR' && from.r === 0 && from.c === 0) cr.bQ = false;
    if (piece === 'bR' && from.r === 0 && from.c === 7) cr.bK = false;

    let newEP = null;
    if (piece === 'wP' && from.r === 6 && to.r === 4) newEP = { r: 5, c: to.c };
    if (piece === 'bP' && from.r === 1 && to.r === 3) newEP = { r: 2, c: to.c };
    ChessEngine.setEnPassant(newEP);

    ChessEngine.setTurn(turnBefore === 'white' ? 'black' : 'white');
    this.moveHistory.push(moveData);
    this.lastMove = { from, to };
    this.selected = null;
    this.possible = [];

    this.render();
    this.checkGameEnd();

    if (isLocal && this.mode === 'online') Online.sendMove(from, to);

    if (this.mode === 'ai' && ChessEngine.getTurn() === 'black' && !this.gameOver) {
      setTimeout(() => this.aiMove(), 300);
    }
  },

  applyRemoteMove(from, to) { this.makeMove(from, to, false); },

  aiMove() {
    if (this.gameOver) return;
    const move = AI.findBestMove(CONFIG.AI_DEPTH);
    if (move) this.makeMove(move.from, move.to, false);
  },

  checkGameEnd() {
    const turn = ChessEngine.getTurn();
    const hasMove = ChessEngine.hasAnyLegalMove(turn);
    const inCheck = ChessEngine.isInCheck(turn);
    if (!hasMove) {
      this.gameOver = true;
      this.stopClock();
      if (inCheck) {
        const winner = turn === 'white' ? 'Đen' : 'Trắng';
        UI.showGameOver(`Chiếu hết! ${winner} thắng!`);
      } else {
        UI.showGameOver('Hòa cờ!');
      }
    }
  },

  startClock() {
    this.stopClock();
    this.clockInterval = setInterval(() => {
      if (this.gameOver) return;
      const turn = ChessEngine.getTurn();
      const key = turn === 'white' ? 'w' : 'b';
      this.clocks[key]--;
      if (this.clocks[key] <= 0) {
        this.clocks[key] = 0;
        this.gameOver = true;
        this.stopClock();
        const winner = turn === 'white' ? 'Đen' : 'Trắng';
        UI.showGameOver(`Hết giờ! ${winner} thắng!`);
      }
      UI.updateClocks(this.clocks);
    }, 1000);
  },

  stopClock() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = null;
  },

  undo() {
    if (this.moveHistory.length === 0) return;
    const last = this.moveHistory.pop();
    const board = ChessEngine.getBoard();
    board[last.from.r][last.from.c] = last.piece;
    board[last.to.r][last.to.c] = last.captured || '';
    if (last.enPassantCapture)
      board[last.enPassantCapture.r][last.enPassantCapture.c] = last.enPassantCapture.piece;
    if (last.piece === 'wK' && Math.abs(last.to.c - last.from.c) === 2) {
      if (last.to.c === 6) { board[7][7] = 'wR'; board[7][5] = ''; }
      else if (last.to.c === 2) { board[7][0] = 'wR'; board[7][3] = ''; }
    }
    if (last.piece === 'bK' && Math.abs(last.to.c - last.from.c) === 2) {
      if (last.to.c === 6) { board[0][7] = 'bR'; board[0][5] = ''; }
      else if (last.to.c === 2) { board[0][0] = 'bR'; board[0][3] = ''; }
    }
    ChessEngine.setEnPassant(last.enPassantTarget);
    ChessEngine.setCastling(last.castlingRights);
    ChessEngine.setTurn(ChessEngine.getTurn() === 'white' ? 'black' : 'white');
    this.gameOver = false;
    UI.hideGameOver();
    this.selected = null;
    this.possible = [];
    this.lastMove = this.moveHistory.length > 0 
      ? { from: this.moveHistory[this.moveHistory.length-1].from, to: this.moveHistory[this.moveHistory.length-1].to }
      : null;
    this.render();
  },

  loadPosition(id, isStrong = false) {
    const positions = isStrong ? Storage.getStrongPositions() : Storage.getPositions();
    const pos = positions.find(p => p.id === id);
    if (!pos) return;
    ChessEngine.loadFromFen(pos.fen);
    this.selected = null;
    this.possible = [];
    this.lastMove = null;
    this.moveHistory = [];
    this.gameOver = false;
    this.clocks = { w: CONFIG.DEFAULT_CLOCK, b: CONFIG.DEFAULT_CLOCK };
    UI.hideGameOver();
    this.render();
    this.startClock();
    UI.toast(`Đã tải: ${pos.name}`, 'success');
    UI.closeModal('adminModal');
  }
};

document.addEventListener('DOMContentLoaded', () => Game.init());
