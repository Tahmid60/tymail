export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { targetUrl } = req.query;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing targetUrl parameter' });
  }

  try {
    // Forward essential headers from client
    const headers = {};
    const forward = ['content-type', 'authorization', 'accept', 'accept-language', 'user-agent'];
    forward.forEach(h => {
      const val = req.headers[h];
      if (val) headers[h] = val;
    });
    if (!headers['accept']) headers['accept'] = 'application/json';

    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Handle body for mutating methods
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        fetchOptions.body = req.body;
      } else {
        fetchOptions.body = JSON.stringify(req.body);
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    const status = response.status;
    const contentType = response.headers.get('content-type') || '';

    // Read upstream body as text first
    const text = await response.text();

    let data;
    if (!text.trim()) {
      // Empty body (e.g. 204 No Content on delete)
      data = {};
    } else if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { _raw: text, _parseError: true };
      }
    } else {
      // Wrap non-JSON so client always gets valid JSON
      data = { _raw: text, _contentType: contentType };
    }

    return res.status(status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
