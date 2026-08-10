const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const targetUrl = req.query?.targetUrl;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing targetUrl' });
  }

  try {
    // ─── READ BODY MANUALLY (Vercel does NOT auto-parse) ───
    let bodyBuffer = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      if (chunks.length > 0) {
        bodyBuffer = Buffer.concat(chunks);
      }
    }

    // ─── FORWARD HEADERS ───
    const headers = {};
    if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
    if (req.headers['accept']) headers['Accept'] = req.headers['accept'];
    
    if (bodyBuffer && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // ─── CALL UPSTREAM ───
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      ...(bodyBuffer ? { body: bodyBuffer } : {})
    });

    const text = await response.text();

    // ─── PARSE OR WRAP ───
    let data;
    const contentType = response.headers.get('content-type') || '';
    
    if (!text || !text.trim()) {
      data = {};
    } else if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { _raw: text };
      }
    } else {
      data = { _raw: text };
    }

    return res.status(response.status).json(data);

  } catch (error) {
    console.error('PROXY ERROR:', error.message, '| URL:', targetUrl);
    return res.status(500).json({ 
      error: error.message,
      targetUrl: targetUrl
    });
  }
};
