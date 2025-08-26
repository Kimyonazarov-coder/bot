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

bot.onText(/\/find (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1].trim();
  const [first_name, last_name] = input.split(" ");

  if (!first_name || !last_name) {
    bot.sendMessage(chatId, "❗️ Iltimos, to‘liq ism va familiyangizni kiriting.\n\nMisol: `/find Ali Valiyev`", {
      parse_mode: "Markdown",
    });
    return;
  }

  db.get(
    `SELECT password FROM peoples WHERE first_name = ? AND last_name = ?`,
    [first_name, last_name],
    (err, row) => {
      if (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Qaytadan urinib ko‘ring.");
      } else if (!row) {
        bot.sendMessage(chatId, "⚠️ Ushbu ism va familiya bo‘yicha hech qanday parol topilmadi.");
      } else {
        bot.sendMessage(chatId, `🔐 Sizning parolingiz: *${row.password}*`, {
          parse_mode: "Markdown",
        });
      }
    }
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!users[chatId] || text.startsWith("/")) return;
  const state = users[chatId];

  if (state.step === "password") {
    db.get(
      `SELECT * FROM peoples WHERE password = ?`,
      [text],
      (err, row) => {
        if (err || !row) {
          bot.sendMessage(chatId, "❌ Parol noto'g'ri yoki xatolik yuz berdi.");
          return;
        }

        users[chatId] = {
          step: "confirm_update",
          data: { password: text, row },
        };

        const info = `
📋 Sizning ma'lumotlaringiz:
🔹 Ism: ${row.first_name || "—"}
🔹 Familiya: ${row.last_name || "—"}
🔹 Otasining ismi: ${row.father_name || "—"}
🔹 Jinsi: ${row.sex || "—"}
🔹 Tug'ilgan sana: ${row.brthay || "—"}
🔹 Telegram: ${row.telegram || "—"}
🔹 Instagram: ${row.instagram || "—"}
🔹 Telefon: ${row.tel_number || "—"}`.trim();

        bot.sendMessage(chatId, info + "\n\n🛠 Ma'lumotlarni o'zgartirasizmi?", {
          reply_markup: {
            keyboard: [["Ha", "Yo'q"]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      }
    );
  } else if (state.step === "confirm_update") {
    if (text === "Ha") {
      state.step = "first_name";
      bot.sendMessage(chatId, `Ismingizni kiriting:`);
    } else {
      bot.sendMessage(chatId, "✅ O'zgartirish bekor qilindi.");
      delete users[chatId];
    }
  } else if (state.step === "first_name") {
    state.data.first_name = text === "Yo'q" ? null : text;
    state.step = "last_name";
    bot.sendMessage(chatId, `Familiyangizni kiriting:`);
  } else if (state.step === "last_name") {
    state.data.last_name = text === "Yo'q" ? null : text;
    state.step = "father_name";
    bot.sendMessage(chatId, `Otangizning ismini kiriting:`);
  } else if (state.step === "father_name") {
    state.data.father_name = text === "Yo'q" ? null : text;
    state.step = "sex";
    bot.sendMessage(chatId, `Jinsingizni kiriting (Erkak/Ayol):`);
  } else if (state.step === "sex") {
    state.data.sex = text === "Yo'q" ? null : text;
    state.step = "brthay";
    bot.sendMessage(chatId, `Tug'ilgan sanangizni kiriting (YYYY-MM-DD):`);
  } else if (state.step === "brthay") {
    if (!text.match(/^\d{4}-\d{2}-\d{2}$/)) {
      bot.sendMessage(chatId, "❌ Noto'g'ri format. YYYY-MM-DD tarzida yozing.");
      return;
    }
    state.data.brthay = text === "Yo'q" ? null : text;
    state.step = "telegram";
    bot.sendMessage(chatId, `Telegram username kiriting (@ bilan):`);
  } else if (state.step === "telegram") {
    state.data.telegram = text === "Yo'q" ? null : text;
    state.step = "instagram";
    bot.sendMessage(chatId, `Instagram username kiriting yoki "Yo'q" deb yozing:`);
  } else if (state.step === "instagram") {
    state.data.instagram = text === "Yo'q" ? null : text;
    state.step = "tel_number";
    bot.sendMessage(chatId, `Telefon raqamingizni kiriting (998...):`);
  } else if (state.step === "tel_number") {
    state.data.tel_number = text === "Yo'q" ? null : text;

    const {
      first_name,
      last_name,
      father_name,
      sex,
      brthay,
      telegram,
      instagram,
      tel_number,
      password,
    } = state.data;

    db.run(
      `UPDATE peoples SET 
        first_name = ?, 
        last_name = ?, 
        father_name = ?, 
        sex = ?, 
        brthay = ?, 
        telegram = ?, 
        instagram = ?, 
        tel_number = ? 
      WHERE password = ?`,
      [
        first_name,
        last_name,
        father_name,
        sex,
        brthay,
        telegram,
        instagram,
        tel_number,
        password,
      ],
      function (err) {
        if (err) {
          console.error(err);
          bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Keyinroq urinib ko'ring.");
        } else if (this.changes > 0) {
          bot.sendMessage(chatId, "✅ Ma'lumotlaringiz yangilandi.");
        } else {
          bot.sendMessage(chatId, "⚠️ Ma'lumotlar topilmadi yoki o'zgarmadi.");
        }
      }
    );

    delete users[chatId];
  }
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
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kimyonazarov's Bot</title>
  <!-- ✅ Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white min-h-screen flex flex-col items-center justify-center px-4">

  <h1 class="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-6 text-center">
    Kimyonazarov's School Bot
  </h1>

  <p class="text-lg md:text-xl text-gray-300 mb-8 text-center max-w-2xl leading-relaxed">
    Bu Telegram bot maktab o'quvchilari uchun maxsus ishlab chiqilgan.<br>
    O'quvchilar o'z ma'lumotlarini kiritish orqali sinf tizimida ro'yxatdan o'tishadi.<br>
    Ma'lumotlar xavfsiz saqlanadi.
  </p>

  <a href="https://t.me/m_kimyonazarov" target="_blank"
     class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 ease-in-out shadow-md">
    📲 Admin bilan bog'lanish
  </a>

  <footer class="mt-10 text-sm text-gray-500 absolute bottom-4 text-center">
    &copy; 2025 Kimyonazarov. Barcha huquqlar himoyalangan.
  </footer>

</body>
</html>

  `);
});

app.listen(port, () => {
  console.log(`Bot running on port ${port}`);
});
