// language: JavaScript, file: app/page.js
"use client";
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputKey, setInputKey] = useState("");
  const [duration, setDuration] = useState("3600000");

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      const list = Object.entries(data).map(([key, val]) => ({ key, expire: val }));
      list.sort((a, b) => b.expire - a.expire);
      setKeys(list);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const createKey = async () => {
    let finalKey = inputKey.trim().toUpperCase() || "U3-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    let expireTime = Date.now() + parseInt(duration);
    
    await fetch("/api/keys", {
      method: "POST",
      body: JSON.stringify({ key: finalKey, expire: expireTime })
    });
    
    setInputKey("");
    fetchKeys();
  };

  const deleteKey = async (keyToDelete) => {
    if (!confirm("Xóa key này?")) return;
    await fetch("/api/keys", {
      method: "DELETE",
      body: JSON.stringify({ key: keyToDelete })
    });
    fetchKeys();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#fff', padding: '40px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', background: 'linear-gradient(90deg, #4facfe, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '30px' }}>
          ❄️ U3 LICENSE SERVER
        </h1>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <input 
            placeholder="Nhập key tự chọn..." 
            value={inputKey} onChange={e => setInputKey(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #333', background: '#161b22', color: '#fff' }}
          />
          <select value={duration} onChange={e => setDuration(e.target.value)} style={{ padding: '10px', borderRadius: '8px', background: '#161b22', color: '#fff', border: '1px solid #333' }}>
            <option value="3600000">1 Giờ</option>
            <option value="86400000">1 Ngày</option>
            <option value="604800000">1 Tuần</option>
          </select>
          <button onClick={createKey} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#4facfe', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
            + Tạo Key
          </button>
        </div>

        {loading ? <p>Đang tải...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#161b22', borderRadius: '12px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#0d1117', textAlign: 'left', borderBottom: '1px solid #333' }}>
                <th style={{ padding: '15px' }}>Key</th>
                <th style={{ padding: '15px' }}>Hết hạn</th>
                <th style={{ padding: '15px' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>Chưa có key nào</td></tr> : null}
              {keys.map(item => (
                <tr key={item.key} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '15px', color: '#4facfe', fontWeight: 'bold' }}>{item.key}</td>
                  <td style={{ padding: '15px', fontSize: '14px', opacity: 0.8 }}>{new Date(item.expire).toLocaleString('vi-VN')}</td>
                  <td style={{ padding: '15px' }}>
                    <button onClick={() => deleteKey(item.key)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ff4d4d', background: 'transparent', color: '#ff4d4d', cursor: 'pointer' }}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
