const Music = {
  // ===== DANH SÁCH NHẠC — BẠN CHỈNH SỬA ĐƯỜNG DẪN Ở ĐÂY =====
  // Chỉ cần bỏ file .mp3 vào thư mục music/ và đổi tên cho khớp
  tracks: [
    {
      name: 'Nhạc nền 1 — Chill',
      artist: 'Thư giãn khi chơi cờ',
      src: 'music/nhac1.mp3'
    },
    {
      name: 'Nhạc nền 2 — Tập trung',
      artist: 'Nhạc không lời, tăng tập trung',
      src: 'music/nhac2.mp3'
    },
    {
      name: 'Nhạc nền 3 — Sôi động',
      artist: 'Nhạc hào hứng, kịch tính',
      src: 'music/nhac3.mp3'
    },
    {
      name: 'Nhạc nền 4 — Piano',
      artist: 'Piano nhẹ nhàng',
      src: 'music/nhac4.mp3'
    },
    {
      name: 'Nhạc nền 5 — Lofi',
      artist: 'Lofi beat thư giãn',
      src: 'music/nhac5.mp3'
    }
  ],

  audio: null,
  currentIndex: -1,
  isPlaying: false,
  isMuted: false,
  volume: 0.5,
  panelOpen: false,

  init() {
    // Tạo audio element
    this.audio = new Audio();
    this.audio.loop = false;
    this.audio.volume = this.volume;

    // Load settings từ localStorage
    const saved = JSON.parse(localStorage.getItem('chess_music') || '{}');
    if (saved.volume !== undefined) {
      this.volume = saved.volume;
      this.audio.volume = saved.volume;
      document.getElementById('musicVolume').value = saved.volume * 100;
    }
    if (saved.muted) {
      this.isMuted = true;
      this.audio.muted = true;
      document.getElementById('muteBtn').textContent = '🔇';
    }

    // Events
    this.audio.addEventListener('ended', () => this.next());
    this.audio.addEventListener('error', () => {
      console.warn('Không tải được nhạc:', this.audio.src);
    });

    // Render playlist
    this.renderPlaylist();

    // Auto-play nhạc đầu tiên khi vào web (có thể bị chặn bởi trình duyệt)
    this.autoPlayOnLoad();

    // Lưu volume khi thay đổi
    document.getElementById('musicVolume').addEventListener('change', () => this.saveSettings());
  },

  autoPlayOnLoad() {
    // Cố gắng autoplay, nếu bị chặn thì chờ user click lần đầu
    if (this.tracks.length === 0) return;

    this.currentIndex = 0;
    this.audio.src = this.tracks[0].src;
    this.updateUI();

    const tryPlay = () => {
      this.audio.play().then(() => {
        this.isPlaying = true;
        this.updateUI();
        this.showToast('🎵 Nhạc nền đã bật');
      }).catch(() => {
        // Bị chặn autoplay → chờ user click vào đâu đó
        console.log('Autoplay bị chặn, chờ user tương tác...');
        const resume = () => {
          this.audio.play().then(() => {
            this.isPlaying = true;
            this.updateUI();
          }).catch(() => {});
          document.removeEventListener('click', resume);
          document.removeEventListener('keydown', resume);
        };
        document.addEventListener('click', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
      });
    };
    tryPlay();
  },

  renderPlaylist() {
    const list = document.getElementById('musicPlaylist');
    if (!list) return;
    list.innerHTML = this.tracks.map((t, i) => `
      <div class="track ${i === this.currentIndex ? 'playing' : ''}" 
           data-index="${i}" onclick="Music.playTrack(${i})">
        <div class="track-icon">${i === this.currentIndex && this.isPlaying ? '♪' : '🎵'}</div>
        <div class="track-info">
          <div class="track-name">${this.escape(t.name)}</div>
          <div class="track-artist">${this.escape(t.artist)}</div>
        </div>
      </div>
    `).join('');
  },

  playTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    this.currentIndex = index;
    this.audio.src = this.tracks[index].src;
    this.audio.play().then(() => {
      this.isPlaying = true;
      this.updateUI();
    }).catch(err => {
      console.warn('Không phát được:', err);
      this.showToast('❌ Không tải được file nhạc. Kiểm tra đường dẫn!', 'error');
    });
  },

  togglePlay() {
    if (this.currentIndex === -1) {
      this.playTrack(0);
      return;
    }
    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    } else {
      this.audio.play().then(() => {
        this.isPlaying = true;
        this.updateUI();
      }).catch(err => {
        this.showToast('❌ Lỗi phát nhạc', 'error');
      });
    }
    this.updateUI();
  },

  next() {
    if (this.tracks.length === 0) return;
    const nextIndex = (this.currentIndex + 1) % this.tracks.length;
    this.playTrack(nextIndex);
  },

  prev() {
    if (this.tracks.length === 0) return;
    const prevIndex = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
    this.playTrack(prevIndex);
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;
    document.getElementById('muteBtn').textContent = this.isMuted ? '🔇' : '🔊';
    this.saveSettings();
  },

  setVolume(val) {
    this.volume = val / 100;
    this.audio.volume = this.volume;
    if (this.volume > 0 && this.isMuted) {
      this.isMuted = false;
      this.audio.muted = false;
      document.getElementById('muteBtn').textContent = '🔊';
    }
    this.saveSettings();
  },

  togglePanel() {
    this.panelOpen = !this.panelOpen;
    document.getElementById('musicPanel').classList.toggle('show', this.panelOpen);
  },

  updateUI() {
    const playBtn = document.getElementById('musicPlayBtn');
    const disc = document.getElementById('musicDisc');
    const title = document.getElementById('musicTitle');
    const sub = document.getElementById('musicSub');
    const muteBtn = document.getElementById('muteBtn');

    playBtn.textContent = this.isPlaying ? '⏸' : '▶';
    disc.classList.toggle('spinning', this.isPlaying);
    muteBtn.textContent = this.isMuted ? '🔇' : '🔊';

    if (this.currentIndex >= 0 && this.tracks[this.currentIndex]) {
      const t = this.tracks[this.currentIndex];
      title.textContent = t.name;
      sub.textContent = this.isPlaying ? '🎶 Đang phát...' : '⏸ Tạm dừng';
    } else {
      title.textContent = 'Chưa chọn nhạc';
      sub.textContent = 'Bấm để chọn bài';
    }

    this.renderPlaylist();
  },

  saveSettings() {
    localStorage.setItem('chess_music', JSON.stringify({
      volume: this.volume,
      muted: this.isMuted,
    }));
  },

  showToast(msg, type = '') {
    if (typeof UI !== 'undefined' && UI.toast) UI.toast(msg, type);
  },

  escape(s) {
    return String(s).replace(/[&<>"']/g, c => 
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
};
