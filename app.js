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
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
  userPill.textContent = fullName ? `👤 ${fullName}` : "👤 Пользователь";
}

// ---- Навигация между вкладками ----

const navTabs = document.querySelectorAll(".nav-tab");
const panels = {
  overview: document.getElementById("tab-overview"),
  signals: document.getElementById("tab-signals"),
  academy: document.getElementById("tab-academy"),
  tools: document.getElementById("tab-tools"),
};

function switchTab(tab) {
  navTabs.forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("active", key === tab);
  });
}

navTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchTab(btn.dataset.tab);
  });
});

// ---- Быстрые действия на обзоре ----

document.querySelectorAll(".pill-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "academy") switchTab("academy");
    if (action === "signals") switchTab("signals");
    if (action === "tools") switchTab("tools");
  });
});

// ---- Низ панели ----

document.querySelectorAll(".bottom-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "open-bot") {
      if (tg) {
        tg.openTelegramLink(`https://t.me/${tg.initDataUnsafe?.user?.username || ""}`);
      }
    } else if (action === "open-academy") {
      switchTab("academy");
    } else if (action === "open-risk") {
      switchTab("overview");
      document.getElementById("risk-mode-desc")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
});

// ---- Псевдо-состояние приложения ----

const state = {
  riskMode: localStorage.getItem("riskMode") || "beginner",
  lessonsDone: JSON.parse(localStorage.getItem("lessonsDone") || "[]"),
};

// ---- Режим риска ----

const riskDescriptions = {
  beginner: "Минимальный риск, маленькие объёмы, главное — не слить депозит и научиться выживать.",
  safe: "Осторожная торговля: фиксированные риски на сделку, разумный стоп-лосс и постепенное наращивание объёма.",
  normal: "Сбалансированный подход: принимаешь риск, но считаешь его заранее и не залетаешь во всё подряд.",
};

const riskModeLabel = document.getElementById("risk-mode-label");
const riskModeDesc = document.getElementById("risk-mode-desc");

function renderRiskMode() {
  const mode = state.riskMode;
  riskModeLabel.textContent =
    mode === "beginner" ? "Новичок" : mode === "safe" ? "Осторожный" : "Сбалансированный";
  riskModeDesc.textContent = riskDescriptions[mode] || "";
  document.querySelectorAll(".risk-btn").forEach((btn) => {
    btn.classList.toggle("risk-btn-active", btn.dataset.mode === mode);
  });
}

document.querySelectorAll(".risk-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.riskMode = btn.dataset.mode;
    localStorage.setItem("riskMode", state.riskMode);
    renderRiskMode();
  });
});

renderRiskMode();

// ---- Подписки и статус сигналов (демо) ----

const overviewSubsEl = document.getElementById("overview-subs");
const overviewLastSignalEl = document.getElementById("overview-last-signal");
const overviewThresholdEl = document.getElementById("overview-threshold");

// Демо-подписки (можно потом заменить реальными данными)
let demoSubs = JSON.parse(localStorage.getItem("crypto_subs") || "[]");
if (!demoSubs || demoSubs.length === 0) {
  demoSubs = ["BTCUSDT", "ETHUSDT"];
}

overviewSubsEl.textContent = demoSubs.length.toString();
overviewLastSignalEl.textContent = "BTCUSDT • HOLD";
overviewThresholdEl.textContent = "глобальный (из бота)";

document.getElementById("btn-open-settings").addEventListener("click", () => {
  if (tg) {
    tg.openTelegramLink("https://t.me/" + (tg.initDataUnsafe?.user?.username || ""));
  }
});

// ---- Сигналы – карточки ----

const signalsData = [
  {
    symbol: "BTCUSDT",
    reco: "HOLD",
    direction: "hold",
    change: 0.35,
    comment: "Движение в пределах шума, логично подождать.",
    timeframe: "M15",
  },
  {
    symbol: "ETHUSDT",
    reco: "BUY",
    direction: "buy",
    change: 1.8,
    comment: "Есть пробой локального уровня, возможен импульс вверх.",
    timeframe: "H1",
  },
  {
    symbol: "SOLUSDT",
    reco: "SELL",
    direction: "sell",
    change: -2.4,
    comment: "Сильный откат после резкого роста, риск коррекции.",
    timeframe: "M5",
  },
];

