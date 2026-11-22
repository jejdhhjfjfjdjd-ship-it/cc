import { getKeys, setKeys, ADMIN_SECRET } from './_db.js';
import { v4 as uuid } from 'uuid'; // Vercel có sẵn uuid hoặc npm i uuid

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return res.status(403).json({ ok: false, error: "Admin denied" });

  const keys = await getKeys();

  if (req.method === 'GET') {
    return res.json({ ok: true, keys });
  }

  if (req.method === 'POST') {
    const { label } = req.body || {};
    const key = "ttan_" + uuid().replace(/-/g, "").slice(0, 32);
    keys[key] = { id: key, label: label || "untitled", created: Date.now(), active: true };
    await setKeys(keys);
    return res.json({ ok: true, key });
  }

  if (req.method === 'DELETE') {
    const { key } = req.query;
    if (keys[key]) {
      keys[key].active = false;
      await setKeys(keys);
    }
    return res.json({ ok: true });
  }

  res.status(405).end();
}
