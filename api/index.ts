let cachedApp: any = null;

async function getApp() {
  if (cachedApp) return cachedApp;
  try {
    const mod = await import('../server.ts');
    cachedApp = mod.default || mod;
    return cachedApp;
  } catch {
    try {
      const mod = await import('../server.js');
      cachedApp = mod.default || mod;
      return cachedApp;
    } catch {
      const mod = await import('../server');
      cachedApp = mod.default || mod;
      return cachedApp;
    }
  }
}

export default async function handler(req: any, res: any) {
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

  try {
    const app = await getApp();

    // Normalize URL: ensure it starts with /api if it was stripped or rewritten by Vercel
    const rawUrl = req.url || '';
    if (!rawUrl.startsWith('/api')) {
      req.url = '/api' + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl);
    }

    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel API Handler Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Internal Serverless Function Error',
      });
    }
  }
}