const signalsCardsEl = document.getElementById("signals-cards");

function renderSignals(filterSymbol = "ALL") {
  signalsCardsEl.innerHTML = "";
  const filtered =
    filterSymbol === "ALL"
      ? signalsData
      : signalsData.filter((s) => s.symbol === filterSymbol);

  filtered.forEach((s) => {
    const card = document.createElement("div");
    card.className = "signal-card";

    const header = document.createElement("div");
    header.className = "signal-card-header";

    const left = document.createElement("div");
    left.innerHTML = `<span class="signal-symbol">${s.symbol}</span> · <span class="lesson-tag">${s.timeframe}</span>`;

    const pill = document.createElement("span");
    pill.className = "signal-reco " + (s.direction === "sell" ? "sell" : s.direction === "hold" ? "hold" : "");
    pill.textContent = s.reco;

    header.appendChild(left);
    header.appendChild(pill);

    const body = document.createElement("div");
    body.className = "signal-body";
    body.innerHTML =
      `<p>${s.comment}</p><p class="muted small">Изменение за период: <b>${s.change.toFixed(2)}%</b></p>`;

    const footer = document.createElement("div");
    footer.className = "signal-card-footer";
    footer.innerHTML =
      `<span>AI-анализ</span><span class="lesson-tag">Не финсовет</span>`;

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    signalsCardsEl.appendChild(card);
  });
}

renderSignals();

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("chip-active"));
    chip.classList.add("chip-active");
    renderSignals(chip.dataset.symbol);
  });
});

// ---- Академия: уроки и прогресс ----

const lessonsData = [
  {
    id: "basic",
    title: "Что такое криптовалюта простыми словами",
    tag: "База",
    text:
      "Криптовалюта — это цифровые деньги, которые существуют только в интернете и хранятся в блокчейне.\n\n" +
      "Блокчейн — большая база данных, которую нельзя подделать одной кнопкой. Транзакции записываются в цепочку блоков, " +
      "и каждый новый блок опирается на предыдущие.\n\n" +
      "Главное для новичка: цена может сильно меняться, поэтому важно управлять риском и не заходить на все деньги.",
  },
  {
    id: "risk",
    title: "Риски и как не слить депозит",
    tag: "Риск-менеджмент",
    text:
      "Крипта даёт как большие возможности, так и большие просадки.\n\n" +
      "Частые ошибки новичков:\n" +
      "• вход all-in в одну монету;\n" +
      "• отсутствие стоп-лосса;\n" +
      "• вера в «точные сигналы» и «гарантированный доход».\n\n" +
      "Базовые правила:\n" +
      "1) Не инвестируй последние деньги и кредиты.\n" +
      "2) Риск на сделку — фиксированный процент от депозита.\n" +
      "3) Стоп-лосс ставится заранее, а не «по ощущениям».",
  },
  {
    id: "wallets",
    title: "Биржи, кошельки и хранение",
    tag: "Безопасность",
    text:
      "Биржа (Binance, OKX и др.) — место, где ты покупаешь и продаёшь криптовалюту.\n" +
      "Кошелёк (Trust Wallet, MetaMask и др.) — приложение, где ты сам контролируешь приватные ключи.\n\n" +
      "Если сумма серьёзная:\n" +
      "• держи основную часть на кошельках;\n" +
      "• делай резервную копию seed-фразы;\n" +
      "• не вводи свои ключи на незнакомых сайтах.",
  },
  {
    id: "signals",
    title: "Как правильно использовать сигналы бота",
    tag: "Практика",
    text:
      "Сигналы бота — это подсказка, а не приказ.\n\n" +
      "Алгоритм:\n" +
      "1) Пришёл сигнал — смотри график и уровень волатильности.\n" +
      "2) Оцени тренд: нет ли уже огромного пампа.\n" +
      "3) Рассчитай размер позиции через калькулятор.\n" +
      "4) Сразу ставь стоп и цели.\n\n" +
      "Так ты учишься думать, а не слепо следовать уведомлениям.",
  },
];

const lessonsListEl = document.getElementById("lessons-list");
const lessonView = document.getElementById("lesson-view");
const lessonTitle = document.getElementById("lesson-title");
const lessonText = document.getElementById("lesson-text");
const lessonStatusPill = document.getElementById("lesson-status-pill");
const lessonToggleBtn = document.getElementById("lesson-toggle-complete");
const progressBar = document.getElementById("academy-progress");
const progressText = document.getElementById("academy-progress-text");

