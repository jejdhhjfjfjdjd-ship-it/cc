import { kv } from '@vercel/kv';

// Mặc định nếu bạn chưa set ADMIN_SECRET trên Vercel Dashboard
export const ADMIN_SECRET = process.env.ADMIN_SECRET || "change_me_please";

export const getKeys = async () => (await kv.get('ttan:keys')) || {};
export const setKeys = async (keys) => await kv.set('ttan:keys', keys);

export const getVocab = async () => (await kv.get('ttan:vocab')) || {};
export const setVocab = async (vocab) => await kv.set('ttan:vocab', vocab);

export const getStats = async () => (await kv.get('ttan:stats')) || {solves:0, learns:0, requests:0};
export const setStats = async (stats) => await kv.set('ttan:stats', stats);
