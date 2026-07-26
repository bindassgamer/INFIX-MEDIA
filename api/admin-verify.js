const { verifyToken } = require('./_helpers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const auth = req.headers.authorization || '';
  const token = auth.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  res.json({ success: true, message: 'Session valid' });
};
