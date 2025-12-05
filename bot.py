import os
import sqlite3
import datetime
import threading
import time
import requests

import telebot
from telebot import types

# ========= НАСТРОЙКИ =========

# Токен бота (из GitHub Secrets / переменных окружения)
TOKEN = os.getenv("BOT_TOKEN")
if not TOKEN:
    raise ValueError("BOT_TOKEN не найден в переменных окружения")

# ID админов (узнать через @userinfobot / @getmyid_bot)
ADMIN_IDS = [1306116066]  # <-- ЗАМЕНИ на свой Telegram ID (можно список)

# Ссылка на твою mini-app (Vercel / Netlify / Render и т.п.)
MINI_APP_URL = "https://crypto-mini-app-59s3.vercel.app/"  # <-- ЗАМЕНИ

# Токен Crypto Pay API (из @CryptoBot → Crypto Pay)
CRYPTO_PAY_TOKEN = os.getenv("CRYPTO_PAY_TOKEN")
if not CRYPTO_PAY_TOKEN:
    raise ValueError("CRYPTO_PAY_TOKEN не найден (добавь в Secrets GitHub)")

CRYPTO_PAY_API_URL = "https://pay.crypt.bot/api"
CRYPTO_ASSET = "USDT"  # можно "TON", "BTC" и т.д.

# Конфиг тарифов: цены и длительность подписки
# amount — в единицах CRYPTO_ASSET (например, 5 USDT)
PLAN_CONFIG = {
    "lite": {
        "title": "🥉 Подписка LITE (30 дней)",
        "description": "1–2 простых сигнала в день, без перегруза и воды.",
        "amount": 1.0,   # 5 USDT
        "days": 30,
    },
    "pro": {
        "title": "🥈 Подписка PRO (30 дней)",
        "description": "3–5 сигналов в день + приоритетные входы и разборы.",
        "amount": 3.0,   # 9 USDT
        "days": 30,
    },
    "max": {
        "title": "🥇 Подписка MAX (30 дней)",
        "description": "Все сигналы + персональний разбор раз в неделю.",
        "amount": 5.0,  # 15 USDT
        "days": 30,
    },
}

DB_PATH = "data.db"

bot = telebot.TeleBot(TOKEN, parse_mode="HTML")


# ========= БАЗА ДАННЫХ =========

def db_connect():
    return sqlite3.connect(DB_PATH, check_same_thread=False)


def db_init():
    conn = db_connect()
    cur = conn.cursor()

    # Пользователи
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
            messages_count INTEGER DEFAULT 0,
            sub_plan TEXT,
            sub_until TEXT
        );
        """
    )

    # Логи действий
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

    # Инвойсы от Crypto Bot
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS invoices (
            invoice_id TEXT PRIMARY KEY,
            user_id INTEGER,
            plan TEXT,
            status TEXT,
            created_at TEXT
        );
        """
    )

    conn.commit()
    conn.close()


def db_add_or_update_user(user: types.User):
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
        "SELECT user_id, username, first_name, last_seen, is_banned, sub_plan, sub_until "
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


# ========= ПОДПИСКИ =========

def db_set_subscription(user_id: int, plan: str, days: int):
    """Выдать или продлить подписку."""
    conn = db_connect()
    cur = conn.cursor()
    now = datetime.datetime.utcnow()

    cur.execute("SELECT sub_until FROM users WHERE user_id = ?;", (user_id,))
    row = cur.fetchone()
    if row and row[0]:
        try:
            current_until = datetime.datetime.fromisoformat(row[0])
        except ValueError:
            current_until = now
        if current_until < now:
            current_until = now
    else:
        current_until = now

    new_until = current_until + datetime.timedelta(days=days)
    cur.execute(
        """
        INSERT INTO users (user_id, sub_plan, sub_until, created_at, last_seen)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            sub_plan = excluded.sub_plan,
            sub_until = excluded.sub_until,
            last_seen = excluded.last_seen;
        """,
        (user_id, plan, new_until.isoformat(), now.isoformat(), now.isoformat()),
    )
    conn.commit()
    conn.close()


