// Chạy:  ADMIN_USER=admin ADMIN_PASSWORD=matkhau node server.js   (cổng mặc định 3000)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000, AU = process.env.ADMIN_USER || 'admin', AP = process.env.ADMIN_PASSWORD || 'admin123';
const DF = path.join(__dirname, 'data.json'), PUB = path.join(__dirname, 'public'), MUS = path.join(PUB, 'music');
fs.mkdirSync(MUS, { recursive: true });

const SEED = [
  ['Chiếu hết hàng cuối', 'Trắng đi: Ra8# chiếu hết ngay.', '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'],
  ['Chiếu hết bằng Hậu', 'Trắng đi: Qf8# (Hậu + Vua).', '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1'],
  ['Chiếu hết "Mẹo học trò"', 'Trắng đi: Qxf7# sau 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6??', 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'],
  ['Thế Lucena', 'Tàn cuộc Xe: Trắng thắng bằng kỹ thuật "xây cầu".', '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1'],
  ['Ván Opera – Morphy 1858', 'Thế cuối sau 16.Rd8# (Đen bị chiếu hết).', '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17'],
  ['Ván Bất Tử – Anderssen 1851', 'Thế cuối: Trắng chiếu hết chỉ với 3 quân nhẹ.', 'r1bk3r/p2pBpNp/n4n2/1p1NP2P/6P1/3P4/P1P1K3/q5b1 b - - 1 23']
].map(([name, desc, fen]) => ({ id: crypto.randomUUID(), name, desc, fen }));

let D = { secret: crypto.randomBytes(32).toString('hex'), users: {}, positions: SEED };
try { D = { ...D, ...JSON.parse(fs.readFileSync(DF)) }; } catch { }
const save = () => { fs.writeFileSync(DF + '.tmp', JSON.stringify(D, null, 1)); fs.renameSync(DF + '.tmp', DF); };
const hash = (p, s) => crypto.scryptSync(p, s, 32).toString('hex');
const setUser = (u, p, role) => { const salt = crypto.randomBytes(16).toString('hex'); D.users[u] = { salt, hash: hash(p, salt), role, created: Date.now() }; };
if (!D.users[AU] || process.env.ADMIN_PASSWORD) setUser(AU, AP, 'admin');
save();

const sign = u => { const b = Buffer.from(u + '|' + (Date.now() + 7 * 864e5)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', D.secret).update(b).digest('base64url'); };
function who(req) {
  const [b, s] = String(req.headers['x-token'] || '').split('.');
  if (!b || !s || crypto.createHmac('sha256', D.secret).update(b).digest('base64url') !== s) return null;
  const [u, exp] = Buffer.from(b, 'base64url').toString().split('|');
  return D.users[u] && +exp > Date.now() ? { name: u, role: D.users[u].role } : null;
}
const send = (res, o, c = 200) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
const body = req => new Promise(r => { let d = ''; req.on('data', c => { d += c; if (d.length > 2e5) req.destroy(); }); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } }); });
const fails = new Map(); setInterval(() => fails.clear(), 10 * 60 * 1000);
const TOPICS = new Set(['hello', 'state', 'move', 'reset', 'pos', 'chat', 'resign', 'flag']);
const rooms = new Map();
const bc = (n, ev) => { for (const c of rooms.get(n) || []) c.res.write('data: ' + JSON.stringify(ev) + '\n\n'); };
const FEN = /^([pnbrqkPNBRQK1-8]+\/){7}[pnbrqkPNBRQK1-8]+ [wb]\b/;
const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.js': 'text/javascript' };

