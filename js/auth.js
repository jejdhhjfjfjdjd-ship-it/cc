const Auth = {
  currentUser: null,

  init() {
    const session = Storage.getSession();
    if (session) {
      const users = Storage.getUsers();
      if (users[session]) {
        this.currentUser = { username: session, ...users[session] };
        this.updateUI();
      }
    }
  },

  login() {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    if (!username || !password) { UI.toast('Nhập đầy đủ', 'error'); return; }
    const users = Storage.getUsers();
    if (!users[username]) { UI.toast('Tài khoản không tồn tại', 'error'); return; }
    if (users[username].password !== password) { UI.toast('Sai mật khẩu', 'error'); return; }
    Storage.setSession(username);
    this.currentUser = { username, ...users[username] };
    this.updateUI();
    UI.closeModal('authModal');
    UI.toast('Đăng nhập thành công!', 'success');
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
  },

  register() {
    const username = document.getElementById('regUser').value.trim();
    const password = document.getElementById('regPass').value;
    const password2 = document.getElementById('regPass2').value;
    if (username.length < 3) { UI.toast('Tên ≥ 3 ký tự', 'error'); return; }
    if (password.length < 4) { UI.toast('Mật khẩu ≥ 4 ký tự', 'error'); return; }
    if (password !== password2) { UI.toast('Mật khẩu không khớp', 'error'); return; }
    const users = Storage.getUsers();
    if (users[username]) { UI.toast('Tên đã tồn tại', 'error'); return; }
    users[username] = { password, role: 'user', createdAt: Date.now() };
    Storage.saveUsers(users);
    Storage.setSession(username);
    this.currentUser = { username, ...users[username] };
    this.updateUI();
    UI.closeModal('authModal');
    UI.toast('Tạo tài khoản thành công!', 'success');
    document.getElementById('regUser').value = '';
    document.getElementById('regPass').value = '';
    document.getElementById('regPass2').value = '';
  },

  logout() {
    Storage.clearSession();
    this.currentUser = null;
    this.updateUI();
    UI.toast('Đã đăng xuất', 'success');
  },

  isAdmin() { return this.currentUser?.role === 'admin'; },

  updateUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userTag = document.getElementById('userTag');
    const adminBtn = document.getElementById('adminBtn');
    if (this.currentUser) {
      loginBtn.style.display = 'none';
      userTag.style.display = 'flex';
      document.getElementById('userName').textContent = this.currentUser.username;
      adminBtn.style.display = this.isAdmin() ? 'inline-block' : 'none';
    } else {
      loginBtn.style.display = 'inline-block';
      userTag.style.display = 'none';
      adminBtn.style.display = 'none';
    }
    Admin.refreshPublicPositions();
  },

  switchTab(tab) {
    document.querySelectorAll('#authModal .tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`#authModal .tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById('loginTab').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerTab').style.display = tab === 'register' ? 'block' : 'none';
  },

  ensureAdmin() {
    const users = Storage.getUsers();
    if (!users['admin']) {
      users['admin'] = {
        password: CONFIG.ADMIN_PASSWORD,
        role: 'admin',
        createdAt: Date.now(),
      };
      Storage.saveUsers(users);
    }
  }
};
