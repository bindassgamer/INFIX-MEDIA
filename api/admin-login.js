const { signToken } = require('./_helpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  try {
    const { username, password } = req.body || {};
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
