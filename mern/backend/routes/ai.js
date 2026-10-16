const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatLog = require('../models/ChatLog');
const router = express.Router();

const VOCAB = {
  abundant: 'ko‘p, mo‘l — plentiful. Misol: abundant resources.',
  plentiful: 'mo‘l-ko‘l. abundant so‘zinining sinonimi.',
  benevolent: 'mehribon, xayrixoh — kind.',
  ephemeral: 'tez o‘tuvchi, qisqa umr — short-lived.',
  meticulous: 'o‘ta ehtiyotkor, sinchkov — careful.',
  pragmatic: 'amaliy, hayotiy — practical.',
  diligent: 'tirishqoq, mehnatkash — hardworking.',
  reluctant: 'istamas, ko‘nmas — unwilling.',
  rapid: 'tez — swift.', swift: 'chaqqon, tez. rapid sinonimi.',
  ancient: 'qadimiy. Antonimi: modern.', modern: 'zamonaviy.',
  candid: 'ochiq, samimiy.', ambiguous: 'noaniq, ikki ma’noli.',
  concise: 'qisqa va lo‘nda.', profound: 'chuqur, teran.',
  inevitable: 'muqarrar.', versatile: 'ko‘p qirrali.',
  resilient: 'bardoshli, tez tiklanuvchi.', skeptical: 'shubhali.',
  vivid: 'yorqin, jonli.', frugal: 'tejamkor.', hostile: 'dushmanona.',
  novice: 'yangi boshlovchi.', obscure: 'noma’lum, qorong‘i.',
  placid: 'sokin, vazmin.', diligence: 'tirishqoqlik.',
  refute: 'rad etish. refuted = rad etildi.',
};

function fact(n) { n = Math.floor(Number(n)); if (n < 0 || n > 170) return NaN; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }

function safeEval(expr) {
  if (!/^[0-9+\-*/().\s%^!]*$/.test(expr)) return null;
  try {
    expr = expr.replace(/(\d+(?:\.\d+)?)!/g, 'fact($1)').replace(/\^/g, '**').replace(/%/g, '/100');
    const v = Function('fact', '"use strict";return (' + expr + ')')(fact);
    if (typeof v !== 'number' || !isFinite(v)) return null;
    return Math.round(v * 1e8) / 1e8;
  } catch { return null; }
}

