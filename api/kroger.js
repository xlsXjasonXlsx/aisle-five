export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // vercel.json rewrites /api/kroger/:path* → /api/kroger?__path=:path*
  // Vercel merges original query params, so req.query has both __path and any filter.* params
  const allQuery = { ...req.query };
  const krogerPath = '/' + (allQuery.__path || '');
  delete allQuery.__path;

  const qs = Object.keys(allQuery).length
    ? '?' + new URLSearchParams(allQuery).toString()
    : '';

  const url = `https://api-ce.kroger.com${krogerPath}${qs}`;

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
