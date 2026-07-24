const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');

// --- MongoDB Configuration ---
const MONGODB_URI = process.env.MONGODB_URI;
let mongoConnected = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB Atlas');
      mongoConnected = true;
    })
    .catch((err) => {
      console.error('❌ MongoDB Atlas connection error:', err);
      console.log('⚠️ Falling back to local file storage (submissions.json)');
      mongoConnected = false;
    });
} else {
  console.log('⚠️ MONGODB_URI not found in env variables. Running in local file-based fallback mode.');
}

// Mongoose Schema for Contact Form Submissions
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  business: { type: String, trim: true },
  service: { type: String, required: true },
  budget: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

// --- Security & Middleware ---
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      "img-src": ["'self'", "data:", "https://images.unsplash.com", "https://*.unsplash.com"],
      "connect-src": ["'self'", "http://localhost:*", "ws://localhost:*"]
    }
  }
}));

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', globalLimiter);

const contactFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 contact forms per 15 minutes
  message: { success: false, message: 'Too many contact submissions from this IP. Please try again after 15 minutes.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Limit each IP to 10 logins per 15 minutes
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Admin Session store (In-memory token mapping)
const activeSessions = new Map();

// Helper functions for Local JSON fallback operations
const readSubmissions = () => {
  try {
    if (!fs.existsSync(SUBMISSIONS_FILE)) {
      fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading submissions file:', error);
    return [];
  }
};

const writeSubmissions = (submissions) => {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing submissions file:', error);
    return false;
  }
};

// Input validation and HTML sanitization helpers
const sanitizeHtmlEntities = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeHtmlEntities(req.body[key].trim());
      }
    }
  }
  next();
};

const validateContact = (req, res, next) => {
  const { name, email, phone, service, budget, message } = req.body;
  if (!name || !email || !phone || !service || !budget || !message) {
    return res.status(400).json({ success: false, message: 'Name, Email, Phone, Service, Budget, and Message are mandatory.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  const phoneRegex = /^[+]?[0-9\s-]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid phone number (10-15 digits).' });
  }

  next();
};

// Authentication Middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || !activeSessions.has(token)) {
    return res.status(403).json({ success: false, message: 'Invalid or expired session' });
  }

  const session = activeSessions.get(token);
  session.lastActive = Date.now();
  next();
};

// --- REST APIs ---

// 1. POST /contact - Submit inquiries
app.post('/contact', contactFormLimiter, sanitizeInput, validateContact, async (req, res) => {
  const { name, email, phone, businessName, business, service, budget, message } = req.body;
  const finalBusiness = businessName || business || 'N/A';

  try {
    if (mongoConnected) {
      const newContact = new Contact({
        name,
        email,
        phone,
        business: finalBusiness,
        service,
        budget,
        message,
        timestamp: new Date()
      });
      await newContact.save();
      res.status(201).json({
        success: true,
        message: 'Thank you! Your message has been received. We will get back to you shortly.'
      });
    } else {
      // Local fallback
      const newSubmission = {
        id: uuidv4(),
        name,
        email,
        phone,
        business: finalBusiness,
        service,
        budget,
        message,
        timestamp: new Date().toISOString()
      };
      const submissions = readSubmissions();
      submissions.unshift(newSubmission);
      if (writeSubmissions(submissions)) {
        res.status(201).json({
          success: true,
          message: 'Thank you! Your inquiry has been saved (Local Mode). We will reach out shortly.'
        });
      } else {
        throw new Error('Local file write failed');
      }
    }
  } catch (error) {
    console.error('Contact submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process inquiry. Please try again later.'
    });
  }
});

// 2. GET /contacts - Admin fetch inquiries (with filtering by date & search query)
app.get('/contacts', authenticateAdmin, async (req, res) => {
  const { search, startDate, endDate } = req.query;

  try {
    if (mongoConnected) {
      let query = {};
      if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [
          { name: regex },
          { email: regex },
          { phone: regex },
          { business: regex },
          { service: regex },
          { message: regex }
        ];
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.timestamp.$lte = end;
        }
      }

      const results = await Contact.find(query).sort({ timestamp: -1 });
      res.json({ success: true, data: results });
    } else {
      // Local fallback
      let submissions = readSubmissions();
      if (search) {
        const lowerSearch = search.toLowerCase();
        submissions = submissions.filter(s =>
          (s.name && s.name.toLowerCase().includes(lowerSearch)) ||
          (s.email && s.email.toLowerCase().includes(lowerSearch)) ||
          (s.phone && s.phone.toLowerCase().includes(lowerSearch)) ||
          (s.business && s.business.toLowerCase().includes(lowerSearch)) ||
          (s.service && s.service.toLowerCase().includes(lowerSearch)) ||
          (s.message && s.message.toLowerCase().includes(lowerSearch))
        );
      }

      if (startDate) {
        const start = new Date(startDate).getTime();
        submissions = submissions.filter(s => new Date(s.timestamp || s.date).getTime() >= start);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();
        submissions = submissions.filter(s => new Date(s.timestamp || s.date).getTime() <= endTime);
      }

      res.json({ success: true, data: submissions });
    }
  } catch (error) {
    console.error('Fetch inquiries error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve inquiry list.' });
  }
});

// 3. DELETE /contact/:id - Admin delete inquiry
app.delete('/contact/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    if (mongoConnected) {
      const result = await Contact.findByIdAndDelete(id);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Inquiry not found.' });
      }
      res.json({ success: true, message: 'Inquiry deleted successfully.' });
    } else {
      // Local fallback
      const submissions = readSubmissions();
      const filtered = submissions.filter(s => s.id !== id);
      if (submissions.length === filtered.length) {
        return res.status(404).json({ success: false, message: 'Inquiry not found.' });
      }
      if (writeSubmissions(filtered)) {
        res.json({ success: true, message: 'Inquiry deleted successfully (Local Mode).' });
      } else {
        throw new Error('Local file write failed');
      }
    }
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete inquiry.' });
  }
});

// Admin Authentication endpoints
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD || 'LuxuryGold@2026';

  if (username === expectedUsername && password === expectedPassword) {
    const token = uuidv4();
    activeSessions.set(token, {
      username,
      loginTime: Date.now(),
      lastActive: Date.now()
    });
    return res.json({ success: true, token, message: 'Login successful' });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials.' });
});

app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
  res.json({ success: true, message: 'Session is valid' });
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      activeSessions.delete(token);
    }
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Fallback: Route all non-API GET requests to index.html (except static files)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/contact') || req.path.startsWith('/contacts') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cleanup inactive sessions every hour
setInterval(() => {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const [token, session] of activeSessions.entries()) {
    if (session.lastActive < oneDayAgo) {
      activeSessions.delete(token);
    }
  }
}, 60 * 60 * 1000);

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Infix Media Server is running on port ${PORT}`);
  console.log(`👉 Main Website: http://localhost:${PORT}`);
  console.log(`👉 Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`==================================================`);
});