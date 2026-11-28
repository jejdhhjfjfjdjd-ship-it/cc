// Vercel Serverless Function — mọi thứ đi qua /api?op=...
const crypto = require('crypto');
const KVU = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KVT = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const AP = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.SECRET || (AP ? crypto.createHash('sha256').update('cvn|' + AP).digest('hex') : '');
const SEED = [
  ['Chiếu hết hàng cuối', 'Trắng đi: Ra8# chiếu hết ngay.', '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1'],
  ['Chiếu hết bằng Hậu', 'Trắng đi: Qf8# (Hậu + Vua).', '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1'],
  ['Chiếu hết "Mẹo học trò"', 'Trắng đi: Qxf7# sau 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6??', 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'],
  ['Thế Lucena', 'Tàn cuộc Xe: Trắng thắng bằng kỹ thuật "xây cầu".', '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1'],
  ['Ván Opera – Morphy 1858', 'Thế cuối sau 16.Rd8# (Đen bị chiếu hết).', '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17'],
  ['Ván Bất Tử – Anderssen 1851', 'Thế cuối: Trắng chiếu hết chỉ với 3 quân nhẹ.', 'r1bk3r/p2pBpNp/n4n2/1p1NP2P/6P1/3P4/P1P1K3/q5b1 b - - 1 23']
].map(([name, desc, fen], i) => ({ id: 's' + (i + 1), name, desc, fen }));
const FEN = /^([pnbrqkPNBRQK1-8]+\/){7}[pnbrqkPNBRQK1-8]+ [wb]\b/;
const err = (m, status) => Object.assign(new Error(m), { status });

async function kv(...cmd) {
  if (!KVU || !KVT) throw err('Chưa kết nối Upstash Redis (KV). Xem hướng dẫn deploy.', 503);
  const r = await fetch(KVU, { method: 'POST', headers: { Authorization: 'Bearer ' + KVT }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const sign = o => {
  if (!SECRET) throw err('Server chưa đặt biến môi trường ADMIN_PASSWORD', 503);
  const b = Buffer.from(JSON.stringify(o)).toString('base64url');
  return b + '.' + crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
};
const unsign = t => {
  const [b, s] = String(t || '').split('.');
  if (!SECRET || !b || !s) return null;
  const e = crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
  if (e.length !== s.length || !crypto.timingSafeEqual(Buffer.from(e), Buffer.from(s))) return null;
  try { const o = JSON.parse(Buffer.from(b, 'base64url')); return o.exp > Date.now() ? o : null; } catch { return null; }
};
const hash = (p, s) => crypto.scryptSync(p, s, 32).toString('hex');
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const wait = ms => new Promise(r => setTimeout(r, ms));
async function readBody(req) {
  if (req.body !== undefined && req.body !== null) { try { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body; } catch { return {}; } }
  let d = ''; for await (const c of req) { d += c; if (d.length > 2e5) break; }
  try { return JSON.parse(d || '{}'); } catch { return {}; }
}
async function getPos() { const r = await kv('GET', 'positions'); return r ? JSON.parse(r) : SEED; }

module.exports = async (req, res) => {
  const send = (c, o) => { res.statusCode = c; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(o)); };
  try {
    const u = new URL(req.url, 'http://x'), op = u.searchParams.get('op'), q = k => u.searchParams.get(k);
    const b = await readBody(req);
    const usr = unsign(req.headers['x-token']), adm = unsign(req.headers['x-admin']);
    const isU = usr && usr.k === 'usr' ? usr : null, isA = !!(adm && adm.k === 'adm');
    switch (op) {
      case 'register': {
        const name = String(b.username || '').trim(), pw = String(b.password || '');
        if (!/^[\p{L}\d_.-]{3,20}$/u.test(name)) throw err('Tên 3–20 ký tự (chữ, số, _ . -)', 400);
        if (pw.length < 6) throw err('Mật khẩu tối thiểu 6 ký tự', 400);
        const salt = crypto.randomBytes(16).toString('hex');
        const ok = await kv('SET', 'user:' + name.toLowerCase(), JSON.stringify({ name, salt, hash: hash(pw, salt), created: Date.now() }), 'NX');
        if (!ok) throw err('Tên đã tồn tại', 409);
        return send(200, { token: sign({ k: 'usr', u: name, exp: Date.now() + 7 * 864e5 }), user: { name } });
      }
      case 'login': {
        const name = String(b.username || '').trim(), r = await kv('GET', 'user:' + name.toLowerCase()), x = r && JSON.parse(r);
        if (!x || hash(String(b.password || ''), x.salt) !== x.hash) { await wait(500); throw err('Sai tên hoặc mật khẩu', 401); }
        return send(200, { token: sign({ k: 'usr', u: x.name, exp: Date.now() + 7 * 864e5 }), user: { name: x.name } });
      }
      case 'admin': {
        if (!AP) throw err('Server chưa đặt biến môi trường ADMIN_PASSWORD', 503);
        if (!crypto.timingSafeEqual(sha(b.password || ''), sha(AP))) { await wait(700); throw err('Sai mật khẩu admin', 401); }
        return send(200, { token: sign({ k: 'adm', exp: Date.now() + 12 * 36e5 }) });
      }
      case 'me': return send(200, { user: isU ? { name: isU.u } : null, admin: isA });
      case 'positions': return send(200, KVU ? await getPos() : SEED);
      case 'addpos': {
        if (!isA) throw err('Cần quyền admin', 403);
        if (typeof b.fen !== 'string' || !FEN.test(b.fen.trim())) throw err('FEN không hợp lệ', 400);
        const list = await getPos(), it = { id: crypto.randomUUID(), name: String(b.name || 'Thế cờ').slice(0, 60), desc: String(b.desc || '').slice(0, 200), fen: b.fen.trim() };
        list.push(it); await kv('SET', 'positions', JSON.stringify(list)); return send(200, it);
      }
      case 'delpos': {
        if (!isA) throw err('Cần quyền admin', 403);
        await kv('SET', 'positions', JSON.stringify((await getPos()).filter(x => x.id !== b.id))); return send(200, { ok: 1 });
      }
      case 'powtoken': {
        if (!isA) throw err('Cần quyền admin', 403);
        return send(200, { tok: sign({ k: 'pow', room: String(q('room') || '').toUpperCase().slice(0, 12), exp: Date.now() + 4 * 36e5 }) });
      }
      case 'verify': {
        const o = unsign(q('tok'));
        return send(200, { ok: !!(o && o.k === 'pow' && o.room === String(q('room') || '').toUpperCase()) });
      }
      default: return send(404, { error: 'Không có thao tác này' });
    }
  } catch (e) { send(e.status || 500, { error: e.message || 'Lỗi server' }); }
};
