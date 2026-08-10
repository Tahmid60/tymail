// api/proxy.js
export default async function handler(req, res) {
    // Enable CORS for your own frontend frontend calls
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { targetUrl } = req.query;
    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing targetUrl parameter' });
    }

    try {
        const fetchOptions = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                ...(req.headers['authorization'] ? { 'Authorization': req.headers['authorization'] } : {})
            },
            ...(['POST', 'PUT', 'PATCH'].includes(req.method) ? { body: JSON.stringify(req.body) } : {})
        };

        const response = await fetch(targetUrl, fetchOptions);
        const contentType = response.headers.get('content-type');
        
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        return res.status(response.status).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