let currentLessonId = null;

function isLessonDone(id) {
  return state.lessonsDone.includes(id);
}

function toggleLessonDone(id) {
  if (isLessonDone(id)) {
    state.lessonsDone = state.lessonsDone.filter((x) => x !== id);
  } else {
    state.lessonsDone.push(id);
  }
  localStorage.setItem("lessonsDone", JSON.stringify(state.lessonsDone));
}

function updateProgress() {
  const total = lessonsData.length;
  const done = state.lessonsDone.length;
  const percent = total ? (done / total) * 100 : 0;
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `${done} / ${total} уроков`;
}

function renderLessonsList() {
  lessonsListEl.innerHTML = "";
  lessonsData.forEach((lesson) => {
    const item = document.createElement("div");
    item.className = "lesson-item";

    const meta = document.createElement("div");
    meta.className = "lesson-meta";
    const title = document.createElement("div");
    title.textContent = lesson.title;
    const tag = document.createElement("div");
    tag.className = "lesson-tag";
    tag.textContent = lesson.tag;

    meta.appendChild(title);
    meta.appendChild(tag);

    const pill = document.createElement("span");
    pill.className = "status-pill";
    if (isLessonDone(lesson.id)) {
      pill.classList.add("done");
      pill.textContent = "Пройдено";
    } else {
      pill.textContent = "Новый";
    }

    item.appendChild(meta);
    item.appendChild(pill);

    item.addEventListener("click", () => openLesson(lesson.id));
    lessonsListEl.appendChild(item);
  });
}

function openLesson(id) {
  const lesson = lessonsData.find((l) => l.id === id);
  if (!lesson) return;
  currentLessonId = id;
  lessonTitle.textContent = lesson.title;
  lessonText.textContent = lesson.text;

  if (isLessonDone(id)) {
    lessonStatusPill.textContent = "Пройдено";
    lessonStatusPill.classList.add("done");
    lessonToggleBtn.textContent = "↩️ Пометить как непройдено";
  } else {
    lessonStatusPill.textContent = "Новый";
    lessonStatusPill.classList.remove("done");
    lessonToggleBtn.textContent = "✅ Отметить как пройдено";
  }

  lessonView.style.display = "block";
}

lessonToggleBtn.addEventListener("click", () => {
  if (!currentLessonId) return;
  toggleLessonDone(currentLessonId);
  renderLessonsList();
  openLesson(currentLessonId);
  updateProgress();
});

// Первичная отрисовка
renderLessonsList();
updateProgress();

// ---- Калькулятор позиции ----

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
    `Максимальный размер позиции ≈ ${positionSize.toFixed(2)} USDT ` +
    `при риске ${risk.toFixed(2)}% и стоп-лоссе ${stop.toFixed(2)}%.`;
});

// ---- DCA калькулятор ----

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
    `Средняя цена входа ≈ ${avgPrice.toFixed(2)}. ` +
    `Усреднение не убирает риск, но делает входы более плавными.`;
});

// ---- План сделки ----

const planEntry = document.getElementById("plan-entry");
const planTarget = document.getElementById("plan-target");
const planStop = document.getElementById("plan-stop");
const planBtn = document.getElementById("plan-btn");
const planResult = document.getElementById("plan-result");

planBtn.addEventListener("click", () => {
  const entry = parseFloat(planEntry.value);
  const target = parseFloat(planTarget.value);
  const stop = parseFloat(planStop.value);

  if (!entry || !target || !stop || entry <= 0 || target <= 0 || stop <= 0) {
    planResult.textContent = "Заполни все три цены.";
    return;
  }

  if (stop >= entry) {
    planResult.textContent = "Стоп-лосс должен быть ниже цены входа.";
    return;
  }

  const risk = entry - stop;
  const reward = target - entry;
  const rr = reward / risk;

  planResult.textContent =
    `План сделки:\n` +
    `• Вход: ${entry}\n` +
    `• Цель: ${target}\n` +
    `• Стоп-лосс: ${stop}\n\n` +
    `Соотношение риск/прибыль (R:R) ≈ ${rr.toFixed(2)}. ` +
    `Чем выше R:R, тем меньше сделок нужно, чтобы быть в плюсе.`;
});
