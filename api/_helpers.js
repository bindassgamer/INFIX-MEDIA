const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUBMISSIONS_FILE = path.join(process.cwd(), 'submissions.json');
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || 'change-this-secret';

function signToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, ADMIN_SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, ADMIN_SECRET);
  } catch (err) {
    return null;
  }
}

async function readSubmissions() {
  try {
    if (!fs.existsSync(SUBMISSIONS_FILE)) {
      fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('readSubmissions error', err);
    return [];
  }
}

async function writeSubmissions(data) {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('writeSubmissions error', err);
    return false;
  }
}

module.exports = { signToken, verifyToken, readSubmissions, writeSubmissions };
