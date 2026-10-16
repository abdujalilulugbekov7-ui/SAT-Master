import React, { useState, useEffect, useRef } from 'react';
import { SAT_EN, SAT_MATH, IE_READING, IE_LISTEN, IE_WRITING, IE_SPEAK, PLANS } from './data/questions.js';
import { api, setToken, fmtPhone } from './utils/api.js';
import TsArt from './TsArt.jsx';

const shuffle = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const mmss = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60); const r = s % 60; return `${m}:${r < 10 ? '0' : ''}${r}`; };
// Animatsiyali hisoblagich (pul soni chiroyli sanab chiqadi)
const useCountUp = (target, dur = 1400) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = Number(target) || 0;
    if (t === 0) { setVal(0); return; }
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(t * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return val;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [myCode, setMyCode] = useState('');
  const [screen, setScreen] = useState('auth');
  const [toast, setToast] = useState('');
  const [results, setResults] = useState([]);

  // auth form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [step2, setStep2] = useState(false);
  const [codeArr, setCodeArr] = useState(['', '', '', '']);
  const [hasCode, setHasCode] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);

  // sat
  const [sat, setSat] = useState(null);
  // break
  const [brk, setBrk] = useState(null);
  // result
  const [result, setResult] = useState(null);
  // ielts
  const [ie, setIe] = useState(null);
  // daily
  const [daily, setDaily] = useState(null);
  // rating
  const [rating, setRating] = useState([]);
  const [growthTab, setGrowthTab] = useState('haftalik');
  // admin
  const [admin, setAdmin] = useState({ users: 0, tests: 0, sat: 0, ielts: 0, payments: 0, totalRevenue: 0, tab: 'users', rows: [] });
  const [payList, setPayList] = useState([]);
  const [chatView, setChatView] = useState(null); // {ism, nomer, chats}
  // 💰 DAROMADLAR (admin pullarni qayta ko'rishi uchun)
  const [rev, setRev] = useState(null);
  const [revRange, setRevRange] = useState('14');
  const animTotal = useCountUp(rev?.totalRevenue || admin.totalRevenue || 0);
  const animToday = useCountUp(rev?.todayTotal || 0, 1000);
  const animCount = useCountUp(rev?.payments || 0, 1000);
  // ai
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState('SAT');
  const [chat, setChat] = useState([{ me: false, t: 'Salom! Men yordamchingizman. Misol, grammatika yoki strategiya so‘rang.' }]);
  const [chatIn, setChatIn] = useState('');
  // pay
  const [payPlan, setPayPlan] = useState(null);
  const [payCard, setPayCard] = useState('');
  const [payExp, setPayExp] = useState('');
  const [payCvv, setPayCvv] = useState('');
  const [payName, setPayName] = useState('');
  const [payProvider, setPayProvider] = useState('click');
  const [paying, setPaying] = useState(false);
  // calc
  const [cExpr, setCExpr] = useState('');
  const [cMain, setCMain] = useState('0');
  const [cHist, setCHist] = useState([]);
  const [cDeg, setCDeg] = useState(true);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  useEffect(() => {
    (async () => {
      if (!localStorage.getItem('em_token')) return;
      try { const d = await api.me(); setUser(d.user); setMyCode(d.code || ''); setScreen(d.user.isAdmin ? 'admin' : 'menu'); loadMy(); } catch { setToken(''); }
    })();
  }, []);

  const loadMy = async () => { try { const d = await api.myResults(); setResults(d.results || []); } catch {} };

  // ---------- AUTH ----------
  const sendCode = async () => {
    const p = phone.replace(/\D/g, '').slice(0, 9);
    if (name.trim().length < 2) return showToast('Ismingizni kiriting');
    if (p.length !== 9) return showToast('9 ta raqam kiriting');
    try {
      const d = await api.start(name.trim(), p);
      if (d.isNew) {
        setToken(d.token); setUser(d.user); setMyCode(d.code); setScreen('menu'); loadMy();
        setShowCodeModal(true);
      } else if (d.needCode) {
        setStep2(true); showToast('Shaxsiy kodingizni kiriting');
      }
    } catch (e) { showToast(e.message); }
  };
  const verifyCode = async () => {
    const code = codeArr.join('');
    const p = phone.replace(/\D/g, '').slice(0, 9);
    if (code.length !== 4) return showToast('4 xonali kod');
    try {
      // hasCode rejimida nomer shart emas — faqat kod orqali o'sha profilga kiradi
      const d = await api.verify(p, code, name.trim());
      setToken(d.token); setUser(d.user); setMyCode(d.code || code);
      setStep2(false); setHasCode(false); setCodeArr(['', '', '', '']);
      setScreen(d.user.isAdmin ? 'admin' : 'menu');
      if (d.user.isAdmin) loadAdmin('users'); else loadMy();
      showToast('Xush kelibsiz, ' + d.user.ism + '!');
    } catch (e) { showToast(e.message); }
  };
  // "Mening kodim bor" — to'g'ridan-to'g'ri kod bilan kirish
  const loginWithCodeOnly = verifyCode;
  const logout = () => { setToken(''); location.reload(); };

  // ---------- SAT ----------
  const startSAT = async () => {
    await api.visit('SAT');
    setSat({ sec: 0, idx: 0, ans: {}, skipped: {}, tLeft: 3600 });
    setScreen('sattest');
  };
  useEffect(() => {
    if (screen !== 'sattest' || !sat) return;
    if (sat.tLeft <= 0) { finishSAT(sat); return; }
    const t = setTimeout(() => setSat({ ...sat, tLeft: sat.tLeft - 1 }), 1000);
    return () => clearTimeout(t);
  }, [screen, sat]);
  const finishSAT = async (s) => {
    s = s || sat;
    let ce = 0, cm = 0;
    SAT_EN.forEach((q, i) => { if (s.ans['0_' + i] === q[2]) ce++; });
    SAT_MATH.forEach((q, i) => { if (s.ans['1_' + i] === q[2]) cm++; });
    const total = ce + cm, score = 400 + Math.round(total / 60 * 1200);
    await api.saveResult('SAT', score, `EN ${ce}/30, Math ${cm}/30, Jami ${total}/60`);
    loadMy();
    setResult({ title: 'SAT Natijangiz', score, detail: `English: ${ce}/30, Math: ${cm}/30, Jami: ${total}/60`, retry: 'sat' });
    setScreen('result');
  };
  const satMove = (d) => {
    const L = sat.sec === 0 ? SAT_EN : SAT_MATH;
    if (d > 0 && sat.idx === L.length - 1) {
      if (sat.sec === 0) { startBreak('SAT English yakunlandi! 5 daqiqa tanaffus, so‘ng Math.', () => { setSat({ ...sat, sec: 1, idx: 0 }); setScreen('sattest'); }); return; }
      finishSAT(sat); return;
    }
    setSat({ ...sat, idx: Math.max(0, Math.min(L.length - 1, sat.idx + d)) });
  };

  // ---------- BREAK ----------
  const startBreak = (msg, cb) => { setBrk({ msg, cb, left: 300 }); setScreen('break'); window._brkCb = cb; };
  useEffect(() => {
    if (screen !== 'break' || !brk) return;
    if (brk.left <= 0) { const cb = window._brkCb; setBrk(null); cb && cb(); return; }
    const t = setTimeout(() => setBrk({ ...brk, left: brk.left - 1 }), 1000);
    return () => clearTimeout(t);
  }, [screen, brk]);

  // ---------- IELTS ----------
  const startIELTS = async () => {
    await api.visit('IELTS');
    setIe({ stage: 'reading', idx: 0, ans: {}, txt: {}, tLeft: 1200 });
    setScreen('ieltstest');
  };
  useEffect(() => {
    if (screen !== 'ieltstest' || !ie) return;
    if (ie.tLeft <= 0) { ieNextStage(true); return; }
    const t = setTimeout(() => setIe({ ...ie, tLeft: ie.tLeft - 1 }), 1000);
    return () => clearTimeout(t);
  }, [screen, ie]);
  const ieNextStage = (auto) => {
    const next = { reading: 'listening', listening: 'writing', writing: 'speaking' }[ie.stage];
    if (!next) { finishIELTS(ie); return; }
    const times = { listening: 900, writing: 2400, speaking: 1500 };
    startBreak(`${ie.stage.toUpperCase()} yakunlandi! Keyingi: ${next.toUpperCase()}.`, () => {
      setIe({ stage: next, idx: 0, ans: ie.ans, txt: ie.txt, tLeft: times[next] || 900 });
      setScreen('ieltstest');
    });
  };
  const ieMove = (d) => {
    const n = ie.stage === 'reading' ? IE_READING.qs.length : ie.stage === 'listening' ? IE_LISTEN.qs.length : ie.stage === 'writing' ? 2 : 5;
    if (d > 0 && ie.idx === n - 1) { ieNextStage(); return; }
    setIe({ ...ie, idx: Math.max(0, Math.min(n - 1, ie.idx + d)) });
  };
  const finishIELTS = async (v) => {
    v = v || ie;
    let r = 0, l = 0;
    IE_READING.qs.forEach((q, i) => { if (v.ans['reading_' + i] === q[2]) r++; });
    IE_LISTEN.qs.forEach((q, i) => { if (v.ans['listening_' + i] === q[2]) l++; });
    const w1 = (v.txt['w_0'] || '').trim() ? (v.txt['w_0'].trim().split(/\s+/).length) : 0;
    const w2 = (v.txt['w_1'] || '').trim() ? (v.txt['w_1'].trim().split(/\s+/).length) : 0;
    const wScore = Math.min(9, (w1 >= 120 ? 6.5 : w1 >= 60 ? 5.5 : w1 >= 20 ? 4.5 : 3.5) + (w2 >= 200 ? 1 : w2 >= 100 ? 0.5 : 0));
    const band = Math.round(((r / 10 * 9 + l / 10 * 9 + wScore + 6.5) / 4) * 2) / 2;
    await api.saveResult('IELTS', band.toFixed(1), `R ${r}/10, L ${l}/10, W ~${wScore.toFixed(1)}`);
    loadMy();
    setResult({ title: 'IELTS Mock Natijangiz', score: band.toFixed(1), detail: `Reading: ${r}/10, Listening: ${l}/10, Writing: ${w1}+${w2} so‘z`, retry: 'ielts', band: true });
    setScreen('result');
  };

  // ---------- DAILY ----------
  const startDaily = async (type) => {
    if ((user?.hearts || 0) <= 0) { showToast('Yurak tugagan! Tarifni yangilang.'); setScreen('plans'); return; }
    await api.visit(type);
    let pool;
    if (type === 'SAT') pool = shuffle(shuffle(SAT_EN).slice(0, 5).map(q => ({ t: 'EN', q }))).concat([]);
    else pool = shuffle(shuffle(IE_READING.qs).slice(0, 5).map(q => ({ t: 'Reading', q })));
    let full;
    if (type === 'SAT') full = shuffle(shuffle(SAT_EN).slice(0, 5).map(q => ({ t: 'EN', q })).concat(shuffle(SAT_MATH).slice(0, 5).map(q => ({ t: 'Math', q }))));
    else full = shuffle(shuffle(IE_READING.qs).slice(0, 5).map(q => ({ t: 'Reading', q })).concat(shuffle(IE_LISTEN.qs).slice(0, 5).map(q => ({ t: 'Listening', q }))));
    setDaily({ type, qs: full, idx: 0, hearts: Math.min(user?.hearts || 3, 10), correct: 0, lost: 0 });
    setScreen('daily');
  };
  const dailyAns = async (i) => {
    const item = daily.qs[daily.idx];
    let { hearts, correct, lost } = daily;
    if (i === item.q[2]) { correct++; showToast('To‘g‘ri!'); }
    else {
      hearts--; lost++;
      await api.heart();
      const me = await api.me().catch(() => null);
      if (me) setUser(me.user);
      if (hearts <= 0) { setDaily({ ...daily, hearts: 0 }); return; }
      showToast('Xato! 1 yurak ketdi');
    }
    const idx = daily.idx + 1;
    if (idx >= daily.qs.length) {
      const r = await api.daily(daily.type, correct, 0).catch(() => null);
      const me = await api.me().catch(() => null);
      if (me) setUser(me.user);
      setDaily({ ...daily, idx, correct, hearts, lost, done: true, xp: r?.xpAdd || correct * 10, first: r?.first });
    } else setDaily({ ...daily, idx, correct, hearts, lost });
  };

  // ---------- RATING / ADMIN ----------
  const openRating = async () => { const d = await api.rating(); setRating(d.rating || []); setScreen('rating'); };
  // Menyu ochilganda trending preview uchun reytingni jim yuklash
  useEffect(() => {
    if (screen === 'menu' && user && rating.length === 0) {
      api.rating().then(d => setRating(d.rating || [])).catch(() => {});
    }
  }, [screen, user]);
  // Trending belgisi: streak va o'rin asosida strelka + rang
  const trendOf = (x, i) => {
    const st = x?.streak || 0;
    if (i < 3) return { icon: '🔥', cls: 'hot', label: 'TRENDING' };
    if (st >= 7) return { icon: '🚀', cls: 'up', label: '+tez o‘smoqda' };
    if (st >= 3) return { icon: '↗', cls: 'up', label: 'yaxshi o‘qimoqda' };
    if (st >= 1) return { icon: '↑', cls: 'mid', label: 'o‘sishda' };
    return { icon: '→', cls: 'flat', label: 'barqaror' };
  };
  // O'sish statistikasi — rasmdeki kabi: Haftalik/Oylik/Yillik + SAT/IELTS chiziq
  const getGrowth = () => {
    const satRes = results.filter(r => r.type === 'SAT').map(r => Number(r.score) || 0).filter(Boolean).slice(-7);
    const ieRes = results.filter(r => r.type === 'IELTS').map(r => parseFloat(r.score) || 0).filter(Boolean).slice(-7);
    const lastSAT = satRes.length ? satRes[satRes.length - 1] : 1420;
    const lastIE = ieRes.length ? ieRes[ieRes.length - 1] : 6.5;
    if (growthTab === 'haftalik') {
      const n = 7;
      const sat = Array.from({ length: n }, (_, i) => {
        if (satRes.length === n) return satRes[i];
        // demo o'sish: oxirgi ballga qarab orqaga
        return Math.round(lastSAT - (n - 1 - i) * 45 - Math.random() * 10);
      });
      const ie = Array.from({ length: n }, (_, i) => {
        if (ieRes.length === n) return ieRes[i] * 200;
        return Math.round((lastIE * 200) - (n - 1 - i) * 28 - Math.random() * 8);
      });
      return { labels: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'], sat, ie, satVal: lastSAT, ieVal: lastIE };
    }
    if (growthTab === 'oylik') {
      const n = 8;
      const sat = Array.from({ length: n }, (_, i) => Math.round(lastSAT - (n - 1 - i) * 28 - Math.random() * 12));
      const ie = Array.from({ length: n }, (_, i) => Math.round(lastIE * 200 - (n - 1 - i) * 18 - Math.random() * 6));
      return { labels: ['1-h', '2-h', '3-h', '4-h', '5-h', '6-h', '7-h', '8-h'], sat, ie, satVal: lastSAT, ieVal: lastIE };
    }
    const n = 12;
    const sat = Array.from({ length: n }, (_, i) => Math.round(lastSAT - (n - 1 - i) * 18 - Math.random() * 10));
    const ie = Array.from({ length: n }, (_, i) => Math.round(lastIE * 200 - (n - 1 - i) * 12 - Math.random() * 5));
    return { labels: ['Y', 'F', 'M', 'A', 'M', 'I', 'I', 'A', 'S', 'O', 'N', 'D'], sat, ie, satVal: lastSAT, ieVal: lastIE };
  };
  const loadAdmin = async (tab) => {
    try {
      const s = await api.adminStats();
      let rows = [];
      if (tab === 'users') rows = (await api.adminUsers()).users;
      else if (tab === 'payments') { const p = await api.adminPayments(); setPayList(p.payments || []); rows = p.payments || []; }
      else if (tab === 'daromadlar') {
        // Daromadlarni yuklash — backend yangi bo'lmasa ham eski payments dan yasab ko'rsatadi
        let r = null;
        try { r = await api.adminRevenue(); } catch { r = null; }
        if (!r) {
          // Fallback: stats + payments dan daromadni yasaymiz
          let plist = payList;
          try { const p = await api.adminPayments(); plist = p.payments || []; setPayList(plist); } catch {}
          const tot = s.totalRevenue || plist.reduce((a, x) => a + (x.amount || 0), 0);
          const byPlan = { pro: { count: 0, total: 0 }, max: { count: 0, total: 0 }, ultra: { count: 0, total: 0 } };
          plist.forEach((x) => { if (byPlan[x.plan]) { byPlan[x.plan].count++; byPlan[x.plan].total += (x.amount || 0); } });
          const days = [];
          for (let i = 13; i >= 0; i--) {
            const d = new Date(Date.now() - i * 864e5);
            const key = d.toISOString().slice(0, 10);
            const same = plist.filter((x) => x.createdAt && new Date(x.createdAt).toISOString().slice(0, 10) === key);
            days.push({ date: key, label: d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' }), total: same.reduce((a, x) => a + (x.amount || 0), 0), count: same.length });
          }
          const todayKey = new Date().toISOString().slice(0, 10);
          const tday = days.find((d) => d.date === todayKey) || { total: 0, count: 0 };
          r = { totalRevenue: tot, payments: plist.length, avgCheck: plist.length ? Math.round(tot / plist.length) : 0, todayTotal: tday.total, todayCount: tday.count, byPlan, byProvider: [], daily: days, recent: plist.slice(0, 30) };
        }
        setRev(r);
        rows = (r?.recent || []);
        setAdmin({ users: s.users, tests: s.tests, sat: s.sat, ielts: s.ielts, payments: s.payments || r.payments || 0, totalRevenue: r?.totalRevenue ?? s.totalRevenue ?? 0, tab, rows });
        setScreen('admin');
        setTimeout(() => document.getElementById('daromadlar-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
        return;
      }
      else rows = (await api.adminScores(tab === 'scores' ? undefined : tab)).results;
      setAdmin({ users: s.users, tests: s.tests, sat: s.sat, ielts: s.ielts, payments: s.payments || 0, totalRevenue: s.totalRevenue || 0, tab, rows });
      setScreen('admin');
      // Orqada daromadni oldindan yuklab qo'yamiz — daromadlar tez ochilishi uchun
      api.adminRevenue().then((r) => r && setRev(r)).catch(() => {});
    } catch (e) { showToast(e.message); }
  };
  // Bitta odamning AI bilan gaplashganlarini ochish
  const openUserChats = async (u) => {
    try {
      const d = await api.adminChats(u.nomer);
      setChatView({ ism: u.ism, nomer: u.nomer, chats: d.chats || [] });
    } catch (e) { showToast(e.message); }
  };
  // Tozalash — kodlar va barcha ma'lumotlar faqat shu tugma bosilganda o'chadi,
  // aks holda umrbod MongoDB da saqlanib turadi.
  const clearData = async (type) => {
    const labels = { results: 'barcha test natijalari', payments: 'barcha to‘lovlar', visits: 'kirishlar tarixi', chats: 'AI chatlar tarixi', users: 'barcha foydalanuvchilar va ularning kodlari (ADMIN dan tashqari)', all: 'HAMMA narsa (natija, to‘lov, chat + foydalanuvchi kodlari)' };
    if (!window.confirm(`Rostdan ham o‘chirasizmi?\n${labels[type] || type}\nBu amalni ortga qaytarib bo‘lmaydi!`)) return;
    if (type === 'users' || type === 'all') {
      if (!window.confirm('DIQQAT: foydalanuvchi KODLARI ham o‘chib ketadi!\nDavom etasizmi?')) return;
    }
    try {
      const r = await api.adminClear(type);
      showToast('Tozalandi: ' + JSON.stringify(r.cleared || {}));
      loadAdmin(admin.tab || 'users');
    } catch (e) { showToast(e.message); }
  };
  // To'lov qilish (realistik: Click/Payme ko'rinishi, summa tarif narxi bilan bir xil)
  const doPay = async () => {
    const card = payCard.replace(/\D/g, '');
    if (card.length !== 16) return showToast('Karta 16 ta raqam bo‘lishi shart');
    if (payExp.replace(/\D/g, '').length !== 4) return showToast('Amal muddatini kiriting (MM/YY)');
    if (payCvv && payCvv.replace(/\D/g, '').length !== 3) return showToast('CVV 3 raqam bo‘lishi shart');
    setPaying(true);
    try {
      const d = await api.buyPlan(payPlan, card, payProvider);
      const me = await api.me(); setUser(me.user);
      setPayPlan(null); setPayCard(''); setPayExp(''); setPayCvv(''); setPayName('');
      setScreen('menu'); showToast(`${PLANS[payPlan].name} faollashdi! ${(d.amount || PLANS[payPlan].price).toLocaleString()} so‘m to‘landi.`);
    } catch (e) { showToast(e.message); }
    setPaying(false);
  };

  // ---------- AI ----------
  const openAI = (m) => { setAiMode(m); setAiOpen(true); };
  const sendChat = async () => {
    if (!chatIn.trim()) return;
    const q = chatIn; setChatIn('');
    setChat(c => [...c, { me: true, t: q }, { me: false, t: 'Yozmoqda...' }]);
    const d = await api.ai(q, aiMode);
    const reply = d?.reply || 'Backend ulanmagan — offline rejim. Misol: 3x+7=22';
    setChat(c => [...c.slice(0, -1), { me: false, t: reply, html: true }]);
  };

  // ---------- CALC ----------
  const cIns = (s) => { setCExpr(cExpr + s); setCMain(cExpr + s || '0'); };
  const cEq = () => {
    try {
      const toRad = cDeg ? Math.PI / 180 : 1;
      const sin = x => Math.sin(x * toRad), cos = x => Math.cos(x * toRad), tan = x => Math.tan(x * toRad);
      const log10 = x => Math.log10(x), ln = x => Math.log(x), sqrt = x => Math.sqrt(x);
      const fact = n => { n = Math.floor(Number(n)); let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
      let e = cExpr.replace(/(\d+(?:\.\d+)?)!/g, 'fact($1)').replace(/\^/g, '**');
      const v = Function('sin', 'cos', 'tan', 'log10', 'ln', 'sqrt', 'fact', 'Math', '"use strict";return (' + e + ')')(sin, cos, tan, log10, ln, sqrt, fact, Math);
      const r = Math.round(v * 1e8) / 1e8;
      setCHist([`${cExpr} = ${r}`, ...cHist]); setCExpr(String(r)); setCMain(String(r));
    } catch { setCMain('Xato'); }
  };

  if (screen === 'auth' && !user) {
    const scrollLogin = () => document.getElementById('kirish')?.scrollIntoView({ behavior: 'smooth' });
    const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    return (
      <div className="ts-land">
        <header className="ts-top">
          <div className="ts-logo">
            <span className="ts-cap"><svg width="30" height="30" viewBox="0 0 30 30"><polygon points="4,11 15,5 26,11 15,17" fill="#8B1E2D" stroke="#0E1D3D" strokeWidth="1.8" strokeLinejoin="round" /><polygon points="15,11 15,11 15,11" fill="#F5B301" /><path d="M9 14 L15 17 L21 14 L21 20 L15 23 L9 20Z" fill="#F5B301" stroke="#0E1D3D" strokeWidth="1.8" strokeLinejoin="round" /></svg></span>
            <span className="ts-brand"><b>SAT Master</b><small>Your Future, Our Priority</small></span>
          </div>
          <nav className="ts-links">
            <span className="on" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Asosiy</span>
            <span onClick={() => scrollTo('ts-sat')}>SAT</span>
            <span onClick={() => scrollTo('ts-ielts')}>IELTS</span>
            <span onClick={() => scrollTo('ts-ustoz')}>Ustozlar</span>
            <span onClick={() => scrollTo('ts-biz')}>Biz haqimizda</span>
          </nav>
          <div className="ts-top-actions">
            <button className="ts-icon-btn" onClick={scrollLogin} aria-label="Qidiruv"><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><line x1="12.5" y1="12.5" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
            <button className="ts-kirish" onClick={scrollLogin}>Kirish</button>
          </div>
        </header>

        <section className="ts-hero">
          <div className="ts-hero-text">
            <span className="ts-pill"><i />Orzularingizga bir qadam yaqin</span>
            <h1>SAT va IELTS sari<br />ishonch bilan qadam<br />qo‘ying! <span className="brand">SAT Master</span></h1>
            <p>Biz sizga xalqaro imtihonlarga tayyorlanishda professional ustozlar, zamonaviy metodlar va qulay o‘quv muhitini taqdim etamiz.</p>
            <div className="ts-hero-btns">
              <button className="ts-btn-yellow" onClick={() => scrollTo('ts-kurslar')}>Kurslarni ko‘rish <span>→</span></button>
              <button className="ts-btn-outline" onClick={scrollLogin}><span className="play">▶</span> Bepul sinov darsi</button>
            </div>
          </div>
          <div className="ts-hero-art"><TsArt /></div>
        </section>

        <section className="ts-feats">
          <div className="ts-feat"><span className="fi f1"><svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="#B91C1C" /><path d="M4 20 Q4 14 12 14 Q20 14 20 20" fill="none" stroke="#B91C1C" strokeWidth="2.2" strokeLinecap="round" /></svg></span><div><b>Tajribali ustozlar</b><span>Bilimli va doimiy qollab-quvvatlovchi ustozlar jamoasi</span></div></div>
          <div className="ts-feat"><span className="fi f2"><svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="#B8860B" strokeWidth="2.2" /><circle cx="12" cy="12" r="4.5" fill="none" stroke="#B8860B" strokeWidth="2.2" /><circle cx="12" cy="12" r="1.6" fill="#B8860B" /></svg></span><div><b>Maqsadga yo‘naltirilgan ta’lim</b><span>Sizning maqsadingiz — bizning ustuvor vazifamiz</span></div></div>
          <div className="ts-feat"><span className="fi f3"><svg width="24" height="24" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="12" rx="2" fill="none" stroke="#B8860B" strokeWidth="2.2" /><path d="M8 20 L16 20 M12 16 L12 20" stroke="#B8860B" strokeWidth="2.2" strokeLinecap="round" /><path d="M8 9 l2 2 4 -4" fill="none" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span><div><b>Zamonaviy metodika</b><span>Interaktiv darslar va amaliy mashg‘ulotlar</span></div></div>
          <div className="ts-feat"><span className="fi f4"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 19 L9 12 L13 15 L20 6" fill="none" stroke="#B8860B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 6 L20 6 L20 11" fill="none" stroke="#B8860B" strokeWidth="2.4" strokeLinecap="round" /></svg></span><div><b>Xalqaro natijalar</b><span>O‘quvchilarimizning yutuqlari bizning faxrimiz</span></div></div>
        </section>

        <section className="ts-wave">
          <div className="ts-wave-inner">
            <div className="ts-wave-text">
              <span className="ts-wave-pill">Nima uchun SAT Master?</span>
              <h2>Sizning muvaffaqiyatingiz<br />biz uchun muhim!</h2>
              <p>SAT Master — bu faqat kurs emas, bu sizning orzularingiz sari boshlanadigan yo‘l. Biz siz bilan birga o‘rganamiz, birga rivojlanamiz, birga muvaffaqiyatga erishamiz.</p>
              <button className="ts-btn-yellow sm" onClick={scrollLogin}>Batafsil <span>→</span></button>
              <div className="ts-stats">
                <div className="ts-stat"><b>5+</b><span>Yillik tajriba</span></div>
                <div className="ts-stat"><b>10 000+</b><span>Muvaffaqiyatli o‘quvchilar</span></div>
                <div className="ts-stat"><b>90%+</b><span>Yuqori natija</span></div>
              </div>
            </div>
            <div className="ts-wave-art">
              <div className="ts-desk-card">
                <div className="ts-books3d"><span className="b1">SAT</span><span className="b2">IELTS</span><span className="b3">English</span></div>
                <div className="ts-mug">S</div>
              </div>
              <span className="ts-hand">Small steps<br />Big dreams</span>
            </div>
          </div>
        </section>

        <section className="ts-sec" id="ts-kurslar">
          <div className="ts-sec-head"><div><h2>Mashhur kurslarimiz</h2><p className="ts-sub">O‘z maqsadingizga tanlang va orzular sari harakat qiling!</p></div><button className="ts-more" onClick={scrollLogin}>Barchasini ko‘rish →</button></div>
          <div className="ts-course-grid" id="ts-sat">
            <div className="ts-course"><span className="cc-ic">🎓</span><div><h3>SAT</h3><p>Amerikaning eng nufuzli universitetlariga kirish uchun • 30+30 savol • 1600 ball</p><button onClick={scrollLogin}>Kursni ko‘rish →</button></div><span className="cc-flag">TOP</span></div>
            <div className="ts-course" id="ts-ielts"><span className="cc-ic">🌍</span><div><h3>IELTS</h3><p>Xalqaro imtihonlardan yuqori baho oling • Reading • Listening • Writing • Speaking</p><button onClick={scrollLogin}>Kursni ko‘rish →</button></div><span className="cc-flag">TOP</span></div>
            <div className="ts-course" id="ts-ustoz"><span className="cc-ic">👨‍🏫</span><div><h3>Individual darslar</h3><span className="cc-sub">Sizning ehtiyojlaringizga mos shaxsiy yondashuv</span><p>Tajribali ustozlar • AI yordamchi • Kunlik mashq</p><button onClick={scrollLogin}>Batafsil →</button></div></div>
          </div>
          <div className="ts-study">Study<br />Smart<br />Not Hard<span>☺</span></div>
        </section>

        <section className="ts-quote"><div className="ts-quote-inner">
          <span className="q">“</span>
          <p><b>SAT Master</b> — bu kelajak sari eng to‘g‘ri tanlov!</p>
          <button className="ts-btn-yellow sm" onClick={scrollLogin}>Hoziroq boshlash <span>→</span></button>
        </div></section>

        <section className="ts-sec ts-login-sec" id="kirish">
          <div className="ts-sec-head"><div><h2 id="ts-biz">Kirish — Bepul sinov darsi</h2><p className="ts-sub">Ism + telefon bilan kiring — shaxsiy 4 xonali kodingiz beriladi</p></div></div>
          <div className="ts-login-card">
            {!step2 && !hasCode ? <>
              <button className="ts-have-code" onClick={() => { setHasCode(true); setCodeArr(['', '', '', '']); }}>Mening kodim bor →</button>
              <label>Ismingiz</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Masalan: Jasur" />
              <label>Telefon (+998 dan keyingi 9 raqam)</label>
              <div className="ts-phone"><span>+998</span><input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="__ ___ __ __" inputMode="numeric" /></div>
              <button className="ts-btn-yellow full" style={{ marginTop: 16 }} onClick={sendCode}>Davom etish</button>
              <p className="ts-hint">Birinchi marta kirsangiz — shaxsiy 4 xonali kod beriladi.</p>
            </> : hasCode && !step2 ? <>
              <p className="ts-hint">Oldin berilgan <b>shaxsiy kodingizni</b> kiriting:</p>
              <label>Shaxsiy kirish kodi (4 xonali)</label>
              <div className="code-boxes ts-codes">{codeArr.map((c, i) => <input key={i} value={c} maxLength={1} inputMode="numeric" onChange={e => { const n = [...codeArr]; n[i] = e.target.value.replace(/\D/g, '').slice(0, 1); setCodeArr(n); if (n[i] && i < 3) document.querySelectorAll('.ts-codes input')[i + 1]?.focus(); }} onKeyDown={e => { if (e.key === 'Backspace' && !codeArr[i] && i > 0) document.querySelectorAll('.ts-codes input')[i - 1]?.focus(); }} />)}</div>
              <button className="ts-btn-red full" onClick={loginWithCodeOnly}>Kod bilan kirish</button>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => { setHasCode(false); setCodeArr(['', '', '', '']); }}>Ism + nomer bilan kirish</button>
            </> : <>
              <p className="ts-hint"><b>{fmtPhone(phone)}</b> — shaxsiy kodingizni kiriting:</p>
              <div className="code-boxes ts-codes">{codeArr.map((c, i) => <input key={i} value={c} maxLength={1} inputMode="numeric" onChange={e => { const n = [...codeArr]; n[i] = e.target.value.replace(/\D/g, '').slice(0, 1); setCodeArr(n); if (n[i] && i < 3) document.querySelectorAll('.ts-codes input')[i + 1]?.focus(); }} onKeyDown={e => { if (e.key === 'Backspace' && !codeArr[i] && i > 0) document.querySelectorAll('.ts-codes input')[i - 1]?.focus(); }} />)}</div>
              <button className="ts-btn-red full" onClick={verifyCode}>Kirish</button>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setStep2(false)}>Orqaga</button>
            </>}
          </div>
        </section>

        <footer className="ts-footer"><div className="ts-foot-in"><b>SAT Master</b><span>SAT • IELTS • AI • Kurslar • Natijalar</span><span>Orzularingga bir qadam yaqinlash</span></div></footer>
        {showCodeModal && myCode && (
          <div className="modal"><div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <h3>Sizning shaxsiy kodingiz!</h3>
            <p className="hint">Keyingi safar "Mening kodim bor" ni bosib shu kodni kiriting!</p>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: 10, color: '#8B1E2D', background: '#FFF6DE', border: '1.5px dashed #E8A100', borderRadius: 14, padding: 14, margin: '12px 0' }}>{myCode}</div>
            <button className="ts-btn-red full" onClick={() => setShowCodeModal(false)}>Tushundim, eslab qoldim</button>
          </div></div>
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  return (
    <div><div className="top-accent" /><div className={'wrap' + (user && screen !== 'auth' ? ' with-dock' : '')}>
      <div className="topbar">
        <div className="logo"><div className="logo-badge">S</div><div>SAT Master<small>SAT • IELTS • AI</small></div></div>
        {user && <div className="user-chip">
          <div className="avatar">{user.ism?.[0]?.toUpperCase()}</div>
          <div><b>{user.ism}</b><br /><span style={{ fontSize: 12 }}>{fmtPhone(user.nomer)}</span></div>
          <button className="heart-chip">♥ {user.hearts >= 9999 ? '∞' : user.hearts}</button>
          <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setScreen('profile')}>Profil</button>
          <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }} onClick={logout}>Chiqish</button>
        </div>}
      </div>
      {user && screen !== 'auth' && (
        <div className="side-dock left">
          <div className="side-logo"><div className="logo-badge">S</div><div>SAT Master<small>SAT • IELTS • AI</small></div></div>
          <div className="quick-grid side">
            <button className={'quick' + (screen === 'menu' ? ' active' : '')} onClick={() => setScreen('menu')}>🏠 Bosh sahifa</button>
            <button className="quick" onClick={() => startDaily('SAT')}>📝 Kunlik SAT</button>
            <button className="quick" onClick={() => startDaily('IELTS')}>📚 Kunlik IELTS</button>
            <button className={'quick' + (screen === 'rating' ? ' active' : '')} onClick={openRating}>🏆 Reyting</button>
            <button className={'quick' + (screen === 'profile' ? ' active' : '')} onClick={() => setScreen('profile')}>👤 Profil</button>
            <button className={'quick' + (screen === 'plans' ? ' active' : '')} onClick={() => setScreen('plans')}>⭐ PRO / MAX / ULTRA</button>
            <button className="quick" onClick={() => openAI('SAT')}>🤖 AI Yordamchi</button>
          </div>
          <div className="side-pro"><b>Pro rejaga o'ting</b>Cheksiz test va AI tahlil uchun tarifni yangilang.<button className="btn btn-primary btn-block" onClick={() => setScreen('plans')}>Obuna bo'lish</button></div>
        </div>
      )}

      {screen === 'menu' && (
        <div className="screen has-dock">
          <div className="card dash-hello"><h2>Salom, {user?.ism}! 👋</h2><p>Orzularing sari har bir test — yana bir qadam!</p>
          {myCode && <p className="hint">Shaxsiy kodingiz: <b style={{ fontSize: 20, letterSpacing: 5 }}>{myCode}</b></p>}</div>
          <div className="dash-big">
            <div className="dash-card sat"><div className="badge b-sat">SAT</div><h3>SAT</h3><p>English 30 + Math 30, 60 daqiqa, 5 daqiqa tanaffus, 1600 ball</p><span className="go" onClick={() => setScreen('sat')}>Testni boshlash →</span></div>
            <div className="dash-card ielts"><div className="badge b-ielts">IELTS</div><h3>IELTS</h3><p>Reading, Listening, Writing, Speaking. Band 0–9</p><span className="go" onClick={() => setScreen('ielts')}>Testni boshlash →</span></div>
          </div>
          <div className="dash-mini">
            <div className="mini" onClick={startSAT}><div className="ic">📝</div><b>To'liq testlar</b><span>60 savol • ball bilan</span></div>
            <div className="mini" onClick={() => startDaily('SAT')}><div className="ic">⚡</div><b>Kunlik mashq</b><span>10 savol • XP yig'ish</span></div>
            <div className="mini" onClick={() => openAI('SAT')}><div className="ic">🤖</div><b>AI Yordamchi</b><span>Savol-javob • tahlil</span></div>
            <div className="mini" onClick={() => setScreen('calc')}><div className="ic">🧮</div><b>Kalkulyator</b><span>Ilmiy • DEG/RAD</span></div>
          </div>
          <div className="dash-mini">
            <div className="mini"><div className="ic">🎯</div><b>Bugungi maqsad</b><span>{results.length} ta test bajarildi</span></div>
            <div className="mini" onClick={openRating}><div className="ic">🔥</div><b>Streak: {user?.streak || 0} kun</b><span>{user?.xp || 0} XP • Reyting →</span></div>
            <div className="mini" onClick={() => setScreen('profile')}><div className="ic">👤</div><b>Profil</b><span>Natijalar tarixi</span></div>
          </div>
          <div className="card trend-strip" onClick={openRating} style={{ cursor: 'pointer' }}>
            <div className="trend-strip-head"><span><span className="live-dot" />🔥 TRENDING</span><span className="go-link">Reyting →</span></div>
            <div className="trend-marquee">
              {(rating.slice(0, 5).length ? rating.slice(0, 5) : [{ ism: 'Yuklanmoqda...', xp: 0, streak: 0 }]).map((x, i) => {
                const t = trendOf(x, i);
                return <span key={i} className="trend-chip" style={{ animationDelay: `${i * 0.15}s` }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•'} {x.ism} — {x.xp} XP <b className={t.cls}>{t.icon}</b></span>;
              })}
            </div>
          </div>
        </div>
      )}

      {screen === 'sat' && (
        <div className="screen"><div className="backlink"><button className="btn btn-ghost" onClick={() => setScreen('menu')}>Bosh menyu</button></div>
          <div className="card"><h2>SAT Bo‘limi</h2>
            <div className="action-grid">
              <button className="action" onClick={startSAT}><h3>To‘liq Test</h3><p>English → tanaffus → Math</p></button>
              <button className="action" onClick={() => openAI('SAT')}><h3>AI Yordamchi</h3><p>SAT savollari</p></button>
              <button className="action" onClick={() => setScreen('calc')}><h3>Kalkulyator</h3><p>Ilmiy</p></button>
              <button className="action" onClick={() => startDaily('SAT')}><h3>Kunlik mashq</h3><p>10 savol</p></button>
            </div>
            {results.filter(r => r.type === 'SAT').slice(-4).reverse().map((r, i) => <div key={i} className="q" style={{ marginTop: 8 }}><b>{r.score}</b> — {r.detail}</div>)}
          </div></div>
      )}

      {screen === 'sattest' && sat && (
        <div className="screen">
          <div className="test-head"><div><span className="badge b-sat">{sat.sec === 0 ? 'ENGLISH' : 'MATH'}</span><div className="hint">{(sat.sec === 0 ? sat.idx + 1 : sat.idx + 31)} / 60</div></div><div className="timer">{mmss(sat.tLeft)}</div></div>
          <div className="progress"><i style={{ width: ((sat.sec * 30 + sat.idx) / 60 * 100) + '%' }} /></div>
          <div className="nav-grid">{Array.from({ length: 30 }).map((_, i) => {
            const k = sat.sec + '_' + i; let c = 'dot';
            if (k in sat.ans) c += ' done'; else if (k in sat.skipped) c += ' skip'; if (i === sat.idx) c += ' cur';
            return <button key={i} className={c} onClick={() => setSat({ ...sat, idx: i })}>{i + 1}</button>;
          })}</div>
          {(() => { const L = sat.sec === 0 ? SAT_EN : SAT_MATH; const q = L[sat.idx];
            return <div className="q"><h3>{sat.idx + 1}. {q[0]}</h3>{q[1].map((o, i) => <button key={i} className={'opt' + (sat.ans[sat.sec + '_' + sat.idx] === i ? ' sel' : '')} onClick={() => setSat({ ...sat, ans: { ...sat.ans, [sat.sec + '_' + sat.idx]: i } })}>{String.fromCharCode(65 + i)}. {o}</button>)}</div>;
          })()}
          <div className="bottom-bar">
            <button className="btn btn-amber" onClick={() => { setSat({ ...sat, skipped: { ...sat.skipped, [sat.sec + '_' + sat.idx]: 1 } }); satMove(1); }}>O‘tkazib yuborish</button>
            <button className="btn btn-ghost" onClick={() => satMove(-1)}>Oldingi</button>
            <button className="btn btn-primary" onClick={() => satMove(1)}>{sat.sec === 1 && sat.idx === 29 ? 'Yakunlash' : 'Keyingi'}</button>
          </div>
        </div>
      )}

      {screen === 'break' && brk && (
        <div className="screen"><div className="card break-box"><h2>5 daqiqa tanaffus!</h2><p className="hint">{brk.msg}</p><div className="break-timer">{mmss(brk.left)}</div>
          <button className="btn btn-primary btn-block" onClick={() => { const cb = window._brkCb; setBrk(null); cb && cb(); }}>O‘tkazib yuborish</button></div></div>
      )}

      {screen === 'result' && result && (
        <div className="screen"><div className="card score-hero"><h2>{result.title}</h2>
          <div className={result.band ? 'band' : 'score-num'}>{result.score}</div>
          <div className="hint">{result.detail}</div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => setScreen('menu')}>Bosh menyu</button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => result.retry === 'sat' ? startSAT() : startIELTS()}>Qayta topshirish</button>
        </div></div>
      )}

      {screen === 'ielts' && (
        <div className="screen"><div className="backlink"><button className="btn btn-ghost" onClick={() => setScreen('menu')}>Bosh menyu</button></div>
          <div className="card"><h2>IELTS Bo‘limi</h2>
            <div className="action-grid">
              <button className="action" onClick={startIELTS}><h3>Mock Test</h3><p>R → L → W → S</p></button>
              <button className="action" onClick={() => openAI('IELTS')}><h3>AI Yordamchi</h3><p>Writing, Speaking</p></button>
              <button className="action" onClick={() => startDaily('IELTS')}><h3>Kunlik mashq</h3><p>10 savol</p></button>
              <button className="action" onClick={openRating}><h3>Reyting</h3><p>Top 50</p></button>
            </div></div></div>
      )}

      {screen === 'ieltstest' && ie && (
        <div className="screen">
          <div className="test-head"><div><span className="badge b-ielts">{ie.stage.toUpperCase()}</span></div><div className="timer">{mmss(ie.tLeft)}</div></div>
          {(ie.stage === 'reading' || ie.stage === 'listening') && (() => {
            const D = ie.stage === 'reading' ? IE_READING : IE_LISTEN; const q = D.qs[ie.idx];
            return <>{ie.stage === 'reading' ? <div className="passage">{D.passage}</div> : <div className="q"><p><i>{D.audio}</i></p></div>}
              <div className="q"><h3>{ie.idx + 1}. {q[0]}</h3>{q[1].map((o, i) => <button key={i} className={'opt' + (ie.ans[ie.stage + '_' + ie.idx] === i ? ' sel' : '')} onClick={() => setIe({ ...ie, ans: { ...ie.ans, [ie.stage + '_' + ie.idx]: i } })}>{String.fromCharCode(65 + i)}. {o}</button>)}</div></>;
          })()}
          {ie.stage === 'writing' && <div className="q"><h3>{IE_WRITING[ie.idx]}</h3><textarea rows={9} value={ie.txt['w_' + ie.idx] || ''} onChange={e => setIe({ ...ie, txt: { ...ie.txt, ['w_' + ie.idx]: e.target.value } })} placeholder="Javob (inglizcha)..." /></div>}
          {ie.stage === 'speaking' && <div className="speak-card"><h3>{IE_SPEAK[ie.idx]}</h3><textarea rows={5} value={ie.txt['s_' + ie.idx] || ''} onChange={e => setIe({ ...ie, txt: { ...ie.txt, ['s_' + ie.idx]: e.target.value } })} placeholder="Reja / javob..." /></div>}
          <div className="bottom-bar">
            <button className="btn btn-amber" onClick={() => ieMove(1)}>O‘tkazib yuborish</button>
            <button className="btn btn-ghost" onClick={() => ieMove(-1)}>Oldingi</button>
            <button className="btn btn-primary" onClick={() => ieMove(1)}>Keyingi</button>
          </div>
        </div>
      )}

      {screen === 'calc' && (
        <div className="screen"><div className="backlink"><button className="btn btn-ghost" onClick={() => setScreen('menu')}>Menyu</button></div>
          <div className="card"><h2>Ilmiy kalkulyator</h2>
            <div className="calc-shell">
              <div className="calc-hist">{cHist.length ? cHist.map((h, i) => <div key={i}>{h}</div>) : 'Tarix bo‘sh'}</div>
              <div className="calc-display"><div className="calc-expr">{cExpr || ' '}</div><div className="calc-main">{cMain}</div></div>
              <div className="mode-row"><button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setCDeg(!cDeg)}>Burchak: {cDeg ? 'DEG' : 'RAD'}</button><button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setCExpr(''); setCMain('0'); }}>C</button></div>
              <div className="calc">
                <button onClick={() => cIns('7')}>7</button><button onClick={() => cIns('8')}>8</button><button onClick={() => cIns('9')}>9</button><button className="op" onClick={() => cIns('/')}>/</button>
                <button className="fn" onClick={() => cIns('sin(')}>sin</button><button className="fn" onClick={() => cIns('cos(')}>cos</button><button className="fn" onClick={() => cIns('tan(')}>tan</button><button className="op" onClick={() => cIns('*')}>x</button>
                <button className="fn" onClick={() => cIns('log10(')}>log</button><button className="fn" onClick={() => cIns('sqrt(')}>√</button><button className="fn" onClick={() => cIns('**')}>x^y</button><button className="op" onClick={() => cIns('-')}>-</button>
                <button onClick={() => cIns('4')}>4</button><button onClick={() => cIns('5')}>5</button><button onClick={() => cIns('6')}>6</button><button className="op" onClick={() => cIns('+')}>+</button>
                <button onClick={() => cIns('1')}>1</button><button onClick={() => cIns('2')}>2</button><button onClick={() => cIns('3')}>3</button><button className="fn" onClick={() => cIns('!')}>n!</button>
                <button onClick={() => cIns('(')}>(</button><button onClick={() => cIns('0')}>0</button><button onClick={() => cIns(')')}>)</button><button className="eq" onClick={cEq}>=</button>
              </div></div></div></div>
      )}

      {screen === 'plans' && (
        <div className="screen"><div className="backlink"><button className="btn btn-ghost" onClick={() => setScreen('menu')}>Menyu</button></div>
          <div className="card"><h2>Tariflar</h2><div className="plan-grid">
            {Object.entries(PLANS).filter(([k]) => k !== 'free').map(([k, p]) => (
              <div key={k} className={'plan' + (k === 'max' ? ' hot' : '')}><h3>{p.name}</h3><div className="price">{p.price.toLocaleString()} so‘m</div>
                <ul><li><b>♥</b> {p.hearts >= 9999 ? 'Cheksiz' : p.hearts + ' ta yurak'}</li><li>Kunlik mashq</li><li>AI yordamchi</li></ul>
                <button className="btn btn-primary btn-block" onClick={() => { setPayPlan(k); setPayCard(''); setPayExp(''); setPayCvv(''); setPayName(user?.ism || ''); }}>Sotib olish</button></div>
            ))}</div></div></div>
      )}

      {screen === 'daily' && daily && (
        <div className="screen"><div className="backlink"><button className="btn btn-ghost" onClick={() => setScreen('menu')}>Chiqish</button></div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="badge b-sat">{daily.type} — Kunlik</span><span className="heart">{'♥'.repeat(Math.min(daily.hearts, 10)) || '—'}</span></div>
            {daily.done ? <div style={{ textAlign: 'center', padding: 20 }}><h2>Yakunlandi!</h2><p className="hint">{daily.correct}/{daily.qs.length} to‘g‘ri. +{daily.xp} XP {daily.first === false ? '(bugun olingan)' : ''}</p>
              <button className="btn btn-primary" onClick={openRating}>Reyting</button></div>
              : daily.hearts <= 0 ? <div style={{ textAlign: 'center', padding: 20 }}><h2>Yurak tugadi!</h2><button className="btn btn-primary" onClick={() => setScreen('plans')}>Tarif olish</button></div>
                : (() => { const item = daily.qs[daily.idx]; if (!item) return null;
                  return <div className="q"><h3>{daily.idx + 1}. [{item.t}] {item.q[0]}</h3>{item.q[1].map((o, i) => <button key={i} className="opt" onClick={() => dailyAns(i)}>{String.fromCharCode(65 + i)}. {o}</button>)}</div>; })()}
          </div></div>
      )}

      {screen === 'rating' && (() => {
        const g = getGrowth();
        const W = 600, H = 230, P = 34;
        const YMIN = 800, YMAX = 1600;
        const X = (i) => P + (i * (W - P * 2)) / Math.max(1, g.sat.length - 1);
        const Y = (v) => H - P - ((Math.min(YMAX, Math.max(YMIN, v)) - YMIN) / (YMAX - YMIN)) * (H - P * 2);
        const satPts = g.sat.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
        const iePts = g.ie.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
        const satPct = g.sat.length > 1 ? (((g.sat[g.sat.length - 1] - g.sat[g.sat.length - 2]) / g.sat[g.sat.length - 2]) * 100).toFixed(1) : '1.2';
        const iePct = g.ie.length > 1 ? (((g.ie[g.ie.length - 1] - g.ie[g.ie.length - 2]) / g.ie[g.ie.length - 2]) * 100).toFixed(1) : '0.3';
        return (
        <div className="screen"><div className="backlink"><button className="btn btn-ghost" onClick={() => setScreen('menu')}>Menyu</button></div>
          <div className="card growth-card">
            <h3 className="growth-title">O‘sish statistikasi</h3>
            <div className="growth-tabs">
              {['haftalik', 'oylik', 'yillik'].map(t => (
                <button key={t} className={'g-tab' + (growthTab === t ? ' on' : '')} onClick={() => setGrowthTab(t)}>{t === 'haftalik' ? 'Haftalik' : t === 'oylik' ? 'Oylik' : 'Yillik'}</button>
              ))}
            </div>
            <div className="growth-legend"><span><i className="dot-sat" />— SAT</span><span><i className="dot-ielts" />— IELTS</span></div>
            <div className="growth-chart-wrap">
              <div className="growth-y">{[1600, 1400, 1200, 1000, 800].map(y => <span key={y}>{y}</span>)}</div>
              <svg className="growth-chart" viewBox={`0 0 ${W} ${H}`} key={growthTab}>
                {[1600, 1400, 1200, 1000, 800].map(y => (
                  <line key={y} x1={P} x2={W - P} y1={Y(y)} y2={Y(y)} className="grid" />
                ))}
                <polyline points={iePts} className="line-ielts" />
                <polyline points={satPts} className="line-sat" />
                {g.sat.map((v, i) => <circle key={'s' + i} cx={X(i)} cy={Y(v)} r="4.5" className="pt-sat" style={{ animationDelay: `${i * 0.12}s` }} />)}
                {g.ie.map((v, i) => <circle key={'e' + i} cx={X(i)} cy={Y(v)} r="4.5" className="pt-ielts" style={{ animationDelay: `${i * 0.12 + 0.3}s` }} />)}
              </svg>
            </div>
            <div className="growth-x">{g.labels.map((l, i) => <span key={i} style={{ left: `${(X(i) / W) * 100}%` }}>{l}</span>)}</div>
            <div className="growth-bottom">
              <div className="growth-box"><span className="gb-label">@trendwatch</span><b>SAT<br />{g.satVal}</b><span className="gb-up">↗ +{satPct}%</span></div>
              <div className="growth-box"><span className="gb-label">@trendwatch</span><b>IELTS<br />{g.ieVal}</b><span className="gb-up">↗ +{iePct}%</span></div>
            </div>
          </div>
          <div className="card trend-hero">
            <div className="trend-title"><span className="live-dot" />🔥 TRENDING — eng faol o‘quvchilar<div className="trend-sub">Ko‘p XP + streak yig‘ganlar yuqoriga otilmoqda</div></div>
            <div className="trend-top">
              {rating.slice(0, 3).map((x, i) => {
                const t = trendOf(x, i);
                return (
                  <div key={i} className={'trend-card r' + (i + 1)} style={{ animationDelay: `${i * 0.12}s` }}>
                    <div className="trend-medal">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                    <b className="trend-name">{x.ism}</b>
                    <div className="trend-xp">{x.xp} XP</div>
                    <div className={`trend-badge ${t.cls}`}><span className="trend-arrow">{t.icon}</span>{t.label}</div>
                    {(x.streak || 0) > 0 && <div className="trend-streak">🔥 {x.streak} kun streak</div>}
                  </div>
                );
              })}
              {rating.length === 0 && <p className="hint">Hali reyting bo‘sh — birinchi bo‘ling!</p>}
            </div>
          </div>
          <div className="card"><h2>🏆 Reyting — Top 50</h2>
            <p className="hint">Strelkalar kim yaxshi o‘qiyotganini ko‘rsatadi: <b className="t-up">↗ o‘sishda</b> • <b className="t-flat">→ barqaror</b></p>
            {rating.map((x, i) => {
              const t = trendOf(x, i);
              const isMe = user && x.nomer === user.nomer;
              return (
                <div key={i} className={'rate-row trend-row' + (isMe ? ' me' : '')} style={{ animationDelay: `${Math.min(i * 0.05, 1)}s` }}>
                  <div className={'rank' + (i < 3 ? ' top' : '')}>{i + 1}</div>
                  <div style={{ flex: 1 }}><b>{x.ism} {i < 3 && '🔥'}</b><br /><span style={{ fontSize: 12 }}>{fmtPhone(x.nomer)}{(x.streak || 0) > 0 ? ` • 🔥${x.streak}` : ''}</span></div>
                  <div className={`trend-arrow-big ${t.cls}`} title={t.label}>{t.icon}</div>
                  <div style={{ textAlign: 'right' }}><b>{x.xp} XP</b><br /><span className={`trend-mini ${t.cls}`}>{t.label}</span></div>
                </div>
              );
            })}
            {rating.length === 0 && <p className="hint">Hali hech kim yo‘q.</p>}
          </div></div>
        );
      })()}

      {screen === 'profile' && user && (
        <div className="screen"><div className="backlink"><button className="btn btn-ghost" onClick={() => setScreen('menu')}>Menyu</button></div>
          <div className="card">
            <div className="profile-head"><div className="big-ava">{user.ism[0].toUpperCase()}</div><div><h2>{user.ism}</h2><div className="hint">{fmtPhone(user.nomer)}</div><span className={'plan-badge ' + user.plan}>{(PLANS[user.plan] || {}).name || user.plan}</span> <span className="heart-chip">♥ {user.hearts >= 9999 ? '∞' : user.hearts}</span>{myCode && <div className="hint">Kod: <b>{myCode}</b></div>}</div></div>
            <div className="stat-row"><div className="stat"><b>{user.xp}</b><span>XP</span></div><div className="stat"><b>{user.streak || 0}</b><span>Seriya</span></div><div className="stat"><b>{results.length}</b><span>Testlar</span></div><div className="stat"><b>{user.plan?.toUpperCase()}</b><span>Tarif</span></div></div>
            <h4>Testlar tarixi:</h4>{results.slice(0, 6).map((r, i) => <div key={i} className="q" style={{ marginTop: 6 }}><span className={'badge ' + (r.type === 'SAT' ? 'b-sat' : 'b-ielts')}>{r.type}</span> <b>{r.score}</b> — {r.detail}</div>)}
          </div></div>
      )}

      {screen === 'admin' && (
        <div className="screen admin-anim"><div className="card admin-hero-card"><div className="admin-hero-bg"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <h2 className="anim-pop">👑 ADMIN Panel — SAT Master</h2>
          <p className="hint">Kirishlar va to‘lovlar avtomatik hisoblanib turadi • Hamma narsa jonli animatsiyada ✨</p>
          <div className="stat-row anim-stagger"><div className="stat anim-float" style={{ animationDelay: '0s' }}><b>{admin.users}</b><span>Kirishganlar</span></div><div className="stat anim-float" style={{ animationDelay: '.15s' }}><b>{admin.tests}</b><span>Testlar</span></div><div className="stat anim-float" style={{ animationDelay: '.3s' }}><b>{admin.sat}</b><span>SAT</span></div><div className="stat anim-float" style={{ animationDelay: '.45s' }}><b>{admin.ielts}</b><span>IELTS</span></div></div>
          <div className="stat-row"><div className="stat money-mini anim-pop"><b>💳 {admin.payments}</b><span>To‘lovlar soni</span></div><div className="stat money-mini gold anim-pop" style={{ gridColumn: 'span 3', animationDelay: '.12s' }}><b className="money-glow">{(admin.totalRevenue || 0).toLocaleString()} so‘m 💰</b><span>Jami tushgan pul (PRO/MAX/ULTRA)</span></div></div>
          <button className="btn btn-primary btn-block rev-open-btn" onClick={() => loadAdmin('daromadlar')}>💰 Daromadlarni ko‘rish — batafsil grafik, tariflar, kunlik tushum →</button>
          <div className="tabs admin-tabs">{['users', 'scores', 'SAT', 'IELTS', 'payments', 'daromadlar'].map(t => <button key={t} className={'tab admin-tab' + (t === 'daromadlar' ? ' rev-tab' : '') + (admin.tab === t ? ' on' : '')} onClick={() => loadAdmin(t)}>{t === 'payments' ? '💳 to‘lovlar' : t === 'daromadlar' ? '💰 DAROMADLAR' : t === 'users' ? '👥 users' : t}</button>)}</div>
          {admin.tab === 'daromadlar' ? (
            <div className="rev-wrap" id="daromadlar-block">
              {!rev ? <p className="hint rev-loading"><span className="loader-coin">🪙</span> Yuklanmoqda...</p> : (() => {
                const daily = (rev.daily || []).slice(-Number(revRange));
                const maxV = Math.max(1, ...daily.map(d => d.total));
                const W = 640, H = 220, P = 30;
                const X = (i) => P + (i * (W - P * 2)) / Math.max(1, daily.length - 1);
                const Y = (v) => H - P - (v / maxV) * (H - P * 2);
                const pts = daily.map((d, i) => `${X(i)},${Y(d.total)}`).join(' ');
                const area = `${P},${H - P} ${pts} ${X(daily.length - 1)},${H - P}`;
                const tot = rev.totalRevenue || 0;
                const pPro = tot ? Math.round((rev.byPlan?.pro?.total || 0) / tot * 100) : 0;
                const pMax = tot ? Math.round((rev.byPlan?.max?.total || 0) / tot * 100) : 0;
                const pUltra = tot ? Math.round((rev.byPlan?.ultra?.total || 0) / tot * 100) : 0;
                return (<>
                  <div className="rev-hero">
                    <div className="coins"><span>🪙</span><span>💸</span><span>🪙</span><span>💰</span><span>🪙</span></div>
                    <div className="rev-hero-top"><span className="live-dot" />💰 JAMI DAROMAD — jonli hisoblagich</div>
                    <div className="rev-total">{animTotal.toLocaleString()} <small>so‘m</small></div>
                    <div className="rev-sub">Haqiqiy tushgan pul • Click / Payme • PRO-MAX-ULTRA</div>
                    <div className="rev-cards">
                      <div className="rev-card c1"><div className="rev-ic">🧾</div><b>{animCount} ta</b><span>Jami to‘lovlar</span></div>
                      <div className="rev-card c2"><div className="rev-ic">📅</div><b>{animToday.toLocaleString()} so‘m</b><span>Bugun: {rev.todayCount || 0} ta to‘lov</span></div>
                      <div className="rev-card c3"><div className="rev-ic">📊</div><b>{(rev.avgCheck || 0).toLocaleString()} so‘m</b><span>O‘rtacha chek</span></div>
                    </div>
                  </div>
                  <div className="rev-range-row">
                    <b>📈 Kunlik daromad grafigi</b>
                    <div className="growth-tabs">{[['7', '7 kun'], ['14', '14 kun']].map(([v, l]) => <button key={v} className={'g-tab' + (revRange === v ? ' on' : '')} onClick={() => setRevRange(v)}>{l}</button>)}</div>
                  </div>
                  <div className="rev-chart-card">
                    <svg className="rev-chart" viewBox={`0 0 ${W} ${H}`} key={revRange}>
                      <defs><linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity=".45" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" /></linearGradient>
                      <linearGradient id="revLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#16a34a" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient></defs>
                      {[0.25, 0.5, 0.75, 1].map(f => <line key={f} x1={P} x2={W - P} y1={H - P - (H - P * 2) * f} y2={H - P - (H - P * 2) * f} className="grid" />)}
                      <polygon points={area} fill="url(#revFill)" className="rev-area" />
                      <polyline points={pts} className="rev-line" fill="none" />
                      {daily.map((d, i) => (
                        <g key={i} className="rev-dot-g" style={{ animationDelay: `${i * 0.07}s` }}>
                          <circle cx={X(i)} cy={Y(d.total)} r="12" className="rev-halo" />
                          <circle cx={X(i)} cy={Y(d.total)} r="6" className="rev-dot" />
                          <text x={X(i)} y={Y(d.total) - 16} textAnchor="middle" className="rev-val">{d.total ? (d.total / 1000).toFixed(0) + 'k' : ''}</text>
                          <text x={X(i)} y={H - 8} textAnchor="middle" className="rev-date">{d.label}</text>
                        </g>
                      ))}
                    </svg>
                    <div className="rev-bars">{daily.map((d, i) => <div key={i} className="rev-bar-col"><div className="rev-bar" style={{ '--h': `${Math.max(4, (d.total / maxV) * 100)}%`, animationDelay: `${i * 0.06}s` }}><span>{d.count || ''}</span></div><small>{d.label}</small></div>)}</div>
                  </div>
                  <div className="rev-plans">
                    <div className="rev-plan pro"><div className="rev-plan-head"><span>⭐ PRO</span><b>{(rev.byPlan?.pro?.total || 0).toLocaleString()} so‘m</b></div><div className="pbar rev-pbar"><i style={{ '--w': pPro + '%' }} /></div><small>{rev.byPlan?.pro?.count || 0} ta to‘lov • {pPro}%</small></div>
                    <div className="rev-plan max"><div className="rev-plan-head"><span>🚀 MAX</span><b>{(rev.byPlan?.max?.total || 0).toLocaleString()} so‘m</b></div><div className="pbar rev-pbar"><i style={{ '--w': pMax + '%' }} /></div><small>{rev.byPlan?.max?.count || 0} ta to‘lov • {pMax}%</small></div>
                    <div className="rev-plan ultra"><div className="rev-plan-head"><span>👑 ULTRA</span><b>{(rev.byPlan?.ultra?.total || 0).toLocaleString()} so‘m</b></div><div className="pbar rev-pbar"><i style={{ '--w': pUltra + '%' }} /></div><small>{rev.byPlan?.ultra?.count || 0} ta to‘lov • {pUltra}%</small></div>
                  </div>
                  <div className="rev-prov-row">{(rev.byProvider || []).map((p, i) => <div key={i} className="rev-prov">{p._id === 'click' ? '💳' : '💚'} <b>{p._id}</b> — {(p.total || 0).toLocaleString()} so‘m ({p.count} ta)</div>)}</div>
                  <h4 className="rev-recent-title">🧾 So‘nggi to‘lovlar — pul qayerga tushgani</h4>
                  <div className="rev-list">{(rev.recent || []).map((p, i) => (
                    <div key={i} className="rev-item" style={{ animationDelay: `${Math.min(i * 0.06, 0.8)}s` }}>
                      <div className="rev-ava">{(p.ism || '?')[0]?.toUpperCase()}</div>
                      <div style={{ flex: 1 }}><b>{p.ism}</b> <span className={'plan-badge ' + p.plan}>{p.plan}</span><br /><small>{fmtPhone(p.nomer)} • {p.provider} • {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</small></div>
                      <div className="rev-amount">+{(p.amount || 0).toLocaleString()}<small>so‘m</small></div>
                    </div>
                  ))}{!(rev.recent || []).length && <p className="hint">Hali to‘lov yo‘q — birinchi to‘lovni kuting 💸</p>}</div>
                </>);
              })()}
            </div>
          ) : admin.tab === 'users' ? (
            <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Ism</th><th>Nomer</th><th>Tarif</th><th>AI chat</th></tr></thead><tbody>{(admin.rows || []).slice(0, 100).map((r, i) => (
              <tr key={i}><td><b>{r.ism}</b></td><td>{fmtPhone(r.nomer)}</td><td>{r.plan || 'free'} • ♥{r.hearts} • {r.xp} XP</td>
                <td><button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => openUserChats(r)}>AI bilan gaplashgani</button></td></tr>
            ))}</tbody></table></div>
          ) : admin.tab === 'payments' ? (
            <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Ism</th><th>Nomer</th><th>Tarif</th><th>Summa</th><th>Sana</th></tr></thead><tbody>{(payList || []).slice(0, 100).map((p, i) => (
              <tr key={i}><td><b>{p.ism}</b></td><td>{fmtPhone(p.nomer)}</td><td>{p.plan} ({p.provider})</td><td><b>{(p.amount || 0).toLocaleString()} so‘m</b></td><td style={{ fontSize: 12 }}>{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</td></tr>
            ))}</tbody></table>{!(payList || []).length && <p className="hint">Hali to‘lov yo‘q</p>}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}><table><tbody>{(admin.rows || []).slice(0, 50).map((r, i) => <tr key={i}><td>{r.ism}</td><td>{fmtPhone(r.nomer)}</td><td>{r.score || r.plan || ''} {r.detail || ''}</td></tr>)}</tbody></table></div>
          )}
          <div className="card" style={{ marginTop: 12, background: '#fff7f7', border: '1px solid #f5c2c2' }}>
            <h4 style={{ margin: '0 0 6px' }}>Tozalash (faqat ADMIN)</h4>
            <p className="hint" style={{ margin: '0 0 10px' }}>Barcha kodlar va ma‘lumotlar umrbod saqlanadi — faqat shu tugmalar bosilganda o‘chadi.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={() => clearData('results')}>Natijalarni tozalash</button>
              <button className="btn btn-ghost" onClick={() => clearData('payments')}>To‘lovlarni tozalash</button>
              <button className="btn btn-ghost" onClick={() => clearData('chats')}>Chatlarni tozalash</button>
              <button className="btn btn-ghost" onClick={() => clearData('visits')}>Kirishlarni tozalash</button>
              <button className="btn btn-amber" onClick={() => clearData('users')}>Kodlarni tozalash</button>
              <button className="btn btn-green" onClick={() => clearData('all')}>Hammasini tozalash</button>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={logout}>Chiqish</button>
        </div></div>
      )}

      {aiOpen && (
        <div className="modal"><div className="card" style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>AI — {aiMode}</h3><button className="btn btn-ghost" onClick={() => setAiOpen(false)}>Yopish</button></div>
          <div className="chat">{chat.map((m, i) => <div key={i} className={'msg ' + (m.me ? 'me' : 'bot')} dangerouslySetInnerHTML={m.html ? { __html: m.t } : undefined}>{m.html ? undefined : m.t}</div>)}</div>
          <div className="chat-row"><input value={chatIn} onChange={e => setChatIn(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Savol yozing..." /><button className="btn btn-primary" onClick={sendChat}>Yuborish</button></div>
        </div></div>
      )}

      {payPlan && (
        <div className="modal pay-modal-bg"><div className="pay-modal">
          <div className="pay-left">
            <div className="pay-brand"><div className="pay-cap">🎓</div><div><b>SAT & IELTS</b><span>Your Future, Our Priority</span></div></div>
            <div className="pay-div" />
            <h4>Payment Details</h4>
            <div className="pay-plan-row"><div className="pay-plan-ic">◉</div><div style={{ flex: 1 }}><b>{PLANS[payPlan].name}</b><span>{payPlan === 'pro' ? 'PRO Tarif' : payPlan === 'max' ? 'MAX Tarif' : 'ULTRA Tarif'} • 1 oy</span></div><b>{PLANS[payPlan].price.toLocaleString()} so‘m</b></div>
            <div className="pay-div" />
            <div className="pay-total"><span>Total Amount</span><b>{PLANS[payPlan].price.toLocaleString()} so‘m</b></div>
            <div className="pay-provider-row">
              {['click', 'payme'].map(p => <button key={p} className={'pay-prov' + (payProvider === p ? ' on' : '')} onClick={() => setPayProvider(p)}>{p === 'click' ? '💳 Click' : '💚 Payme'}</button>)}
            </div>
            <p className="pay-secure">🔒 Your payment is secure and encrypted</p>
            <div className="pay-ill">🎓<div>Take the next step<br />towards your dreams</div></div>
          </div>
          <div className="pay-right">
            <div className="pay-head"><div><h3>Pay with Card</h3><p>Enter your card details to complete the payment.</p></div><button className="btn btn-ghost pay-close" onClick={() => setPayPlan(null)}>✕</button></div>
            <div className="pay-brands"><span className="brand visa">VISA</span><span className="brand mc"><i /> <i /></span><span className="brand amex">AMEX</span><span className="brand uzum">Uzum</span></div>
            <div className="pay-grid">
              <div className="pay-field full"><label>Card Number</label><div className="pay-in"><span>💳</span><input value={payCard.replace(/(\d{4})(?=\d)/g, '$1 ')} onChange={e => setPayCard(e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="1234 5678 9012 3456" inputMode="numeric" /></div></div>
              <div className="pay-preview">
                <div className="cc-chip">▦</div>
                <div className="cc-num">{payCard ? payCard.replace(/(\d{4})(?=\d)/g, '$1 ').padEnd(19, '•') : '1234 5678 9012 3456'}</div>
                <div className="cc-row"><span>VALID<br />THRU <b>{payExp || '12/28'}</b></span><span className="cc-mc"><i /> <i /></span></div>
                <div className="cc-name">{(payName || 'CARDHOLDER NAME').toUpperCase()}</div>
              </div>
              <div className="pay-field"><label>Expiry Date</label><div className="pay-in"><span>📅</span><input value={payExp} onChange={e => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); setPayExp(v); }} placeholder="MM / YY" inputMode="numeric" /></div></div>
              <div className="pay-field"><label>CVV</label><div className="pay-in"><span>🔒</span><input value={payCvv} onChange={e => setPayCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="123" inputMode="numeric" /></div></div>
              <div className="pay-field full"><label>Cardholder Name</label><div className="pay-in"><span>👤</span><input value={payName} onChange={e => setPayName(e.target.value.slice(0, 30))} placeholder="John Doe" /></div></div>
            </div>
            <button className="pay-now" disabled={paying} onClick={doPay}>{paying ? 'Tekshirilmoqda...' : `💳 Pay Now — ${PLANS[payPlan].price.toLocaleString()} so‘m`}</button>
            <p className="pay-powered">🔒 Secure payment powered by <b>{payProvider === 'click' ? 'Click' : 'Payme'}</b></p>
          </div>
        </div></div>
      )}

      {chatView && (
        <div className="modal"><div className="card" style={{ maxWidth: 600, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3>{chatView.ism} — AI bilan gaplashgani</h3><button className="btn btn-ghost" onClick={() => setChatView(null)}>Yopish</button></div>
          <p className="hint">{fmtPhone(chatView.nomer)} • Jami: {(chatView.chats || []).length} ta savol</p>
          {!(chatView.chats || []).length && <p className="hint">Bu odam hali AI bilan gaplashmagan.</p>}
          {(chatView.chats || []).map((c, i) => (
            <div key={i} className="q" style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#5c6c8f' }}>{c.mode} • {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</div>
              <div style={{ marginTop: 6 }}><b>Savol:</b> {c.question}</div>
              <div style={{ marginTop: 4 }} dangerouslySetInnerHTML={{ __html: c.reply }} />
            </div>
          ))}
        </div></div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div></div>
  );
}
