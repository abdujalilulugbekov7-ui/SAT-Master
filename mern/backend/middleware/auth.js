const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token yo‘q' });
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET || 'edumaster_secret');
    const u = await User.findById(d.id);
    if (!u) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });
    req.user = u;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Token yaroqsiz' });
  }
};
