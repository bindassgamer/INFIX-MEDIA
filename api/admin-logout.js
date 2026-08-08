module.exports = async (req, res) => {
  // Stateless logout for JWT: client should drop token
  res.json({ success: true, message: 'Logged out (client should discard token)' });
};
