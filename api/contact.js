const { readSubmissions, writeSubmissions } = require('./_helpers');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  try {
    const { name, email, phone, businessName, business, service, budget, message } = req.body || {};
    if (!name || !email || !phone || !service || !budget || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const finalBusiness = businessName || business || 'N/A';
    const newSubmission = {
      id: uuidv4(),
      name, email, phone, business: finalBusiness, service, budget, message, timestamp: new Date().toISOString()
    };
    const submissions = await readSubmissions();
    submissions.unshift(newSubmission);
    if (await writeSubmissions(submissions)) {
      return res.status(201).json({ success: true, message: 'Submission saved' });
    }
    return res.status(500).json({ success: false, message: 'Failed to save submission' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
