export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    hasClientId: !!process.env.VITE_KROGER_CLIENT_ID,
    hasClientSecret: !!process.env.VITE_KROGER_CLIENT_SECRET,
    clientIdPreview: process.env.VITE_KROGER_CLIENT_ID
      ? process.env.VITE_KROGER_CLIENT_ID.slice(0, 8) + '…'
      : 'MISSING',
  });
}
