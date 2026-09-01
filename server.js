// server.js - CORS Proxy Server
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Proxy POST - Dùng cho các API gửi OTP
app.post('/api/proxy', async (req, res) => {
    try {
        const { url, method, headers, body, timeout = 15000 } = req.body;
        
        const response = await axios({
            url: url,
            method: method || 'POST',
            headers: headers || { 'Content-Type': 'application/json' },
            data: body || {},
            timeout: timeout,
            validateStatus: () => true // Không throw lỗi http
        });
        
        res.json({
            status: response.status,
            data: response.data,
            headers: response.headers
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            code: error.code || 'UNKNOWN'
        });
    }
});

// Proxy GET
app.get('/api/proxy', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'Missing url parameter' });
        }
        
        const response = await axios.get(url, { 
            timeout: 15000,
            validateStatus: () => true
        });
        
        res.json({
            status: response.status,
            data: response.data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 SPAM SMS PRO Proxy running on port ${PORT}`);
    console.log(`📱 Open: http://localhost:${PORT}`);
});