function serve(req, res, f) {
  const st = fs.statSync(f), type = TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream';
  const r = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (r) {
    const s = r[1] ? +r[1] : 0, e = r[2] ? Math.min(+r[2], st.size - 1) : st.size - 1;
    if (s > e || s >= st.size) { res.writeHead(416); return res.end(); }
    res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${s}-${e}/${st.size}`, 'content-length': e - s + 1 });
    return fs.createReadStream(f, { start: s, end: e }).pipe(res);
  }
  res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': st.size });
  fs.createReadStream(f).pipe(res);
}

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x'), p = u.pathname, ip = req.socket.remoteAddress;
    if (p === '/api/events') {
      const n = (u.searchParams.get('room') || '').toLowerCase();
      if (!/^[a-z0-9-]{3,24}$/.test(n)) { res.writeHead(400); return res.end(); }
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      const set = rooms.get(n) || new Set();
      if (set.size >= 2) { res.write('data: {"topic":"_full"}\n\n'); return res.end(); }
      rooms.set(n, set); const c = { res, id: String(u.searchParams.get('id') || '').slice(0, 20) }; set.add(c);
      res.write(': ok\n\n'); bc(n, { topic: '_peers', n: set.size });
      const ka = setInterval(() => res.write(': ka\n\n'), 20000);
      req.on('close', () => { clearInterval(ka); set.delete(c); if (!set.size) rooms.delete(n); else bc(n, { topic: '_peers', n: set.size }); });
      return;
    }
    if (p === '/api/emit' && req.method === 'POST') {
      const b = await body(req);
      if (TOPICS.has(b.topic) && typeof b.room === 'string' && JSON.stringify(b.data || {}).length < 8000) bc(b.room.toLowerCase(), { topic: b.topic, data: b.data, from: String(b.id).slice(0, 20) });
      return send(res, { ok: 1 });
    }
    if ((p === '/api/login' || p === '/api/register') && req.method === 'POST') {
      if ((fails.get(ip) || 0) > 15) return send(res, { error: 'Thử quá nhiều lần, hãy đợi vài phút' }, 429);
      const b = await body(req), name = String(b.username || '').trim(), pw = String(b.password || '');
      if (p === '/api/register') {
        if (!/^[\p{L}\d_.-]{3,20}$/u.test(name)) return send(res, { error: 'Tên 3–20 ký tự (chữ, số, _ . -)' }, 400);
        if (pw.length < 6) return send(res, { error: 'Mật khẩu tối thiểu 6 ký tự' }, 400);
        if (D.users[name]) return send(res, { error: 'Tên đã tồn tại' }, 409);
        setUser(name, pw, 'user'); save();
      } else {
        const x = D.users[name];
        if (!x || hash(pw, x.salt) !== x.hash) { fails.set(ip, (fails.get(ip) || 0) + 1); return send(res, { error: 'Sai tên hoặc mật khẩu' }, 401); }
      }
      return send(res, { token: sign(name), user: { name, role: D.users[name].role } });
    }
    if (p === '/api/me') { const w = who(req); return w ? send(res, w) : send(res, { error: 'Chưa đăng nhập' }, 401); }
    if (p === '/api/tracks') {
      const list = fs.readdirSync(MUS).filter(f => /\.(mp3|ogg|wav|m4a)$/i.test(f)).sort()
        .map(f => ({ name: f.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), src: 'music/' + encodeURIComponent(f) }));
      return send(res, list);
    }
    if (p === '/api/positions') {
      if (req.method === 'GET') return send(res, D.positions);
      const w = who(req);
      if (!w || w.role !== 'admin') return send(res, { error: 'Cần quyền admin' }, 403);
      if (req.method === 'POST') {
        const b = await body(req);
        if (typeof b.fen !== 'string' || !FEN.test(b.fen.trim())) return send(res, { error: 'FEN không hợp lệ' }, 400);
        const it = { id: crypto.randomUUID(), name: String(b.name || 'Thế cờ').slice(0, 60), desc: String(b.desc || '').slice(0, 200), fen: b.fen.trim() };
        D.positions.push(it); save(); return send(res, it);
      }
      if (req.method === 'DELETE') { D.positions = D.positions.filter(x => x.id !== u.searchParams.get('id')); save(); return send(res, { ok: 1 }); }
    }
    const f = path.join(PUB, decodeURIComponent(p === '/' ? 'index.html' : p));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    serve(req, res, f);
  } catch (e) { console.error(e); try { res.writeHead(500); res.end('Lỗi server'); } catch { } }
}).listen(PORT, () => console.log(`Cờ vua chạy tại http://localhost:${PORT}  | admin: ${AU}` + (AP === 'admin123' && !process.env.ADMIN_PASSWORD ? '  (⚠ mật khẩu mặc định admin123 — hãy đặt ADMIN_PASSWORD)' : '')));
