const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const genCode = () => String(Math.floor(1000 + Math.random() * 9000));
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET || 'edumaster_secret', { expiresIn: '90d' });
const todayStr = () => new Date().toISOString().slice(0, 10);
const PLAN_HEARTS = { free: 3, pro: 5, max: 10, ultra: 9999 };

// POST /api/auth/start {ism, nomer(9 raqam)}
// Yangi bo'lsa -> user yaratib code + token qaytaradi (index.html dagi kabi "ichida kod berish")
// Eski bo'lsa -> needCode:true qaytaradi
router.post('/start', async (req, res) => {
  try {
    let { ism = '', nomer = '' } = req.body;
    ism = String(ism).trim();
    nomer = String(nomer).replace(/\D/g, '').slice(0, 9);
    if (ism.length < 2) return res.status(400).json({ message: 'Ismingizni kiriting' });
    if (nomer.length !== 9) return res.status(400).json({ message: 'Telefon 9 ta raqam bo‘lishi shart' });
    if (nomer === '000000000') return res.status(400).json({ message: 'Bu raqam bilan ro‘yxatdan o‘tib bo‘lmaydi' });

    const adminPhone = process.env.ADMIN_PHONE || '913333333';
    const isAdmin = ism.toLowerCase() === 'saloh' && nomer === adminPhone;

    let u = await User.findOne({ nomer });
    if (u) {
      // ism yangilansa yangilash
      if (u.ism !== ism && !isAdmin) { u.ism = ism; await u.save(); }
      if (isAdmin && !u.isAdmin) { u.isAdmin = true; await u.save(); }
      return res.json({ needCode: true, message: 'Shaxsiy kodingizni kiriting' });
    }
    // kod takrorlanmasin — unikal bo'lmaguncha qayta generatsiya
    let code = genCode();
    for (let i = 0; i < 10; i++) {
      const exists = await User.findOne({ code });
      if (!exists) break;
      code = genCode();
    }
    u = await User.create({
      ism, nomer, code,
      plan: 'free', hearts: 3, lastReset: todayStr(),
      isAdmin,
    });
    const token = sign(u);
    return res.json({ isNew: true, token, code, user: pub(u) });
  } catch (e) {
    return res.status(500).json({ message: 'Server xato: ' + e.message });
  }
});

// POST /api/auth/verify {nomer, code} — kod bo'yicha egani topadi (index.html dagi verifyCode kabi)
// ADMIN kodi: 0000 kiritilsa — admin panelga kirish uchun maxsus admin profil ochiladi
router.post('/verify', async (req, res) => {
  try {
    const nomer = String(req.body.nomer || '').replace(/\D/g, '').slice(0, 9);
    const code = String(req.body.code || '').replace(/\D/g, '').slice(0, 4);
    const ismInput = String(req.body.ism || '').trim();
    if (code.length !== 4) return res.status(400).json({ message: '4 xonali kod kiriting' });
    // 0000 — ADMIN kirish kodi (nomer band bo'lsa ham 500 bermasligi uchun xavfsiz yaratiladi)
    if (code === '0000') {
      let admin = await User.findOne({ code: '0000' });
      if (!admin) {
        const fakeNomer = '000000000'; // hech kimning nomeri bilan to'qnash kelmaydi
        admin = await User.findOne({ nomer: fakeNomer });
        if (admin) {
          admin.code = '0000';
          admin.isAdmin = true;
          if (!admin.ism) admin.ism = 'ADMIN';
          await admin.save();
        } else {
          try {
            admin = await User.create({
              ism: 'ADMIN', nomer: fakeNomer, code: '0000',
              plan: 'ultra', hearts: 9999, lastReset: todayStr(), isAdmin: true,
            });
          } catch (e) {
            // poyga holatida (race) allaqachon yaratilgan bo'lsa — topib olamiz
            if (e && e.code === 11000) {
              admin = (await User.findOne({ code: '0000' })) || (await User.findOne({ nomer: fakeNomer }));
              if (!admin) throw e;
              if (!admin.isAdmin) { admin.isAdmin = true; await admin.save(); }
            } else throw e;
          }
        }
      } else if (!admin.isAdmin) {
        admin.isAdmin = true;
        await admin.save();
      }
      const token = sign(admin);
      return res.json({ token, user: pub(admin), code: admin.code });
    }
    // avval shu nomerga tegishli kodmi, bo'lmasa barcha userlar ichidan kod bo'yicha qidirish
    let u = nomer ? await User.findOne({ nomer }) : null;
    if (u && u.code !== code) {
      const owner = await User.findOne({ code });
      if (!owner) return res.status(400).json({ message: 'Kod noto‘g‘ri!' });
      u = owner;
    } else if (!u || u.code !== code) {
      const owner = await User.findOne({ code });
      if (!owner) return res.status(400).json({ message: 'Kod noto‘g‘ri!' });
      u = owner;
    }
    if (ismInput.length >= 2 && u.ism !== ismInput && !u.isAdmin) {
      // ismni yangilamaymiz — kod egasining ismi bilan kiradi
    }
    const token = sign(u);
    return res.json({ token, user: pub(u), code: u.code });
  } catch (e) {
    return res.status(500).json({ message: 'Server xato: ' + e.message });
  }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  const u = ensureHearts(req.user);
  await u.save().catch(() => {});
  res.json({ user: pub(u), code: u.code });
});

// Yuraklarni kunlik yangilash (index.html dagi ensureHearts mantiqi)
function ensureHearts(u) {
  const t = todayStr();
  if (u.lastReset !== t) {
    u.hearts = PLAN_HEARTS[u.plan] ?? 3;
    u.lastReset = t;
    u.refillUntil = 0;
  } else if ((u.hearts || 0) <= 0 && u.refillUntil && Date.now() >= u.refillUntil) {
    u.hearts = PLAN_HEARTS[u.plan] ?? 3;
    u.refillUntil = 0;
  }
  return u;
}

function pub(u) {
  return {
    id: u._id, ism: u.ism, nomer: u.nomer, plan: u.plan,
    hearts: u.hearts, xp: u.xp, streak: u.streak,
    lastDaily: u.lastDaily, refillUntil: u.refillUntil,
    isAdmin: u.isAdmin,
  };
}

module.exports = router;
module.exports.ensureHearts = ensureHearts;
module.exports.pubUser = pub;
