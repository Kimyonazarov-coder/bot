const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const sqlite3 = require("sqlite3").verbose();
const dotenv = require("dotenv");
const axios = require("axios"); // 👈 fetch o‘rniga axios

dotenv.config();

const app = express();
const botToken = process.env.BOT_TOKEN;
const port = process.env.PORT || 3000;

const bot = new TelegramBot(botToken, { polling: false });
bot.setWebHook(`https://bot-2g3q.onrender.com/bot${botToken}`);

const db = new sqlite3.Database("maktab.db");
const users = {};

app.use(express.json());

app.post(`/bot${botToken}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = { step: "password" };

  bot.sendMessage(chatId, `
👋 Assalomu alaykum, hurmatli O'quvchi va O'qituvchilar!

Siz sinfingiz o'quvchilari uchun mo'ljallangan rasmiy Telegram botdasiz. Bu bot orqali siz quyidagi ishlarni qilishingiz mumkin:

📌 O'zingiz haqidagi quyidagi ma'lumotlarni to'ldirishingiz mumkin:
- Ismingiz
- Familiyangiz
- Otangizning ismi
- Jinsingiz
- Tug'ilgan sanangiz
- Telegram va Instagram username'laringiz
- Telefon raqamingiz

📍 Ushbu ma'lumotlar maxfiy saqlanadi va faqat sinf tizimida foydalaniladi.

🔐 Ma'lumotlarni to'ldirish uchun sizga maxsus parol kerak bo'ladi.  
📌 Parol sizga sinf sardori yoki sinf rahbari tomonidan taqdim etiladi. Har bir o'quvchining paroli faqat o'sha o'quvchiga tegishli.

📣 Botdan foydalanishni boshlash uchun:
1. Parolingizni <a href="https://t.me/m_kimyonazarov">Muhammadxojadan</a> sorang.
2. So'ng, parolni yuboring.
3. Keyin bosqichma-bosqich ma'lumotlaringizni to‘ldirasiz.

‼️ Diqqat: bu bot sinf uchun maxsus tayyorlangan. Do'stlar, tanishlar yoki boshqa odamlar foydalanmasligi kerak.

📚 Sizning axborotlaringiz sinf tizimiga tushadi va ma'muriyat tomonidan ko'rib chiqiladi.
`, { parse_mode: 'HTML' });

  setTimeout(() => {
    bot.sendMessage(chatId, "Iltimos Parolni Kiriting:");
  }, 100);
});

// 🔁 Har 60 soniyada Render'ni uyg‘otish
setInterval(() => {
  axios.get("https://bot-2g3q.onrender.com")
    .then(() => console.log("🔄 Self-ping OK"))
    .catch((err) => console.error("❌ Self-ping error:", err.message));
}, 60 * 1000);

// 🌐 Web sahifa uchun
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Kimyonazarov's Bot</title></head>
    <body style="background:black;color:white;text-align:center;padding:50px">
      <h1>Kimyonazarov's School Bot</h1>
      <p>Maktab uchun tayyorlangan Telegram bot. <br> PR: @m_kimyonazarov</p>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Bot running on port ${port}`);
});
