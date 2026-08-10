export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { targetUrl } = req.query;
  if (!targetUrl) return res.status(400).json({ error: 'Missing targetUrl' });

  try {
    const headers = {};
    ['content-type', 'authorization', 'accept', 'accept-language', 'user-agent'].forEach(h => {
      if (req.headers[h]) headers[h] = req.headers[h];
    });
    if (!headers['accept']) headers['accept'] = 'application/json';

    const fetchOptions = { method: req.method, headers };
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();
    let data;
    if (!text.trim()) {
      data = {};
    } else {
      try { data = JSON.parse(text); } catch { data = { _raw: text }; }
    }
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
