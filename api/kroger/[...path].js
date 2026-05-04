export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  // req.query.path = ['v1', 'connect', 'oauth2', 'token'] etc.
  const pathParts = req.query.path || [];
  const pathStr = '/' + pathParts.join('/');

  // Preserve query string (e.g. filter.zipCode=...)
  const qIdx = req.url.indexOf('?');
  const qs = qIdx !== -1 ? req.url.slice(qIdx) : '';

  const url = `https://api-ce.kroger.com${pathStr}${qs}`;

  const headers = {};
  if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'];
  if (req.headers['content-type'])  headers['content-type']  = req.headers['content-type'];

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  const upstream = await fetch(url, { method: req.method, headers, body });
  const text = await upstream.text();

  res.status(upstream.status);
  const ct = upstream.headers.get('content-type');
  if (ct) res.setHeader('content-type', ct);
  res.send(text);
}
