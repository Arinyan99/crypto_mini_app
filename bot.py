import os
import sqlite3
import datetime

import telebot
from telebot import types

# ========= НАСТРОЙКИ =========

TOKEN = os.getenv("BOT_TOKEN")
if not TOKEN:
    raise ValueError("BOT_TOKEN не найден в переменных окружения")

# тут укажи СВОЁ(И) ID
ADMIN_IDS = [1306116066]  # <-- ЗАМЕНИ на свой Telegram ID, можно список [id1, id2]

# ссылка на mini-app
MINI_APP_URL = "https://crypto-mini-app-59s3.vercel.app"  # <-- ЗАМЕНИ на свою

DB_PATH = "data.db"

bot = telebot.TeleBot(TOKEN, parse_mode="HTML")


# ========= БАЗА ДАННЫХ =========

def db_connect():
    return sqlite3.connect(DB_PATH, check_same_thread=False)


def db_init():
    conn = db_connect()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            is_banned INTEGER DEFAULT 0,
            created_at TEXT,
            last_seen TEXT,
            messages_count INTEGER DEFAULT 0
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT,
            created_at TEXT
        );
        """
    )
    conn.commit()
    conn.close()


def db_add_or_update_user(user):
    conn = db_connect()
    cur = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    cur.execute(
        """
        INSERT INTO users (user_id, username, first_name, last_name, created_at, last_seen, messages_count)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(user_id) DO UPDATE SET
            username=excluded.username,
            first_name=excluded.first_name,
            last_name=excluded.last_name,
            last_seen=excluded.last_seen,
            messages_count = users.messages_count + 1;
        """,
        (
            user.id,
            user.username,
            user.first_name,
            user.last_name,
            now,
            now,
        ),
    )
    conn.commit()
    conn.close()


def db_is_banned(user_id: int) -> bool:
    conn = db_connect()
    cur = conn.cursor()
    cur.execute("SELECT is_banned FROM users WHERE user_id = ?;", (user_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return False
    return bool(row[0])


def db_set_ban(user_id: int, banned: bool):
    conn = db_connect()
    cur = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    cur.execute(
        """
        INSERT INTO users (user_id, created_at, last_seen, is_banned)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            is_banned = excluded.is_banned,
            last_seen = excluded.last_seen;
        """,
        (user_id, now, now, int(banned)),
    )
    conn.commit()
    conn.close()


def db_get_stats():
    conn = db_connect()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users;")
    total = cur.fetchone()[0] or 0
    cur.execute("SELECT COUNT(*) FROM users WHERE is_banned = 1;")
    banned = cur.fetchone()[0] or 0
    conn.close()
    return total, banned


def db_get_last_users(limit: int = 10):
    conn = db_connect()
    cur = conn.cursor()
    cur.execute(
        "SELECT user_id, username, first_name, last_seen, is_banned "
        "FROM users ORDER BY last_seen DESC LIMIT ?;",
        (limit,),
    )
    rows = cur.fetchall()
    conn.close()
    return rows


def db_log_action(user_id: int, action: str):
    conn = db_connect()
    cur = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    cur.execute(
        "INSERT INTO logs (user_id, action, created_at) VALUES (?, ?, ?);",
        (user_id, action, now),
    )
    conn.commit()
    conn.close()


# ========= ВСПОМОГАТЕЛЬНОЕ =========

def is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


def main_menu_keyboard() -> types.ReplyKeyboardMarkup:
    kb = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    kb.add(
        types.KeyboardButton("📊 Открыть mini-app"),
        types.KeyboardButton("🎓 Академия"),
        types.KeyboardButton("📈 Сигналы"),
        types.KeyboardButton("⚙️ Профиль"),
    )
    return kb


def webapp_keyboard() -> types.InlineKeyboardMarkup:
    kb = types.InlineKeyboardMarkup()
    webapp = types.WebAppInfo(url=MINI_APP_URL)
    kb.add(
        types.InlineKeyboardButton(
            text="📱 Открыть mini-app Crypto Signal", web_app=webapp
        )
    )
    return kb


def admin_keyboard() -> types.InlineKeyboardMarkup:
    kb = types.InlineKeyboardMarkup()
    kb.add(
        types.InlineKeyboardButton("👥 Пользователи", callback_data="admin_users"),
        types.InlineKeyboardButton("📊 Статистика", callback_data="admin_stats"),
    )
    kb.add(
        types.InlineKeyboardButton("❓ Помощь по бану", callback_data="admin_ban_help")
    )
    return kb


# ========= ХЕНДЛЕРЫ =========

@bot.message_handler(commands=["start", "menu"])
def cmd_start(message: types.Message):
    user = message.from_user
    db_add_or_update_user(user)
    db_log_action(user.id, "command_start")

    if db_is_banned(user.id):
        bot.send_message(user.id, "⛔ Вы заблокированы в боте.")
        return

    text = (
        "👋 <b>Привет!</b>\n\n"
        "Я <b>Crypto AI Bot</b>.\n\n"
        "Что я умею:\n"
        "• даю базовые уроки по криптовалюте;\n"
        "• помогаю не слить депозит;\n"
        "• позже — сигналы и аналитика через мини-апку.\n\n"
        "Нажми кнопку ниже, чтобы открыть мини-апку,\n"
        "или выбери раздел на клавиатуре 👇"
    )

    bot.send_message(
        user.id,
        text,
        reply_markup=main_menu_keyboard(),
    )
    bot.send_message(
        user.id,
        "🔹 <b>Открыть mini-app Crypto Signal</b>",
        reply_markup=webapp_keyboard(),
    )


@bot.message_handler(commands=["help"])
def cmd_help(message: types.Message):
    user = message.from_user
    db_add_or_update_user(user)
    if db_is_banned(user.id):
        bot.send_message(user.id, "⛔ Вы заблокированы в боте.")
        return

    text = (
        "❓ <b>Помощь</b>\n\n"
        "/start, /menu — главное меню\n"
        "/lesson_basic — что такое криптовалюта\n"
        "/lesson_risk — риски и как не слить депозит\n"
        "/lesson_wallets — биржи и кошельки\n"
    )
    bot.send_message(user.id, text, reply_markup=main_menu_keyboard())


@bot.message_handler(commands=["lesson_basic"])
def lesson_basic(message: types.Message):
    user = message.from_user
    db_add_or_update_user(user)
    if db_is_banned(user.id):
        bot.send_message(user.id, "⛔ Вы заблокированы в боте.")
        return

    text = (
        "📘 <b>Урок 1: Что такое криптовалюта</b>\n\n"
        "Криптовалюта — цифровые деньги в сети.\n"
        "Главное:\n"
        "• нет банка-посредника;\n"
        "• переводы напрямую между людьми;\n"
        "• всё пишется в блокчейн.\n"
    )
    bot.send_message(user.id, text, reply_markup=main_menu_keyboard())


@bot.message_handler(commands=["lesson_risk"])
def lesson_risk(message: types.Message):
    user = message.from_user
    db_add_or_update_user(user)
    if db_is_banned(user.id):
        bot.send_message(user.id, "⛔ Вы заблокированы в боте.")
        return

    text = (
        "⚠️ <b>Урок 2: Риски</b>\n\n"
        "1) Не заходи all-in.\n"
        "2) Всегда ставь стоп-лосс.\n"
        "3) Не торгуй на эмоциях.\n"
        "4) Используй только свободные деньги.\n"
    )
    bot.send_message(user.id, text, reply_markup=main_menu_keyboard())


@bot.message_handler(commands=["lesson_wallets"])
def lesson_wallets(message: types.Message):
    user = message.from_user
    db_add_or_update_user(user)
    if db_is_banned(user.id):
        bot.send_message(user.id, "⛔ Вы заблокированы в боте.")
        return

    text = (
        "👛 <b>Урок 3: Биржи и кошельки</b>\n\n"
        "• Биржа — торговля криптой.\n"
        "• Кошелёк — хранение монет.\n"
        "Главное: Not your keys — not your coins.\n"
    )
    bot.send_message(user.id, text, reply_markup=main_menu_keyboard())


# ========= АДМИН-КОМАНДЫ =========

@bot.message_handler(commands=["admin"])
def cmd_admin(message: types.Message):
    user = message.from_user
    if not is_admin(user.id):
        return

    total, banned = db_get_stats()
    text = (
        "🛠 <b>Админ-панель</b>\n\n"
        f"Всего пользователей: <b>{total}</b>\n"
        f"Забанено: <b>{banned}</b>\n\n"
        "Команды:\n"
        "/ban user_id — забанить\n"
        "/unban user_id — разбанить\n"
    )
    bot.send_message(user.id, text, reply_markup=admin_keyboard())


@bot.message_handler(commands=["ban"])
def cmd_ban(message: types.Message):
    user = message.from_user
    if not is_admin(user.id):
        return

    parts = message.text.split()
    if len(parts) != 2 or not parts[1].isdigit():
        bot.send_message(user.id, "Использование: <code>/ban user_id</code>")
        return

    target_id = int(parts[1])
    if target_id in ADMIN_IDS:
        bot.send_message(user.id, "Нельзя банить админа 😎")
        return

    db_set_ban(target_id, True)
    db_log_action(user.id, f"ban {target_id}")
    bot.send_message(user.id, f"✅ Пользователь <code>{target_id}</code> забанен.")


@bot.message_handler(commands=["unban"])
def cmd_unban(message: types.Message):
    user = message.from_user
    if not is_admin(user.id):
        return

    parts = message.text.split()
    if len(parts) != 2 or not parts[1].isdigit():
        bot.send_message(user.id, "Использование: <code>/unban user_id</code>")
        return

    target_id = int(parts[1])
    db_set_ban(target_id, False)
    db_log_action(user.id, f"unban {target_id}")
    bot.send_message(user.id, f"♻️ Пользователь <code>{target_id}</code> разбанен.")


@bot.callback_query_handler(func=lambda c: c.data.startswith("admin_"))
def admin_callbacks(call: types.CallbackQuery):
    user_id = call.from_user.id
    if not is_admin(user_id):
        bot.answer_callback_query(call.id, "Нет доступа")
        return

    if call.data == "admin_stats":
        total, banned = db_get_stats()
        bot.answer_callback_query(call.id)
        bot.send_message(
            user_id,
            f"📊 Статистика:\n"
            f"Всего пользователей: <b>{total}</b>\n"
            f"Забанено: <b>{banned}</b>",
        )

    elif call.data == "admin_users":
        users = db_get_last_users()
        if not users:
            bot.send_message(user_id, "Пока нет пользователей.")
        else:
            lines = ["👥 <b>Последние пользователи:</b>"]
            for u_id, username, first_name, last_seen, is_banned in users:
                name = first_name or ""
                uname = f"@{username}" if username else ""
                status = "⛔" if is_banned else "✅"
                lines.append(f"{status} <code>{u_id}</code> {uname} {name}")
            bot.send_message(user_id, "\n".join(lines))

    elif call.data == "admin_ban_help":
        bot.answer_callback_query(call.id)
        bot.send_message(
            user_id,
            "❓ Бан / разбан:\n"
            "/ban user_id — забанить пользователя в боте\n"
            "/unban user_id — снять бан\n\n"
            "user_id можно взять из /admin → Пользователи.",
        )


# ========= ОБРАБОТКА ВСЕХ СООБЩЕНИЙ =========

@bot.message_handler(func=lambda m: True)
def handle_all(message: types.Message):
    user = message.from_user
    db_add_or_update_user(user)

    if db_is_banned(user.id):
        # не отвечаем, или можем отправить одно сообщение
        return

    text = message.text.strip()

    if text == "📊 Открыть mini-app":
        bot.send_message(
            user.id,
            "Открываю мини-апку 👇",
            reply_markup=webapp_keyboard(),
        )

    elif text == "🎓 Академия":
        bot.send_message(
            user.id,
            "🎓 Академия:\n"
            "/lesson_basic — что такое криптовалюта\n"
            "/lesson_risk — риски\n"
            "/lesson_wallets — биржи и кошельки",
            reply_markup=main_menu_keyboard(),
        )

    elif text == "📈 Сигналы":
        bot.send_message(
            user.id,
            "📈 Раздел сигналов ещё в разработке.\n"
            "Позже здесь будут реальные сигналы и аналитика.",
            reply_markup=main_menu_keyboard(),
        )

    elif text == "⚙️ Профиль":
        bot.send_message(
            user.id,
            f"⚙️ Профиль:\n\n"
            f"ID: <code>{user.id}</code>\n"
            f"Ник: @{user.username if user.username else 'нема'}",
            reply_markup=main_menu_keyboard(),
        )

    else:
        bot.send_message(
            user.id,
            "Не понимаю, выбери команду из меню или нажми кнопку 👇",
            reply_markup=main_menu_keyboard(),
        )


# ========= ЗАПУСК =========

if __name__ == "__main__":
    db_init()
    print("Bot with admin panel is running...")
    bot.infinity_polling()