function solveLinear(raw) {
  const s = raw.replace(/\s/g, '').replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/–|—/g, '-');
  const m = s.match(/^(.+)=(.+)$/);
  if (!m || /[a-wy-zA-WY-Z]/.test(s)) return null;
  try {
    const f = (x) => {
      const e1 = m[1].replace(/x/gi, '(' + x + ')').replace(/(\d)\(/g, '$1*(');
      const e2 = m[2].replace(/x/gi, '(' + x + ')').replace(/(\d)\(/g, '$1*(');
      return Function('"use strict";return (' + e1 + ')-(' + e2 + ')')();
    };
    const b = f(0), a = f(1) - b;
    if (Math.abs(a) < 1e-9) return null;
    const r = Math.round((-b / a) * 1e6) / 1e6;
    return `Tenglama: ${raw}<br>Javob: <b>x = ${r}</b>`;
  } catch { return null; }
}

function answer(raw, mode = 'SAT') {
  const t = String(raw).toLowerCase().trim();
  if (/^(salom|assalom|hello|hi|hey)\b/.test(t)) return `Salom! Men ${mode} bo‘yicha yordamchiman. Misol yechaman, so‘z ma’nosini aytaman.`;
  if (/rahmat|tashakkur|thanks/.test(t)) return 'Arzimaydi! Yana savol bo‘lsa bemalol bering.';
  let pm = t.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|from)?\s*(\d+(?:\.\d+)?)/);
  if (pm) { const a = parseFloat(pm[1]), b = parseFloat(pm[2]); return `${a}% of ${b} = <b>${Math.round(a * b / 100 * 1e4) / 1e4}</b>`; }
  if (t.indexOf('=') > -1 && /[x]/.test(t)) { const s = solveLinear(raw); if (s) return s; }
  const expr = raw.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/\?/g, '');
  if (/^[0-9+\-*/().\s%^!^]+$/.test(expr) && /\d/.test(expr) && /[+\-*/%^!^]/.test(expr)) {
    const v = safeEval(expr); if (v !== null) return `${raw} = <b>${v}</b>`;
  }
  const sq = t.match(/(?:sqrt|kvadrat ildiz|ildiz)\s*(\d+(?:\.\d+)?)/);
  if (sq) return `sqrt(${sq[1]}) = <b>${Math.round(Math.sqrt(parseFloat(sq[1])) * 1e4) / 1e4}</b>`;
  for (const k in VOCAB) if (t.indexOf(k) > -1) return `<b>${k}</b> — ${VOCAB[k]}`;
  if (/strateg|tayyorlan|plan|qanday/.test(t)) return `<b>${mode} rejasi:</b><br>1) Har kuni 1 soat test.<br>2) Xatolarni tahlil qiling.<br>3) Vaqt bilan ishlang (SAT: 1 savol/1 daqiqa).<br>4) Haftada 1 mock.`;
  if (/grammar|grammatika|tense|article|passive|neither/.test(t)) return '<b>Grammatika:</b><br>• Neither of the answers <b>is</b> correct.<br>• Have you ever <b>been</b>...?<br>• look forward + <b>to hearing</b>.<br>• Passive: was written.<br>• If I <b>had</b> time, I would...';
  if (/math|matem|algebra|formula|slope|median|mean/.test(t)) return '<b>Math:</b><br>• m=(y2-y1)/(x2-x1).<br>• Pifagor: a²+b²=c².<br>• Foiz: (foiz/100)×son.<br>Misol yozing: 3x+7=22';
  if (/reading|skim/.test(t)) return '<b>Reading:</b> avval savol, keyin skim, kalit so‘z toping. Har matnga ~20 daqiqa.';
  if (/listening|tinglash/.test(t)) return '<b>Listening:</b> savollarni oldin o‘qing, raqam/ismga e’tibor bering.';
  if (/writing|essay|task/.test(t)) return '<b>Writing Task 2:</b> Kirish + Body1 + Body2 + Xulosa. Linkerlar: However, Moreover, For example. 250+ so‘z.';
  if (/speaking|gapirish|cue/.test(t)) return '<b>Speaking Part 2:</b> Who–What–Why rejasi, 2 daqiqa to‘xtamasdan gapiring.';
  if (/ball|score|band/.test(t)) return mode === 'SAT' ? '<b>SAT:</b> 400–1600. 1300+ kuchli.' : '<b>IELTS:</b> 0–9 Band. 6.5+ talab, 7.5+ a’lo.';
  if (/vaqt|time|ulgu/.test(t)) return '<b>Vaqt:</b> SAT 1 savol/1 daqiqa. Bilmasangiz o‘tkazib, oxirida qayting.';
  if (/kalkulyator|calc/.test(t)) return 'SAT bo‘limidagi <b>DEMO Kalkulyator</b>ni oching.';
  return 'Aniqroq yozing:<br>• Misol: <b>3x+7=22</b><br>• So‘z: <b>benevolent nimani anglatadi?</b><br>• Mavzu: <b>reading strategiyasi</b>';
}

router.post('/', async (req, res) => {
  const { message = '', mode = 'SAT' } = req.body;
  if (!String(message).trim()) return res.status(400).json({ message: 'Bo‘sh xabar' });
  const reply = answer(message, mode);
  // Suhbatni saqlash — token bo'lsa user bilan bog'lab saqlaymiz (ADMIN panelda ko'rish uchun)
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (token) {
      const d = jwt.verify(token, process.env.JWT_SECRET || 'edumaster_secret');
      const u = await User.findById(d.id);
      if (u) {
        await ChatLog.create({
          user: u._id, ism: u.ism, nomer: u.nomer,
          mode: String(mode || 'SAT'), question: String(message).slice(0, 2000), reply: String(reply).slice(0, 5000),
        });
      }
    }
  } catch (_) { /* token bo'lmasa ham javob beraveradi */ }
  res.json({ reply });
});

module.exports = router;
