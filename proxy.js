export default async function handler(req, res) {
  // Only allow GET
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { domain, path } = req.query;

  if (!domain || !path) {
    return res.status(400).json({ error: 'Missing domain or path parameter' });
  }

  // Validate domain to prevent SSRF — only alphanumeric and hyphens
  if (!/^[a-zA-Z0-9-]+$/.test(domain)) {
    return res.status(400).json({ error: 'Invalid domain' });
  }

  const auth = req.headers['x-gorgias-auth'];
  if (!auth || !auth.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  try {
    const targetUrl = `https://${domain}.gorgias.com/api${path}`;
    const response = await fetch(targetUrl, {
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (err) {
    return res.status(502).json({ error: `Proxy error: ${err.message}` });
  }
}
