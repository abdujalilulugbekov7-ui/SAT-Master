require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Production CORS: CLIENT_URL da vergul bilan bir nechta domen bo'lishi mumkin
// Masalan: https://sizning-front.vercel.app,https://sizning-domengiz.uz
const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Postman/curl (origin yo'q) ga ruxsat
    if (!origin) return cb(null, true);
    // CLIENT_URL bo'sh bo'lsa — hammasiga ruxsat (sodda deploy uchun)
    if (allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true, name: 'EduMaster MERN API', version: '1.0.0' }));
app.get('/api/health', (req, res) => res.json({ ok: true, db: 'mongo' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/test', require('./routes/test'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edumaster');
  app.listen(PORT, () => console.log(`Backend :${PORT} da ishlayapti`));
})();