def db_get_subscription(user_id: int):
    conn = db_connect()
    cur = conn.cursor()
    cur.execute("SELECT sub_plan, sub_until FROM users WHERE user_id = ?;", (user_id,))
    row = cur.fetchone()
    conn.close()
    if not row or not row[0] or not row[1]:
        return None, None, False

    plan, until_str = row
    try:
        until = datetime.datetime.fromisoformat(until_str)
    except ValueError:
        return plan, None, False

    now = datetime.datetime.utcnow()
    active = until > now
    return plan, until, active


# ========= CRYPTO BOT (Crypto Pay API) =========

def crypto_create_invoice(user_id: int, plan_code: str) -> str:
    """
    Создаём invoice через Crypto Bot и возвращаем ссылку на оплату.
    """
    cfg = PLAN_CONFIG[plan_code]
    amount = cfg["amount"]  # в USDT / TON / BTC

    headers = {"Crypto-Pay-API-Token": CRYPTO_PAY_TOKEN}
    payload = {
        "asset": CRYPTO_ASSET,  # USDT / TON / BTC
        "amount": str(amount),
        "description": f"Подписка {plan_code.upper()} для {user_id}",
        "hidden_message": "Спасибо за оплату! Подписка активируется автоматически 🤝",
        "expires_in": 3600,  # 1 час
    }

    resp = requests.post(
        f"{CRYPTO_PAY_API_URL}/createInvoice",
        headers=headers,
        json=payload,
        timeout=10,
    )
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"CryptoBot error: {data}")

    invoice = data["result"]
    invoice_id = invoice["invoice_id"]
    pay_url = invoice["pay_url"]

    # сохраняем инвойс
    conn = db_connect()
    cur = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    cur.execute(
        """
        INSERT INTO invoices (invoice_id, user_id, plan, status, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (invoice_id, user_id, plan_code, "active", now),
    )
    conn.commit()
    conn.close()

    return pay_url


def crypto_check_invoices():
    """
    Периодически проверяет активные инвойсы в Crypto Bot.
    Для оплаченных — автоматически выдаёт подписку.
    """
    headers = {"Crypto-Pay-API-Token": CRYPTO_PAY_TOKEN}

    conn = db_connect()
    cur = conn.cursor()
    cur.execute("SELECT invoice_id, user_id, plan FROM invoices WHERE status = 'active';")
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return

    invoice_ids = [r[0] for r in rows]

    resp = requests.get(
        f"{CRYPTO_PAY_API_URL}/getInvoices",
        headers=headers,
        params={"invoice_ids": ",".join(invoice_ids)},
        timeout=10,
    )
    data = resp.json()
    if not data.get("ok"):
        return

    result = data.get("result", {})
    items = result.get("items") if isinstance(result, dict) else result
    if not items:
        return

    for inv in items:
        inv_id = inv["invoice_id"]
        status = inv["status"]  # active, paid, expired, ...
        if status != "paid":
            continue

        # достаём данные из нашей БД
        conn = db_connect()
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, plan FROM invoices WHERE invoice_id = ? AND status = 'active';",
            (inv_id,),
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            continue

        user_id, plan_code = row

        # помечаем инвойс оплаченным
        cur.execute(
            "UPDATE invoices SET status = 'paid' WHERE invoice_id = ?;",
            (inv_id,),
        )
        conn.commit()
        conn.close()

        cfg = PLAN_CONFIG.get(plan_code)
        if not cfg:
            continue

        days = cfg["days"]
        db_set_subscription(user_id, plan_code, days)
        db_log_action(user_id, f"crypto_paid_{plan_code}_{days}")

        # сообщение пользователю
        try:
            bot.send_message(
                user_id,
                f"🎉 Оплата через Crypto Bot прошла успешно!\n\n"
                f"Твоя подписка <b>{plan_code.upper()}</b> активирована на <b>{days}</b> дн.\n"
                f"Заходи в «📈 Сигналы» — доступ открыт.",
                reply_markup=types.ReplyKeyboardRemove(),
            )
            bot.send_message(
                user_id,
                "Открываю меню 👇",
                reply_markup=main_menu_keyboard(),
            )
        except Exception:
            pass

        # сообщение админам
        for admin_id in ADMIN_IDS:
            try:
                bot.send_message(
                    admin_id,
                    f"✅ Пользователь <code>{user_id}</code> оплатил тариф "
                    f"{plan_code.upper()} через Crypto Bot.",
                )
            except Exception:
                pass


# ========= ВСПОМОГАТЕЛЬНОЕ =========

def is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


def main_menu_keyboard() -> types.ReplyKeyboardMarkup:
    kb = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    kb.add(
        types.KeyboardButton("📊 Открыть mini-app"),
        types.KeyboardButton("🎓 Академия"),
        types.KeyboardButton("📈 Сигналы"),
        types.KeyboardButton("💳 Подписка"),
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
        types.InlineKeyboardButton("❓ Бан / подписка", callback_data="admin_help")
    )
    return kb


def subscribe_keyboard() -> types.InlineKeyboardMarkup:
    kb = types.InlineKeyboardMarkup()
    kb.add(
        types.InlineKeyboardButton("🥉 Lite", callback_data="sub_lite"),
        types.InlineKeyboardButton("🥈 Pro", callback_data="sub_pro"),
        types.InlineKeyboardButton("🥇 Max", callback_data="sub_max"),
    )
    return kb


# ========= КОМАНДЫ ПОЛЬЗОВАТЕЛЕЙ =========

@bot.message_handler(commands=["start", "menu"])
def cmd_start(message: types.Message):
    user = message.from_user
    db_add_or_update_user(user)
    db_log_action(user.id, "command_start")

    if db_is_banned(user.id):
        bot.send_message(user.id, "⛔ Вы заблокированы в боте.")
        return

    plan, until, active = db_get_subscription(user.id)
    if active:
        left_days = (until.date() - datetime.datetime.utcnow().date()).days
        sub_text = (
            f"🔐 Твоя подписка: <b>{plan.upper()}</b> до <b>{until.date()}</b> "
            f"(ещё {left_days} дн.)\n\n"
        )
    else:
        sub_text = (
            "🔓 Сейчас у тебя нет активной подписки.\n"
            "Сигналы доступны только по подписке 💳\n\n"
        )

    text = (
        "👋 <b>Привет!</b>\n\n"
        "Я <b>Crypto AI Bot</b>.\n\n"
        f"{sub_text}"
        "Что ты получишь с подпиской:\n"
        "• понятные сигналы без лишнего шума;\n"
        "• уровни входа/выхода и стопы;\n"
        "• базовые уроки по крипте.\n\n"
        "Нажми кнопку ниже, чтобы открыть mini-app,\n"
        "или выбери раздел на клавиатуре 👇"
    )

    bot.send_message(user.id, text, reply_markup=main_menu_keyboard())
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
        "/subscribe — тарифы и подписка\n"
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
        return
    text = (
        "📘 <b>Урок 1: Что такое криптовалюта</b>\n\n"
        "Криптовалюта — это цифровые деньги в сети, без банка посредника.\n"
        "Все транзакции записываются в блокчейн.\n"
        "Первая и самая известная монета — <b>Bitcoin</b>."
    )
    bot.send_message(user.id, text, reply_markup=main_menu_keyboard())


@bot.message_handler(commands=["lesson_risk"])
def lesson_risk(message: types.Message):
    user = message.from_user
    db_add_or_update_user(user)
    if db_is_banned(user.id):
        return
    text = (
        "⚠️ <b>Урок 2: Риски</b>\n\n"
        "1) Не заходи all-in в одну монету.\n"
        "2) Всегда ставь стоп-лосс.\n"
        "3) Не торгуй на эмоциях (страх/жадность).\n"
        "4) Используй только свободные деньги.\n"
    )
    bot.send_message(user.id, text, reply_markup=main_menu_keyboard())


@bot.message_handler(commands=["lesson_wallets"])
def lesson_wallets(message: types.Message):
    user = message.from_user
    db_add_or_update_user(user)
    if db_is_banned(user.id):
        return
    text = (
        "👛 <b>Урок 3: Биржи и кошельки</b>\n\n"
        "• Биржа — место, где ты покупаешь/продаёшь крипту.\n"
        "• Кошелёк — место, где ты хранишь монеты.\n\n"
        "Главное правило: <b>Not your keys — not your coins.</b>\n"
        "Если у тебя нет своих сид-фраз — монеты по сути не твои."
    )
    bot.send_message(user.id, text, reply_markup=main_menu_keyboard())


@bot.message_handler(commands=["subscribe"])
def cmd_subscribe(message: types.Message):
    user = message.from_user
    if db_is_banned(user.id):
        bot.send_message(user.id, "⛔ Вы заблокированы в боте.")
        return
    show_subscribe_menu(user.id)


def show_subscribe_menu(user_id: int):
    plan, until, active = db_get_subscription(user_id)
    if active:
        left_days = (until.date() - datetime.datetime.utcnow().date()).days
        status = (
            f"🔐 <b>Твоя подписка активна</b>\n"
            f"Тариф: <b>{plan.upper()}</b>\n"
            f"До: <b>{until.date()}</b> (ещё {left_days} дн.)\n\n"
        )
    else:
        status = "🔓 У тебя нет активной подписки.\n\n"

    text = (
        status
        + "🔥 <b>Тарифы:</b>\n"
        f"🥉 LITE — {PLAN_CONFIG['lite']['amount']} {CRYPTO_ASSET} / 30 дней\n"
        f"🥈 PRO — {PLAN_CONFIG['pro']['amount']} {CRYPTO_ASSET} / 30 дней\n"
        f"🥇 MAX — {PLAN_CONFIG['max']['amount']} {CRYPTO_ASSET} / 30 дней\n\n"
        "Выбери тариф ниже, я сгенерирую тебе ссылку на оплату через Crypto Bot 👇"
    )

    bot.send_message(user_id, text, reply_markup=subscribe_keyboard())


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
        "/sub user_id plan days — выдать подписку вручную\n"
        "   (plan: lite / pro / max)\n"
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


@bot.message_handler(commands=["sub"])
def cmd_sub(message: types.Message):
    """Выдать подписку вручную: /sub user_id plan days"""
    user = message.from_user
    if not is_admin(user.id):
        return
    parts = message.text.split()
    if len(parts) != 4 or not parts[1].isdigit() or not parts[3].isdigit():
        bot.send_message(
            user.id,
            "Использование: <code>/sub user_id plan days</code>\n"
            "Например: <code>/sub 123456789 pro 30</code>",
        )
        return

    target_id = int(parts[1])
    plan = parts[2].lower()
    days = int(parts[3])
    if plan not in ("lite", "pro", "max"):
        bot.send_message(user.id, "План должен быть: lite / pro / max")
        return

    db_set_subscription(target_id, plan, days)
    db_log_action(user.id, f"sub_manual {target_id} {plan} {days}")
    bot.send_message(
        user.id,
        f"✅ Подписка <b>{plan}</b> на <b>{days}</b> дн. выдана пользователю "
        f"<code>{target_id}</code>.",
    )
    try:
        bot.send_message(
            target_id,
            f"🎉 Твоя подписка <b>{plan.upper()}</b> активирована на {days} дн.\n"
            "Заходи в «📈 Сигналы»!",
            reply_markup=main_menu_keyboard(),
        )
    except Exception:
        pass


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
            for u_id, username, first_name, last_seen, is_banned, plan, until in users:
                name = first_name or ""
                uname = f"@{username}" if username else ""
                status = "⛔" if is_banned else "✅"
                sub = ""
                if plan and until:
                    sub = f" | {plan.upper()} до {until[:10]}"
                lines.append(f"{status} <code>{u_id}</code> {uname} {name}{sub}")
            bot.send_message(user_id, "\n".join(lines))

    elif call.data == "admin_help":
        bot.answer_callback_query(call.id)
        bot.send_message(
            user_id,
            "❓ Бан / подписка:\n"
            "/ban user_id — заблокировать\n"
            "/unban user_id — разбанить\n"
            "/sub user_id plan days — выдать подписку вручную\n"
            "Например: <code>/sub 123456789 pro 30</code>",
        )


# ========= CALLBACK ПОДПИСОК (Crypto Bot) =========

@bot.callback_query_handler(func=lambda c: c.data.startswith("sub_"))
def subscribe_callbacks(call: types.CallbackQuery):
    user_id = call.from_user.id

    if db_is_banned(user_id):
        bot.answer_callback_query(call.id, "Вы заблокированы.")
        return

    plan_code = call.data.split("_", 1)[1]  # lite / pro / max

    if plan_code not in PLAN_CONFIG:
        bot.answer_callback_query(call.id, "Неверный тариф.")
        return

    cfg = PLAN_CONFIG[plan_code]
    amount = cfg["amount"]

    bot.answer_callback_query(call.id)

    try:
        pay_url = crypto_create_invoice(user_id, plan_code)
    except Exception as e:
        bot.send_message(user_id, f"❌ Ошибка при создании счета: {e}")
        return

    bot.send_message(
        user_id,
        f"{cfg['title']}\n\n"
        f"Сумма к оплате: <b>{amount} {CRYPTO_ASSET}</b>\n\n"
        "Оплатить можно через Crypto Bot по ссылке ниже 👇",
        reply_markup=types.InlineKeyboardMarkup().add(
            types.InlineKeyboardButton("💳 Оплатить через Crypto Bot", url=pay_url)
        ),
    )

    for admin_id in ADMIN_IDS:
        try:
            bot.send_message(
                admin_id,
                f"🆕 Пользователь <code>{user_id}</code> "
                f"(@{call.from_user.username}) открыл оплату тарифа {plan_code.upper()} через Crypto Bot.",
            )
        except Exception:
            pass


# ========= ОБРАБОТКА ВСЕХ СООБЩЕНИЙ =========

@bot.message_handler(func=lambda m: True)
def handle_all(message: types.Message):
    user = message.from_user
    db_add_or_update_user(user)

    if db_is_banned(user.id):
        return

    text = (message.text or "").strip()

    if text == "📊 Открыть mini-app":
        bot.send_message(
            user.id,
            "Открываю mini-app 👇",
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

    elif text == "💳 Подписка":
        show_subscribe_menu(user.id)

    elif text == "📈 Сигналы":
        plan, until, active = db_get_subscription(user.id)
        if not active:
            bot.send_message(
                user.id,
                "⛔ <b>Сигналы доступны только по подписке.</b>\n\n"
                "Что ты получишь:\n"
                "• понятные входы/выходы\n"
                "• уровни, стопы и тейки\n"
                "• без лишнего спама и «воды».\n\n"
                "Оформи подписку, чтобы не пропускать движения рынка 🔥",
                reply_markup=subscribe_keyboard(),
            )
        else:
            bot.send_message(
                user.id,
                f"📈 Твоя подписка активна до <b>{until.date()}</b>.\n"
                "Тут будут актуальные сигналы (пока заглушка).",
                reply_markup=main_menu_keyboard(),
            )

    elif text == "⚙️ Профиль":
        plan, until, active = db_get_subscription(user.id)
        if active:
            sub_line = f"Подписка: <b>{plan.upper()}</b> до <b>{until.date()}</b>"
        else:
            sub_line = "Подписка: <b>нет</b>"

        bot.send_message(
            user.id,
            f"⚙️ Профиль:\n\n"
            f"ID: <code>{user.id}</code>\n"
            f"Ник: @{user.username if user.username else 'нет'}\n"
            f"{sub_line}",
            reply_markup=main_menu_keyboard(),
        )

    else:
        bot.send_message(
            user.id,
            "Не понимаю, выбери команду из меню или нажми кнопку 👇",
            reply_markup=main_menu_keyboard(),
        )


# ========= ВОРКЕР ПРОВЕРКИ ОПЛАТ =========

def invoices_worker():
    while True:
        try:
            crypto_check_invoices()
        except Exception as e:
            print("Invoice check error:", e)
        time.sleep(60)  # проверка раз в минуту


# ========= ЗАПУСК =========

if __name__ == "__main__":
    db_init()
    threading.Thread(target=invoices_worker, daemon=True).start()
    print("Bot with CryptoBot payments, subscriptions & admin panel is running...")
    bot.infinity_polling()
