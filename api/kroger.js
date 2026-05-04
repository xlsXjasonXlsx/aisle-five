const CLIENT_ID     = process.env.VITE_KROGER_CLIENT_ID     || 'aislefive-bbcd2xzm';
const CLIENT_SECRET = process.env.VITE_KROGER_CLIENT_SECRET || 'CQY6wH8Qa06T2N5QTofVFTYYyeoHtlNXCd6CTV1W';

export default async function handler(req, res) {
  const allQuery = { ...req.query };
  const krogerPath = '/' + (allQuery.__path || '');
  delete allQuery.__path;

  const qs = Object.keys(allQuery).length
    ? '?' + new URLSearchParams(allQuery).toString()
    : '';

  const url = `https://api-ce.kroger.com${krogerPath}${qs}`;

  const headers = {};

  // Token endpoint: build Basic auth from env vars (avoids header-forwarding issues)
  if (krogerPath === '/v1/connect/oauth2/token') {
    console.log('[kroger-proxy] token request — CLIENT_ID:', CLIENT_ID ? CLIENT_ID.slice(0, 8) + '…' : 'MISSING');
    const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    headers['authorization'] = `Basic ${creds}`;
  } else if (req.headers['authorization']) {
    headers['authorization'] = req.headers['authorization'];
  }

  // Reconstruct body for POST requests
  // Vercel's default body parser converts x-www-form-urlencoded into req.body object
  let body;
  if (req.method === 'POST' && req.body) {
    if (typeof req.body === 'object') {
      body = new URLSearchParams(req.body).toString();
      headers['content-type'] = 'application/x-www-form-urlencoded';
    } else {
      body = String(req.body);
      if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
    }
  }

  console.log('[kroger-proxy]', req.method, url, '→ sending');
  const upstream = await fetch(url, { method: req.method, headers, body });
  console.log('[kroger-proxy] response status:', upstream.status);
  const text = await upstream.text();
  res.status(upstream.status);
  const ct = upstream.headers.get('content-type');
  if (ct) res.setHeader('content-type', ct);
  res.send(text);
}
