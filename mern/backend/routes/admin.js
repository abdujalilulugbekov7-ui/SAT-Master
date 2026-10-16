const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Result = require('../models/Result');
const Visit = require('../models/Visit');
const Payment = require('../models/Payment');
const ChatLog = require('../models/ChatLog');

const router = express.Router();

function isAdmin(u) {
  if (!u) return false;
  if (u.isAdmin) return true;
  // Maxfiy ADMIN kod: 0000 (kirish kodi 0000 bo'lgan profil admin hisoblanadi)
  if (String(u.code) === '0000') return true;
  const ap = process.env.ADMIN_PHONE || '913333333';
  return String(u.ism).toLowerCase() === 'saloh' && String(u.nomer) === ap;
}

router.use(auth);

router.get('/stats', async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin emas' });
  const [users, tests, satVisits, ieltsVisits, payments, paidAgg] = await Promise.all([
    User.countDocuments(),
    Result.countDocuments(),
    Visit.distinct('nomer', { type: 'SAT' }),
    Visit.distinct('nomer', { type: 'IELTS' }),
    Payment.countDocuments({ status: 'paid' }),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  const totalRevenue = (paidAgg[0] && paidAgg[0].total) || 0;
  res.json({ users, tests, sat: satVisits.length, ielts: ieltsVisits.length, payments, totalRevenue });
});

router.get('/users', async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin emas' });
  const list = await User.find().sort({ createdAt: -1 }).limit(200);
  res.json({ users: list });
});

router.get('/scores', async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin emas' });
  const { type } = req.query;
  const q = type && ['SAT', 'IELTS'].includes(type) ? { type } : {};
  const list = await Result.find(q).sort({ createdAt: -1 }).limit(200);
  res.json({ results: list });
});

// To'lovlar ro'yxati — kim qancha to'lagani hisoblanib turadi
router.get('/payments', async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin emas' });
  const list = await Payment.find().sort({ createdAt: -1 }).limit(200);
  res.json({ payments: list });
});

// ---- DAROMADLAR: jami pul, tariflar bo'yicha, kunlik grafik, provayder bo'yicha ----
router.get('/revenue', async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin emas' });
  try {
    const paidMatch = { status: 'paid' };
    const [totalAgg, countPaid, byPlan, byProvider, last] = await Promise.all([
      Payment.aggregate([{ $match: paidMatch }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.countDocuments(paidMatch),
      Payment.aggregate([{ $match: paidMatch }, { $group: { _id: '$plan', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: paidMatch }, { $group: { _id: '$provider', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
      Payment.find(paidMatch).sort({ createdAt: -1 }).limit(30),
    ]);
    const totalRevenue = (totalAgg[0] && totalAgg[0].total) || 0;

    // So'nggi 14 kunlik daromad
    const days = [];
    const map = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5);
      const key = d.toISOString().slice(0, 10);
      map[key] = { date: key, label: d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' }), total: 0, count: 0 };
      days.push(map[key]);
    }
    const from = new Date(Date.now() - 13 * 864e5);
    from.setHours(0, 0, 0, 0);
    const recent = await Payment.find({ status: 'paid', createdAt: { $gte: from } });
    recent.forEach((p) => {
      const key = new Date(p.createdAt).toISOString().slice(0, 10);
      if (map[key]) { map[key].total += (p.amount || 0); map[key].count += 1; }
    });

    // Bugungi daromad
    const todayKey = new Date().toISOString().slice(0, 10);
    const today = map[todayKey] || { total: 0, count: 0 };

    const planObj = { pro: { count: 0, total: 0 }, max: { count: 0, total: 0 }, ultra: { count: 0, total: 0 } };
    byPlan.forEach((x) => { if (planObj[x._id]) planObj[x._id] = { count: x.count, total: x.total }; });

    res.json({
      totalRevenue,
      payments: countPaid,
      avgCheck: countPaid ? Math.round(totalRevenue / countPaid) : 0,
      todayTotal: today.total || 0,
      todayCount: today.count || 0,
      byPlan: planObj,
      byProvider,
      daily: days,
      recent: last,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Server xato: ' + e.message });
  }
});

// Bitta odamning AI bilan gaplashganlari (nomer bo'yicha)
router.get('/chats', async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin emas' });
  const { nomer } = req.query;
  const q = nomer ? { nomer: String(nomer) } : {};
  const list = await ChatLog.find(q).sort({ createdAt: -1 }).limit(200);
  res.json({ chats: list });
});

// ---- TOZALASH: barcha ma'lumotlar (kodlar jumladan) umrbod saqlanadi,
// ---- faqat ADMIN shu endpointni chaqirganda o'chiriladi.
// DELETE /api/admin/clear { type: 'results'|'payments'|'visits'|'chats'|'users'|'all' }
//  - 'users'/'all' bo'lganda ADMIN profil (code 0000 / isAdmin) O'CHIRILMAYDI.
router.delete('/clear', async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin emas' });
  try {
    const type = String((req.body && req.body.type) || req.query.type || 'all');
    const out = {};
    const keepAdmin = { $nor: [{ code: '0000' }, { isAdmin: true }] };
    if (type === 'results' || type === 'all') out.results = (await Result.deleteMany({})).deletedCount;
    if (type === 'payments' || type === 'all') out.payments = (await Payment.deleteMany({})).deletedCount;
    if (type === 'visits' || type === 'all') out.visits = (await Visit.deleteMany({})).deletedCount;
    if (type === 'chats' || type === 'all') out.chats = (await ChatLog.deleteMany({})).deletedCount;
    if (type === 'users' || type === 'all') out.users = (await User.deleteMany(keepAdmin)).deletedCount;
    if (!Object.keys(out).length) return res.status(400).json({ message: 'type xato: results|payments|visits|chats|users|all' });
    return res.json({ ok: true, cleared: out });
  } catch (e) {
    return res.status(500).json({ message: 'Server xato: ' + e.message });
  }
});

module.exports = router;
