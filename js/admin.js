const Admin = {
  pendingStrongApply: null,

  open() {
    if (!Auth.isAdmin()) { UI.toast('Chỉ admin mới truy cập được', 'error'); return; }
    this.refreshStrongList();
    this.refreshPositionsList();
    this.refreshUsersList();
    UI.openModal('adminModal');
  },

  switchTab(tab) {
    document.querySelectorAll('#adminModal .tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`#adminModal .tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById('adminStrong').style.display = tab === 'strong' ? 'block' : 'none';
    document.getElementById('adminList').style.display = tab === 'list' ? 'block' : 'none';
    document.getElementById('adminAdd').style.display = tab === 'add' ? 'block' : 'none';
    document.getElementById('adminUsers').style.display = tab === 'users' ? 'block' : 'none';
    if (tab === 'strong') this.refreshStrongList();
    if (tab === 'list') this.refreshPositionsList();
    if (tab === 'users') this.refreshUsersList();
  },

  refreshStrongList() {
    const list = document.getElementById('adminStrongGrid');
    if (!list) return;
    const positions = Storage.getStrongPositions();
    if (positions.length === 0) {
      list.innerHTML = '<div style="color:#888;text-align:center;padding:20px">Chưa có thế cờ mạnh</div>';
      return;
    }
    list.innerHTML = positions.map(p => `
      <div class="position-card">
        <div class="pos-info" onclick="Admin.prepareStrong('${p.id}')">
          <div class="pos-name">${p.name}</div>
          <div class="pos-desc">${p.desc || ''} • Lợi thế: ${p.advantageFor === 'w' ? 'Trắng' : 'Đen'}</div>
        </div>
        <button class="pos-del" onclick="event.stopPropagation();Admin.deleteStrong('${p.id}')">🗑</button>
      </div>
    `).join('');
  },

  prepareStrong(id) {
    const positions = Storage.getStrongPositions();
    const pos = positions.find(p => p.id === id);
    if (!pos) return;

    // Nếu đang online → hiện confirm
    if (Game.mode === 'online' && Online.conn?.open) {
      this.pendingStrongApply = pos;
      document.getElementById('challengeNotice').innerHTML = 
        `Áp dụng thế cờ "<b>${pos.name}</b>"?<br><br>
         Admin sẽ cầm <b>${pos.advantageFor === 'w' ? 'Trắng' : 'Đen'}</b> (lợi thế).<br>
         Đối thủ cầm <b>${pos.advantageFor === 'w' ? 'Đen' : 'Trắng'}</b> (bất lợi).<br><br>
         <i>${pos.note || ''}</i>`;
      UI.openModal('challengeModal');
    } else {
      // Local: áp dụng ngay
      UI.closeModal('adminModal');
      Game.loadPosition(id, true);
      UI.toast('Đã tải thế cờ mạnh!', 'success');
    }
  },

  confirmStrongApply() {
    if (!this.pendingStrongApply) return;
    const pos = this.pendingStrongApply;
    
    // Gửi lệnh đến đối thủ
    if (Online.conn && Online.conn.open) {
      Online.conn.send({
        type: 'applyStrong',
        fen: pos.fen,
        name: pos.name,
        adminColor: pos.advantageFor,
        note: pos.note
      });
    }

    // Admin cầm bên lợi thế
    Game.loadPosition(pos.id, true);
    Game.myColor = pos.advantageFor;
    Game.onlineReady = true;
    UI.flipBoard(pos.advantageFor === 'b');
    
    // Update player names
    document.getElementById('whiteName').textContent = 
      pos.advantageFor === 'w' ? (Online.myName + ' 👑') : Online.opponentName;
    document.getElementById('blackName').textContent = 
      pos.advantageFor === 'b' ? (Online.myName + ' 👑') : Online.opponentName;

    UI.closeModal('challengeModal');
    UI.closeModal('adminModal');
    UI.toast('⚡ Đã áp dụng thế cờ mạnh!', 'success');
    this.pendingStrongApply = null;
  },

  deleteStrong(id) {
    if (STRONG_POSITIONS.some(p => p.id === id)) {
      UI.toast('Không thể xóa thế cờ mặc định', 'error'); return;
    }
    if (!confirm('Xóa thế cờ này?')) return;
    let custom = JSON.parse(localStorage.getItem(Storage.KEY_STRONG) || '[]');
    custom = custom.filter(p => p.id !== id);
    Storage.saveStrongPositions(custom);
    this.refreshStrongList();
    UI.toast('Đã xóa', 'success');
  },

  refreshPositionsList() {
    const list = document.getElementById('adminPositionsGrid');
    if (!list) return;
    const positions = Storage.getPositions();
    if (positions.length === 0) {
      list.innerHTML = '<div style="color:#888;text-align:center;padding:20px">Chưa có</div>';
      return;
    }
    list.innerHTML = positions.map(p => `
      <div class="position-card">
        <div class="pos-info" onclick="Game.loadPosition('${p.id}');UI.closeModal('adminModal')">
          <div class="pos-name">${p.name}</div>
          <div class="pos-desc">${p.desc || ''}</div>
        </div>
        <button class="pos-del" onclick="event.stopPropagation();Admin.deletePosition('${p.id}')">🗑</button>
      </div>
    `).join('');
  },

  refreshPublicPositions() {
    const panel = document.getElementById('positionsPanel');
    const list = document.getElementById('positionsList');
    if (!panel || !list) return;
    const positions = Storage.getPositions();
    if (positions.length === 0) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    list.innerHTML = positions.map(p => `
      <div class="position-card" onclick="Game.loadPosition('${p.id}')">
        <div class="pos-info">
          <div class="pos-name">${p.name}</div>
          <div class="pos-desc">${p.desc || ''}</div>
        </div>
      </div>
    `).join('');
  },

  addPosition() {
    const name = document.getElementById('posName').value.trim();
    const desc = document.getElementById('posDesc').value.trim();
    const fen = document.getElementById('posFen').value.trim();
    const type = document.getElementById('posType').value;
    if (!name || !fen) { UI.toast('Cần tên và FEN', 'error'); return; }

    try { ChessEngine.loadFromFen(fen); }
    catch { UI.toast('FEN không hợp lệ', 'error'); return; }

    if (type === 'strong') {
      const advantageFor = document.getElementById('posAdvantage').value;
      const note = document.getElementById('posNote').value.trim();
      const custom = JSON.parse(localStorage.getItem(Storage.KEY_STRONG) || '[]');
      custom.push({
        id: 'strong-custom-' + Date.now(),
        name, desc, fen, advantageFor, note, eval: advantageFor === 'w' ? 500 : -500
      });
      Storage.saveStrongPositions(custom);
      UI.toast('Đã thêm thế cờ mạnh', 'success');
      this.refreshStrongList();
    } else {
      const custom = JSON.parse(localStorage.getItem(Storage.KEY_POSITIONS) || '[]');
      custom.push({ id: 'custom-' + Date.now(), name, desc, fen });
      Storage.saveCustomPositions(custom);
      UI.toast('Đã thêm thế cờ', 'success');
      this.refreshPositionsList();
      this.refreshPublicPositions();
    }

    document.getElementById('posName').value = '';
    document.getElementById('posDesc').value = '';
    document.getElementById('posFen').value = '';
    document.getElementById('posNote').value = '';
  },

  deletePosition(id) {
    if (DEFAULT_POSITIONS.some(p => p.id === id)) {
      UI.toast('Không thể xóa thế cờ mặc định', 'error'); return;
    }
    if (!confirm('Xóa?')) return;
    let custom = JSON.parse(localStorage.getItem(Storage.KEY_POSITIONS) || '[]');
    custom = custom.filter(p => p.id !== id);
    Storage.saveCustomPositions(custom);
    this.refreshPositionsList();
    this.refreshPublicPositions();
  },

  captureFen() {
    document.getElementById('posFen').value = ChessEngine.toFen();
    UI.toast('Đã lấy FEN hiện tại', 'success');
  },

  refreshUsersList() {
    const list = document.getElementById('adminUsersGrid');
    if (!list) return;
    const users = Storage.getUsers();
    list.innerHTML = Object.entries(users).map(([name, u]) => `
      <div class="position-card">
        <div class="pos-info">
          <div class="pos-name">${name} ${u.role === 'admin' ? '👑' : ''}</div>
          <div class="pos-desc">Vai trò: ${u.role}</div>
        </div>
      </div>
    `).join('');
  }
};

// Hiện/ẩn options thế cờ mạnh
document.addEventListener('DOMContentLoaded', () => {
  const posType = document.getElementById('posType');
  if (posType) {
    posType.addEventListener('change', () => {
      document.getElementById('strongOptions').style.display = 
        posType.value === 'strong' ? 'block' : 'none';
    });
  }
});
