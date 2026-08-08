const { signToken } = require('./_helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  try {
    // safe body access
    let body = {};
    try { if (req && typeof req.body !== 'undefined' && req.body) body = req.body; } catch (e) { /* ignore */ }
    if (!body || Object.keys(body).length === 0) {
      body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (c) => (data += c));
        req.on('end', () => {
          if (!data) return resolve({});
          try { if (data.charCodeAt(0) === 0xFEFF) data = data.slice(1); resolve(JSON.parse(data)); } catch (e) { return reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
      }).catch(() => ({}));
    }

    const { username, password } = body || {};
    const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'LuxuryGold@2026';
    if (username === expectedUsername && password === expectedPassword) {
      const token = signToken({ username });
      return res.json({ success: true, token, message: 'Login successful' });
    }
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
