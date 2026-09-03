import app from '../server';

export default function handler(req: any, res: any) {
  // Ensure CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-password, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Normalize URL: ensure it starts with /api if it was stripped or rewritten by Vercel
  const rawUrl = req.url || '';
  if (!rawUrl.startsWith('/api')) {
    req.url = '/api' + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl);
  }

  return app(req, res);
}

