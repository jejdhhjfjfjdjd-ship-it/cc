const axios = require('axios');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { url, method, headers, body } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'Missing url parameter' });
        }

        const response = await axios({
            url: url,
            method: method || 'POST',
            headers: headers || { 'Content-Type': 'application/json' },
            data: body || {},
            timeout: 15000,
            validateStatus: () => true
        });

        res.json({
            status: response.status,
            data: response.data
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            code: error.code || 'UNKNOWN'
        });
    }
};
