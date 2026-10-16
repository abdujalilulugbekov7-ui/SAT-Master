const express = require('express');
const auth = require('../middleware/auth');
const Result = require('../models/Result');
const Visit = require('../models/Visit');
const User = require('../models/User');
const Payment = require('../models/Payment');

const PLAN_PRICE = { pro: 39990, max: 59990, ultra: 99990 };

const router = express.Router();

// test boshlaganda visit yozish
router.post('/visit', auth, async (req, res) => {
  try {
    const { type } = req.body;
    if (!['SAT', 'IELTS'].includes(type)) return res.status(400).json({ message: 'type SAT/IELTS' });
    await Visit.create({ user: req.user._id, ism: req.user.ism, nomer: req.user.nomer, type });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// natija saqlash + XP
router.post('/result', auth, async (req, res) => {
  try {
    const { type, score, detail } = req.body;
    if (!['SAT', 'IELTS'].includes(type)) return res.status(400).json({ message: 'type xato' });
    const r = await Result.create({
      user: req.user._id, ism: req.user.ism, nomer: req.user.nomer,
      type, score: String(score), detail: String(detail || ''),
    });
    let xpAdd = 10;
    if (type === 'SAT') xpAdd = Math.max(5, Math.round(Number(score) / 20) || 5);
    else xpAdd = Math.round(parseFloat(score) * 10) || 10;
    req.user.xp = (req.user.xp || 0) + xpAdd;
    await req.user.save();
    res.json({ ok: true, result: r, xp: req.user.xp, xpAdd });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/my', auth, async (req, res) => {
  const list = await Result.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ results: list });
});

// kunlik mashq yakuni: yurak kamaytirish allaqachon clientda emas — serverda
// POST /api/test/daily {type, correct, heartsLost}
router.post('/daily', auth, async (req, res) => {
  try {
    const { type, correct = 0, heartsLost = 0 } = req.body;
    const u = req.user;
    const today = new Date().toISOString().slice(0, 10);
    const key = `${today}_${type}`;
    const first = !(u.dailyDone && u.dailyDone.get(key));
    if (heartsLost > 0) {
      u.hearts = Math.max(0, (u.hearts || 0) - heartsLost);
      if ((u.hearts || 0) <= 0 && u.plan === 'free' && !u.refillUntil) {
        u.refillUntil = Date.now() + 5 * 60 * 1000;
      }
    }
    let xpAdd = 0;
    if (first) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      u.streak = (u.lastDaily === y) ? (u.streak || 0) + 1 : 1;
      u.lastDaily = today;
      xpAdd = (correct || 0) * 10;
      u.xp = (u.xp || 0) + xpAdd;
    }
    if (!u.dailyDone) u.dailyDone = new Map();
    u.dailyDone.set(key, 1);
    await u.save();
    res.json({ ok: true, first, xpAdd, xp: u.xp, streak: u.streak, hearts: u.hearts, refillUntil: u.refillUntil });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// yurak kamaytirish (xato uchun)
router.post('/heart', auth, async (req, res) => {
  try {
    const u = req.user;
    u.hearts = Math.max(0, (u.hearts || 0) - 1);
    if ((u.hearts || 0) <= 0 && u.plan === 'free' && !u.refillUntil) {
      u.refillUntil = Date.now() + 5 * 60 * 1000;
    }
    await u.save();
    res.json({ hearts: u.hearts, refillUntil: u.refillUntil });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// tarif sotib olish (Click/Payme ko'rinishidagi realistik forma — karta 16 raqam + amal 4 raqam tekshiriladi)
// To'lov summasi PLANS dagi narx bilan bir xil yoziladi va Payment collection ga saqlanadi
router.post('/plan', auth, async (req, res) => {
  try {
    const { plan, card, provider } = req.body;
    const PLANS = { pro: 5, max: 10, ultra: 9999 };
    if (!PLANS[plan]) return res.status(400).json({ message: 'Tarif xato' });
    const d = String(card || '').replace(/\D/g, '');
    if (d.length !== 16) return res.status(400).json({ message: 'Karta 16 ta raqam bo‘lishi shart' });
    const u = req.user;
    u.plan = plan;
    u.hearts = PLANS[plan];
    u.refillUntil = 0;
    u.lastCard = d;
    await u.save();
    const amount = PLAN_PRICE[plan] || 0;
    await Payment.create({
      user: u._id, ism: u.ism, nomer: u.nomer,
      plan, amount,
      provider: ['click', 'payme'].includes(provider) ? provider : 'click',
      status: 'paid',
    });
    res.json({ ok: true, plan: u.plan, hearts: u.hearts, amount });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// reyting — top 50 XP bo'yicha + trending uchun streak/plan
router.get('/rating', async (req, res) => {
  const top = await User.find({}, { ism: 1, nomer: 1, xp: 1, streak: 1, plan: 1, updatedAt: 1 }).sort({ xp: -1 }).limit(50);
  res.json({ rating: top });
});

module.exports = router;
