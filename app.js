// Инициализация Telegram WebApp
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) {
  tg.expand();
  tg.setBackgroundColor("#050714");
}

const userPill = document.getElementById("user-pill");

// Показать имя пользователя, если Telegram его передал
if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
  const u = tg.initDataUnsafe.user;
  userPill.textContent = `👤 ${[u.first_name, u.last_name].filter(Boolean).join(" ")}` || "👤 Пользователь";
}

// --- Навигация между вкладками ---

const navTabs = document.querySelectorAll(".nav-tab");
const panels = {
  overview: document.getElementById("tab-overview"),
  signals: document.getElementById("tab-signals"),
  academy: document.getElementById("tab-academy"),
  tools: document.getElementById("tab-tools"),
};

navTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    navTabs.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;
    Object.entries(panels).forEach(([key, panel]) => {
      panel.classList.toggle("active", key === tab);
    });
  });
});

// --- Подписки (пока пример через localStorage, можно подтянуть из бота позже) ---

const signalsList = document.getElementById("signals-list");
const overviewSubs = document.getElementById("overview-subs");
const overviewLastSignal = document.getElementById("overview-last-signal");
const overviewThreshold = document.getElementById("overview-threshold");

// Для демонстрации: используем localStorage
// Ты можешь сделать так, чтобы бот при открытии мини-апки пробрасывал список через initData или API.
const demoSubs = JSON.parse(localStorage.getItem("crypto_subs") || "[]");

// Если нет сохранённых — покажем пример
let subs = demoSubs;
if (!subs || subs.length === 0) {
  subs = ["BTCUSDT", "ETHUSDT"];
}

signalsList.innerHTML = subs.map((s) => `<li>• ${s}</li>`).join("");
overviewSubs.textContent = subs.length.toString();

// Пример последних данных
overviewLastSignal.textContent = "BTCUSDT • HOLD";
overviewThreshold.textContent = "глобальный (из бота)";

// --- Академия: уроки для новичков ---

const lessonsData = [
  {
    id: "basic",
    title: "1. Что такое криптовалюта простыми словами",
    text:
      "Криптовалюта — это цифровые деньги, которые существуют только в интернете и хранятся в блокчейне. " +
      "Блокчейн — это большая база данных, которую никто не контролирует в одиночку. Ты можешь переводить деньги " +
      "напрямую другому человеку, без банка.\n\n" +
      "Главное, что нужно понимать новичку: цена может сильно меняться, поэтому входи маленькими суммами и учись управлять риском.",
  },
  {
    id: "risk",
    title: "2. Риски и как не потерять депозит",
    text:
      "Крипта может давать большую прибыль, но и большие просадки. Новички чаще всего теряют деньги, потому что:\n\n" +
      "• заходят на все деньги в одну монету;\n" +
      "• не используют стоп-лосс;\n" +
      "• верят обещаниям «гарантированного дохода».\n\n" +
      "Правила выживания:\n" +
      "1) Не инвестируй последние деньги и кредиты.\n" +
      "2) Диверсифицируй портфель.\n" +
      "3) Решай сам — ни один сигнал не даёт 100% гарантии.",
  },
  {
    id: "wallets",
    title: "3. Биржи и кошельки",
    text:
      "Биржа (Binance, OKX и др.) — это площадка, где ты покупаешь/продаёшь крипту. " +
      "Кошелёк (MetaMask, Trust Wallet) — это место, где ты хранишь свои ключи.\n\n" +
      "Если у тебя крупная сумма:\n" +
      "• держи большую часть на кошельке,\n" +
      "• используй холодные кошельки для долгосрока,\n" +
      "• всегда делай резервную копию seed-фразы.",
  },
  {
    id: "signals",
    title: "4. Как использовать сигналы бота",
    text:
      "Сигналы бота — это подсказки, а не приказы. Алгоритм для новичка:\n\n" +
      "1) Пришёл сигнал — открой график монеты.\n" +
      "2) Посмотри, куда уже ходила цена, не было ли резкого пампа.\n" +
      "3) Подумай: устраивает ли тебя риск и объём позиции.\n" +
      "4) Если входишь — заранее ставь стоп-лосс и тейк-профит.\n\n" +
      "Так ты учишься думать, а не слепо следовать сигналам.",
  },
];

const lessonsListEl = document.getElementById("lessons-list");
const lessonView = document.getElementById("lesson-view");
const lessonTitle = document.getElementById("lesson-title");
const lessonText = document.getElementById("lesson-text");

lessonsData.forEach((lesson) => {
  const item = document.createElement("div");
  item.className = "lesson-item";
  item.textContent = lesson.title;
  item.addEventListener("click", () => {
    lessonTitle.textContent = lesson.title;
    lessonText.textContent = lesson.text;
    lessonView.style.display = "block";
  });
  lessonsListEl.appendChild(item);
});

// --- Калькулятор позиции ---

const balanceInput = document.getElementById("balance");
const riskInput = document.getElementById("risk");
const stopInput = document.getElementById("stop");
const calcBtn = document.getElementById("calc-btn");
const calcResult = document.getElementById("calc-result");

calcBtn.addEventListener("click", () => {
  const balance = parseFloat(balanceInput.value);
  const risk = parseFloat(riskInput.value);
  const stop = parseFloat(stopInput.value);

  if (!balance || !risk || !stop || balance <= 0 || risk <= 0 || stop <= 0) {
    calcResult.textContent = "Заполни все поля корректно.";
    return;
  }

  const riskAmount = balance * (risk / 100);
  const positionSize = riskAmount / (stop / 100);

  calcResult.textContent =
    `Максимальный размер позиции ~ ${positionSize.toFixed(2)} USDT при риске ` +
    `${risk.toFixed(2)}% и стоп-лоссе ${stop.toFixed(2)}%.`;
});

// --- DCA калькулятор ---

const dcaPrice1 = document.getElementById("dca-price1");
const dcaPrice2 = document.getElementById("dca-price2");
const dcaAmount = document.getElementById("dca-amount");
const dcaBtn = document.getElementById("dca-btn");
const dcaResult = document.getElementById("dca-result");

dcaBtn.addEventListener("click", () => {
  const p1 = parseFloat(dcaPrice1.value);
  const p2 = parseFloat(dcaPrice2.value);
  const amount = parseFloat(dcaAmount.value);

  if (!p1 || !p2 || !amount || p1 <= 0 || p2 <= 0 || amount <= 0) {
    dcaResult.textContent = "Введи две цены и одинаковый объём покупок.";
    return;
  }

  const coins1 = amount / p1;
  const coins2 = amount / p2;
  const totalCoins = coins1 + coins2;
  const totalSpent = amount * 2;
  const avgPrice = totalSpent / totalCoins;

  dcaResult.textContent =
    `Средняя цена входа ≈ ${avgPrice.toFixed(2)}. Чем больше аккуратных входов по тренду, ` +
    "тем ниже средняя и тем спокойнее психика 🙂.";
});
