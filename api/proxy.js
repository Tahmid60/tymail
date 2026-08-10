// Use native fetch (Node 18+) or fallback
const _fetch = globalThis.fetch || require('node-fetch');

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { targetUrl } = req.query;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing targetUrl parameter' });
  }

  try {
    // ─── MANUALLY READ BODY (Vercel doesn't auto-parse) ───
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks).toString('utf-8');
    }

    // ─── BUILD HEADERS ───
    const headers = {};
    const forward = ['content-type', 'authorization', 'accept', 'accept-language', 'user-agent'];
    forward.forEach(h => {
      if (req.headers[h]) headers[h] = req.headers[h];
    });
    if (!headers['accept']) headers['accept'] = 'application/json';
    if (!headers['content-type'] && body) headers['content-type'] = 'application/json';

    // ─── CALL UPSTREAM ───
    const fetchOptions = {
      method: req.method,
      headers,
      ...(body ? { body } : {})
    };

    const response = await _fetch(targetUrl, fetchOptions);
    const status = response.status;
    const contentType = response.headers.get('content-type') || '';

    // ─── READ RESPONSE ───
    const text = await response.text();

    let data;
    if (!text.trim()) {
      data = { _empty: true }; // 204 No Content
    } else if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { _raw: text, _parseError: true };
      }
    } else {
      data = { _raw: text, _contentType: contentType };
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(status).json(data);

  } catch (error) {
    console.error('PROXY ERROR:', error.message);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
