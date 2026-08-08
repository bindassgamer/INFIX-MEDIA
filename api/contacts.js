const { readSubmissions, writeSubmissions, verifyToken } = require('./_helpers');

module.exports = async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const submissions = await readSubmissions();
    return res.json({ success: true, data: submissions });
  }

  if (req.method === 'DELETE') {
    const id = req.query && req.query.id;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    let submissions = await readSubmissions();
    const filtered = submissions.filter(s => s.id !== id);
    if (filtered.length === submissions.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (await writeSubmissions(filtered)) return res.json({ success: true, message: 'Deleted' });
    return res.status(500).json({ success: false, message: 'Failed to delete' });
  }

  res.status(405).json({ success: false, message: 'Method not allowed' });
};
