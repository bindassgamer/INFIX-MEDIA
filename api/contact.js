const { readSubmissions, writeSubmissions } = require('./_helpers');
const { v4: uuidv4 } = require('uuid');
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
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  try {
    // Robust body parsing: try safe access to req.body first (catch parser errors), otherwise parse raw body
    let body = {};
    try {
      // accessing req.body can throw if body parsing fails in the runtime; catch and fallback
      if (req && typeof req.body !== 'undefined' && req.body) {
        body = req.body;
      }
    } catch (err) {
      // fallthrough to manual raw parsing
    }

    if (!body || Object.keys(body).length === 0) {
      try {
        body = await new Promise((resolve, reject) => {
          let data = '';
          req.on('data', (chunk) => (data += chunk));
          req.on('end', () => {
            if (!data) return resolve({});
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              console.error('contact: raw body parse failed, raw=', data ? (data.length > 1000 ? data.slice(0,1000) + '... (truncated)' : data) : '<empty>');
              reject(new Error('Invalid JSON'));
            }
          });
          req.on('error', reject);
        });
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid JSON' });
      }
    }

    const { name, email, phone, businessName, business, service, budget, message } = body || {};
    if (!name || !email || !phone || !service || !budget || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const finalBusiness = businessName || business || 'N/A';
    const submission = {
      id: uuidv4(),
      name,
      email,
      phone,
      business: finalBusiness,
      service,
      budget,
      message,
      timestamp: new Date()
    };

    // Try MongoDB Atlas if configured
    try {
      const connected = await connectIfNeeded();
      if (connected) {
        const Contact = getContactModel();
        await Contact.create(submission);
        return res.status(201).json({ success: true, message: 'Submission saved (MongoDB)' });
      }
    } catch (err) {
      console.error('Mongo save failed, falling back to file:', err.message || err);
    }

    // Fallback to local file storage
    const submissions = await readSubmissions();
    submissions.unshift({ ...submission, timestamp: submission.timestamp.toISOString() });
    if (await writeSubmissions(submissions)) {
      return res.status(201).json({ success: true, message: 'Submission saved (Local Mode)' });
    }
    return res.status(500).json({ success: false, message: 'Failed to save submission' });
  } catch (err) {
    console.error('Unhandled error in contact handler:', err);
    const debug = process.env.DEBUG === 'true' || (req.query && req.query.debug === '1');
    res.status(500).json({ success: false, message: debug ? (err.message || 'Server error') : 'Server error', ...(debug ? { stack: err.stack } : {}) });
  }
};
