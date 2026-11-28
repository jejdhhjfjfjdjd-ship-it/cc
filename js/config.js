const CONFIG = {
  ADMIN_PASSWORD: 'admin123',
  DEFAULT_CLOCK: 600,
  AI_DEPTH: 2,
  PEER_PREFIX: 'chess-vn-',
};

// ===== THẾ CỜ MẠNH (chỉ admin) =====
const STRONG_POSITIONS = [
  {
    id: 'strong-1',
    name: '⚡ Chiếu hết hàng cuối',
    desc: 'Thắng ngay 1 nước',
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    advantageFor: 'w',
    eval: 9900,
    note: 'Ra1-a8# chiếu hết ngay',
  },
  {
    id: 'strong-2',
    name: '⚡ Hậu vs Xe (thắng chắc)',
    desc: 'Endgame Hậu thắng Xe',
    fen: '8/8/8/8/3Q4/8/6k1/4K3 w - - 0 1',
    advantageFor: 'w',
    eval: 9800,
    note: 'Hậu vs Xe thắng tuyệt đối',
  },
  {
    id: 'strong-3',
    name: '⚡ Ưu 2 tốt + xe',
    desc: 'Endgame lợi thế lớn',
    fen: '8/8/8/8/8/8/5PPP/4K2R w - - 0 1',
    advantageFor: 'w',
    eval: 700,
    note: 'Xe + 3 tốt vs Vua đơn',
  },
  {
    id: 'strong-4',
    name: '⚡ Đen áp đảo',
    desc: 'Đen có Hậu + Xe',
    fen: '4k3/8/8/8/8/8/8/4K2q b - - 0 1',
    advantageFor: 'b',
    eval: -9800,
    note: 'Qh1# hoặc chiếu hết nhanh',
  },
  {
    id: 'strong-5',
    name: '⚡ Khai cuộc lợi thế',
    desc: 'Trắng có 2 xe + hậu tấn công',
    fen: 'r1bq1rk1/ppp2ppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
    advantageFor: 'w',
    eval: 350,
    note: 'Bxf7+ mở đường tấn công',
  }
];

const DEFAULT_POSITIONS = [
  {
    id: 'pos-italian',
    name: 'Khai cuộc Ý',
    desc: 'Khai cuộc cổ điển',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
  },
  {
    id: 'pos-morphy',
    name: 'Morphy vs Duke (1858)',
    desc: 'Ván cờ nổi tiếng nhất lịch sử',
    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
  }
];
