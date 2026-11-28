const UI = {
  flipped: false,

  renderBoard(state) {
    const boardEl = document.getElementById('board');
    const { board, selected, possible, lastMove, turn, gameOver } = state;
    boardEl.innerHTML = '';

    const inCheckColor = !gameOver && ChessEngine.isInCheck(turn) ? turn : null;
    const kingPos = inCheckColor ? ChessEngine.findKing(inCheckColor) : null;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const dr = this.flipped ? 7 - r : r;
        const dc = this.flipped ? 7 - c : c;
        const sq = document.createElement('div');
        sq.className = 'square ' + ((dr + dc) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.pos = `${dr}-${dc}`;

        if (selected && selected.r === dr && selected.c === dc) sq.classList.add('selected');
        if (lastMove && ((lastMove.from.r === dr && lastMove.from.c === dc) ||
                         (lastMove.to.r === dr && lastMove.to.c === dc))) sq.classList.add('last-move');
        if (possible.some(m => m.r === dr && m.c === dc)) {
          sq.classList.add('possible');
          if (board[dr][dc]) sq.classList.add('capture');
        }
        if (kingPos && kingPos.r === dr && kingPos.c === dc) sq.classList.add('check');

        const piece = board[dr][dc];
        if (piece) {
          const span = document.createElement('span');
          span.className = 'piece ' + (piece[0] === 'w' ? 'white-piece' : 'black-piece');
          span.textContent = ChessEngine.PIECES[piece];
          sq.appendChild(span);
        }

        sq.onclick = () => Game.handleSquareClick(dr, dc);
        boardEl.appendChild(sq);
      }
    }
  },

  flipBoard(force) {
    this.flipped = force !== undefined ? force : !this.flipped;
    Game.render();
  },

  updateStatus(state) {
    const { turn, gameOver } = state;
    const whiteCard = document.getElementById('whiteCard');
    const blackCard = document.getElementById('blackCard');
    const whiteStatus = document.getElementById('whiteStatus');
    const blackStatus = document.getElementById('blackStatus');

    whiteCard.classList.toggle('active', turn === 'white' && !gameOver);
    blackCard.classList.toggle('active', turn === 'black' && !gameOver);

    if (gameOver) {
      whiteStatus.textContent = 'Kết thúc';
      blackStatus.textContent = 'Kết thúc';
      return;
    }
    if (turn === 'white') {
      whiteStatus.textContent = ChessEngine.isInCheck('white') ? '⚠️ Bị chiếu!' : '✅ Lượt của bạn';
      blackStatus.textContent = 'Đang chờ...';
    } else {
      blackStatus.textContent = ChessEngine.isInCheck('black') ? '⚠️ Bị chiếu!' : '✅ Lượt của bạn';
      whiteStatus.textContent = 'Đang chờ...';
    }
  },

  updateMovesList(moveHistory) {
    const list = document.getElementById('movesList');
    if (moveHistory.length === 0) {
      list.innerHTML = '<div class="empty">Chưa có nước đi</div>';
      return;
    }
    let html = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      const white = moveHistory[i]?.san || '';
      const black = moveHistory[i + 1]?.san || '';
      html += `<div class="move-row">
        <span class="move-num">${Math.floor(i / 2) + 1}.</span>
        <span class="move-san">${white}</span>
        <span class="move-san">${black}</span>
      </div>`;
    }
    list.innerHTML = html;
    list.scrollTop = list.scrollHeight;
  },

  updateClocks(clocks) {
    const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    document.getElementById('whiteClock').textContent = fmt(clocks.w);
    document.getElementById('blackClock').textContent = fmt(clocks.b);
  },

  showGameOver(text) {
    document.getElementById('gameOverText').textContent = text;
    document.getElementById('gameOver').classList.add('show');
  },
  hideGameOver() {
    document.getElementById('gameOver').classList.remove('show');
  },

  openModal(id) { document.getElementById(id).classList.add('show'); },
  closeModal(id) { document.getElementById(id).classList.remove('show'); },

  toast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2500);
  },

  addChatMessage(sender, text, isMe) {
    const box = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (isMe ? 'me' : 'other');
    div.innerHTML = `<span class="sender">${this.escape(sender)}</span>${this.escape(text)}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  },

  escape(s) {
    return String(s).replace(/[&<>"']/g, c => 
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },
};
