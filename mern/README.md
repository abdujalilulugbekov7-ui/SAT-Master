# EduMaster — MERN versiya

`index.html` dagi bitta faylli loyiha to'liq MERN ga ko'chirildi.

## Tuzilma

```
mern/
  backend/   — Express + Mongoose + JWT
    server.js
    config/db.js
    models/User.js, Result.js, Visit.js
    routes/auth.js, test.js, admin.js, ai.js
    middleware/auth.js
  frontend/  — React + Vite (barcha ekranlar: Auth, SAT, IELTS, Calc, AI, Daily, Rating, Profile, Plans, Admin)
```

## Ko'chirilgan funksiyalar (hammasi)

- Auth: ism + +998 telefon + 4 xonali shaxsiy kod (yangi user ga ichida beriladi, eskidan so'raladi). Admin: saloh / 913333333
- SAT: 30 EN + 30 Math, 60:00 timer, 5:00 tanaffus, o'tkazib yuborish, 1600 ballik tizim
- IELTS: Reading 10 + Listening 10 + Writing 2 (so'z sanash) + Speaking 5, oraliqda 5 daq tanaffus, Band 0-9
- Kalkulyator: sin/cos/tan/log/ln/sqrt/faktorial/daraja, DEG/RAD, tarix
- AI yordamchi: endi `/api/ai` da ishlaydi (tenglama, foiz, arifmetika, lug'at, strategiyalar)
- Yurak/Plan/Daily/Rating/Profile: FREE 3, PRO 5, MAX 10, ULTRA cheksiz. Kunlik 10 savol, xatoga -1 yurak, 5 daqiqada to'ladi. XP + streak + reyting MongoDB da
- To'lov: P2P mock (8600...), 16 raqam tekshiriladi
- Admin: users/tests/SAT/IELTS soni + jadvallar (MongoDB dan)
- Natija/Visit tarixi MongoDB da saqlanadi

## Ishga tushirish

1. MongoDB ni yoqing (local yoki Atlas).
2. Backend:
```bash
cd mern/backend
cp .env.example .env   # MONGO_URI ni to'g'rilang
npm install
npm run dev            # :5000
```
3. Frontend:
```bash
cd mern/frontend
npm install
npm run dev            # :5173 (vite proxy /api -> :5000)
```

`CLIENT_URL` va proxy allaqachon sozlangan. Eski `index.html` o'chirilgani yo'q — zaxira sifatida turibdi.
