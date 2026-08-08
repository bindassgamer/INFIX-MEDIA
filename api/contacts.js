const { readSubmissions, writeSubmissions, verifyToken } = require('./_helpers');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const contactSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  email: String,
  phone: String,
  business: String,
  service: String,
  budget: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

let ContactModel;
function getContactModel() {
  if (!ContactModel) {
    ContactModel = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
  }
  return ContactModel;
}

async function connectIfNeeded() {
  if (!MONGODB_URI) return false;
  if (mongoose.connection.readyState === 1) return true;
  await mongoose.connect(MONGODB_URI, { keepAlive: true });
  return true;
}

module.exports = async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      const connected = await connectIfNeeded();
      if (connected) {
        const Contact = getContactModel();
        const results = await Contact.find({}).sort({ timestamp: -1 }).lean();
        return res.json({ success: true, data: results });
      }
    } catch (err) {
      console.error('Mongo fetch failed, falling back to file:', err.message || err);
    }

    const submissions = await readSubmissions();
    return res.json({ success: true, data: submissions });
  }

  if (req.method === 'DELETE') {
    const id = req.query && req.query.id;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });

    try {
      const connected = await connectIfNeeded();
      if (connected) {
        const Contact = getContactModel();
        const result = await Contact.findOneAndDelete({ id });
        if (!result) return res.status(404).json({ success: false, message: 'Not found' });
        return res.json({ success: true, message: 'Deleted' });
      }
    } catch (err) {
      console.error('Mongo delete failed, falling back to file:', err.message || err);
    }

    let submissions = await readSubmissions();
    const filtered = submissions.filter(s => s.id !== id);
    if (filtered.length === submissions.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (await writeSubmissions(filtered)) return res.json({ success: true, message: 'Deleted' });
    return res.status(500).json({ success: false, message: 'Failed to delete' });
  }

  res.status(405).json({ success: false, message: 'Method not allowed' });
};
