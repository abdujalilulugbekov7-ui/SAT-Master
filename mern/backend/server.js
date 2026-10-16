require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true }));
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
