import { ADMIN_SECRET } from './_db.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: "Method not allowed" });

  const { secret } = req.body || {};
  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ ok: false, error: "Wrong secret" });
  }
  
  res.json({ ok: true });
}
