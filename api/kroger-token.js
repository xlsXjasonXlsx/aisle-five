const CLIENT_ID     = process.env.VITE_KROGER_CLIENT_ID     || 'aislefive-bbcd2xzm';
const CLIENT_SECRET = process.env.VITE_KROGER_CLIENT_SECRET || 'CQY6wH8Qa06T2N5QTofVFTYYyeoHtlNXCd6CTV1W';

export default async function handler(req, res) {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const upstream = await fetch('https://api-ce.kroger.com/v1/connect/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  });
  const text = await upstream.text();
  res.status(upstream.status);
  res.setHeader('content-type', 'application/json');
  res.send(text);
}
