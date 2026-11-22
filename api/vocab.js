import { getVocab, setVocab, ADMIN_SECRET } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret, X-Ttan-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Phân quyền: Admin xem hết, client chỉ xem
  const isAdmin = req.headers['x-admin-secret'] === ADMIN_SECRET;
  const clientKey = req.headers['x-ttan-key'];

  const vocab = await getVocab();

  if (req.method === 'GET') {
    // Userscript gọi lấy vocab
    return res.json({ ok: true, vocab });
  }

  if (req.method === 'POST') {
    // Nếu là client push learn
    const { en, vi, source } = req.body || {};
    if (en && vi) {
      vocab[en.toLowerCase().trim()] = { vi, source: source || "client", addedAt: Date.now() };
      await setVocab(vocab);
      return res.json({ ok: true, added: true });
    }
    return res.status(400).json({ ok: false });
  }

  if (req.method === 'DELETE' && isAdmin) {
    const { en } = req.query;
    if (vocab[en]) {
      delete vocab[en];
      await setVocab(vocab);
    }
    return res.json({ ok: true });
  }

  res.status(405).end();
}
