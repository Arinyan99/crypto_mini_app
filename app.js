// Константы
const BOT_USERNAME = "netysilcryptoaisignal_bot"; // при желании поменяй на имя своего бота

// Telegram WebApp init
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) {
  tg.expand();
  tg.setBackgroundColor("#050714");
}

const userPill = document.getElementById("user-pill");

// Показать имя пользователя из Telegram
if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
  const u = tg.initDataUnsafe.user;
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
  userPill.textContent = fullName ? `👤 ${fullName}` : "👤 Пользователь";
}

// ====== STATE ======
const state = {
  theme: localStorage.getItem("theme") || "dark",
  riskMode: localStorage.getItem("riskMode") || "beginner",
  lessonsDone: JSON.parse(localStorage.getItem("lessonsDone") || "[]"),
  quests: JSON.parse(
    localStorage.getItem("dailyQuests") ||
      JSON.stringify({
        learn: false,
        signal: false,
        calc: false,
      })
  ),
  lastVisit: localStorage.getItem("lastVisit") || null,
  streak: parseInt(localStorage.getItem("streak") || "0", 10),
  lastVisitedTab: localStorage.getItem("lastTab") || "overview",
  bestQuizScore: JSON.parse(localStorage.getItem("bestQuizScore") || '{"correct":0,"total":0}'),
};

// ====== THEME ======
const themeToggle = document.getElementById("theme-toggle");

function applyTheme() {
  if (state.theme === "light") {
    document.body.classList.add("light");
    themeToggle.textContent = "☀️";
  } else {
    document.body.classList.remove("light");
    themeToggle.textContent = "🌙";
  }
}

themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", state.theme);
  applyTheme();
});

applyTheme();

// ====== NAVIGATION ======
const navTabs = document.querySelectorAll(".nav-tab");
const panels = {
  overview: document.getElementById("tab-overview"),
  signals: document.getElementById("tab-signals"),
  academy: document.getElementById("tab-academy"),
  tools: document.getElementById("tab-tools"),
};

function switchTab(tab) {
  state.lastVisitedTab = tab;
  localStorage.setItem("lastTab", tab);

  navTabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("active", key === tab);
  });

  if (tab === "signals") markQuest("signal");
  if (tab === "academy") markQuest("learn");
}

navTabs.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// восстановить вкладку
switchTab(state.lastVisitedTab);

// Быстрые действия
document.querySelectorAll(".pill-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const a = btn.dataset.action;
    if (a === "go-signals") switchTab("signals");
    if (a === "go-academy") switchTab("academy");
    if (a === "go-tools") switchTab("tools");
  });
});

// Низ
document.querySelectorAll(".bottom-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const act = btn.dataset.action;
    if (act === "bot-commands") {
      if (tg) {
        tg.openTelegramLink(`https://t.me/${BOT_USERNAME}?start=help_from_webapp`);
      }
    } else if (act === "open-academy") {
      switchTab("academy");
    } else if (act === "open-tools") {
      switchTab("tools");
    }
  });
});

// ====== STREAK / LEVEL / QUESTS ======
const levelLabel = document.getElementById("user-level-label");
const streakLabel = document.getElementById("user-streak-label");
const questsListEl = document.getElementById("quests-list");
const streakHint = document.getElementById("streak-hint");

function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  if (!state.lastVisit) {
    state.lastVisit = today;
    state.streak = 1;
  } else if (state.lastVisit !== today) {
    const last = new Date(state.lastVisit);
    const now = new Date(today);
    const diff = (now - last) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      state.streak += 1;
    } else {
      state.streak = 1;
    }
    state.lastVisit = today;
  }

  localStorage.setItem("lastVisit", state.lastVisit);
  localStorage.setItem("streak", state.streak.toString());

  const lvl = 1 + Math.floor(state.lessonsDone.length / 2) + Math.floor(state.streak / 3);
  levelLabel.textContent = `LVL ${lvl}`;
  streakLabel.textContent = `${state.streak}-й день стрика`;
}

function markQuest(key) {
  if (!state.quests[key]) {
    state.quests[key] = true;
    localStorage.setItem("dailyQuests", JSON.stringify(state.quests));
    renderQuests();
  }
}

function resetQuestsIfNeeded() {
  const today = new Date().toISOString().slice(0, 10);
  if (!state.lastVisit || state.lastVisit !== today) {
    state.quests = { learn: false, signal: false, calc: false };
    localStorage.setItem("dailyQuests", JSON.stringify(state.quests));
  }
}

function renderQuests() {
  questsListEl.innerHTML = "";
  const config = {
    learn: "Пройти 1 урок в Академии",
    signal: "Открыть вкладку с сигналами",
    calc: "Посчитать хотя бы одну сделку",
  };

  Object.entries(config).forEach(([key, text]) => {
    const li = document.createElement("li");
    li.className = "quest-item";
    const label = document.createElement("div");
    label.className = "quest-label";
    label.innerHTML = `<span>${state.quests[key] ? "✅" : "⬜"}</span><span>${text}</span>`;
    const btn = document.createElement("button");
    btn.className = "quest-toggle";
    btn.textContent = state.quests[key] ? "✔" : "";
    btn.addEventListener("click", () => {
      state.quests[key] = !state.quests[key];
      localStorage.setItem("dailyQuests", JSON.stringify(state.quests));
      renderQuests();
    });

    li.appendChild(label);
    li.appendChild(btn);
    questsListEl.appendChild(li);
  });

  const doneCount = Object.values(state.quests).filter(Boolean).length;
  streakHint.textContent = doneCount === 3
    ? "🔥 Все квесты дня сделаны! Ты реально относишься к этому как к делу, а не к казино."
    : "Совет: выполняй хотя бы 2 квеста в день, чтобы не терять стрик.";
}

resetQuestsIfNeeded();
updateStreak();
renderQuests();

// ====== RISK PROFILE ======
const riskDescriptions = {
  beginner: "Минимальный риск, маленькие объёмы, цель — не потерять депозит и привыкнуть к волатильности.",
  safe: "Осторожная торговля с фиксированным риском на сделку и продуманными стопами.",
  normal: "Сбалансированный подход: риск есть, но он осознан и заранее посчитан.",
  crazy: "Агрессивный стиль: высокие плечи и частая торговля. Новый уровень ответственности, а не игры.",
};

const riskModeLabel = document.getElementById("risk-mode-label");
const riskModeDesc = document.getElementById("risk-mode-desc");

function renderRiskMode() {
  const mode = state.riskMode;
  const name =
    mode === "beginner"
      ? "Новичок"
      : mode === "safe"
      ? "Осторожный"
      : mode === "normal"
      ? "Сбалансированный"
      : "Агрессивный";
  riskModeLabel.textContent = name;
  riskModeDesc.textContent = riskDescriptions[mode];

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

// ====== DEMO SIGNAL STATUS ======
const overviewSubsEl = document.getElementById("overview-subs");
const overviewLastSignalEl = document.getElementById("overview-last-signal");
const overviewThresholdEl = document.getElementById("overview-threshold");

// псевдо-подписки
let demoSubs = JSON.parse(localStorage.getItem("crypto_subs") || "[]");
if (!demoSubs.length) demoSubs = ["BTCUSDT", "ETHUSDT"];

overviewSubsEl.textContent = demoSubs.length.toString();
overviewLastSignalEl.textContent = "BTCUSDT • HOLD";
overviewThresholdEl.textContent = "глобальный (из бота)";

document.getElementById("btn-open-settings").addEventListener("click", () => {
  if (tg) tg.openTelegramLink(`https://t.me/${BOT_USERNAME}?start=settings`);
});

// ====== DEMO SIGNALS DATA ======
const signalsDataBase = [
  {
    symbol: "BTCUSDT",
    reco: "HOLD",
    dir: "hold",
    change: 0.35,
    tf: "M15",
    comment: "Движение в пределах шума, лучше подождать более явное направление.",
  },
  {
    symbol: "ETHUSDT",
    reco: "BUY",
    dir: "buy",
    change: 1.8,
    tf: "H1",
    comment: "Пробой локального уровня, объёмы растут — возможен импульс вверх.",
  },
  {
    symbol: "SOLUSDT",
    reco: "SELL",
    dir: "sell",
    change: -2.4,
    tf: "M5",
    comment: "Резкий откат после сильного роста, высок риск коррекции глубже.",
  },
];

const signalsCardsEl = document.getElementById("signals-cards");

function renderSignals(filterSymbol = "ALL") {
  signalsCardsEl.innerHTML = "";
  const list =
    filterSymbol === "ALL"
      ? signalsDataBase
      : signalsDataBase.filter((s) => s.symbol === filterSymbol);

  list.forEach((s) => {
    const card = document.createElement("div");
    card.className = "signal-card";

    const header = document.createElement("div");
    header.className = "signal-card-header";
    header.innerHTML = `<div><span class="signal-symbol">${s.symbol}</span> · <span class="lesson-tag">${s.tf}</span></div>`;

    const pill = document.createElement("span");
    pill.className = "signal-reco";
    if (s.dir === "sell") pill.classList.add("sell");
    if (s.dir === "hold") pill.classList.add("hold");
    pill.textContent = s.reco;

    header.appendChild(pill);

    const body = document.createElement("div");
    body.innerHTML = `<p>${s.comment}</p><p class="muted tiny">Изменение за период: <b>${s.change.toFixed(
      2
    )}%</b></p>`;

    const footer = document.createElement("div");
    footer.className = "signal-card-footer";
    footer.innerHTML = `<span>AI-анализ</span><span class="lesson-tag">Не финсовет</span>`;

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

// генерация нового демо-сигнала
document.getElementById("btn-new-signal").addEventListener("click", () => {
  const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
  const recos = [
    { reco: "BUY", dir: "buy" },
    { reco: "SELL", dir: "sell" },
    { reco: "HOLD", dir: "hold" },
  ];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const r = recos[Math.floor(Math.random() * recos.length)];
  const change = (Math.random() * 4 - 2).toFixed(2);
  const tfArr = ["M5", "M15", "H1", "H4"];
  const tf = tfArr[Math.floor(Math.random() * tfArr.length)];

  const commentBase =
    r.dir === "buy"
      ? "Рынок показывает признаки силы, но риск всегда считаем заранее."
      : r.dir === "sell"
      ? "Просадка по цене, сигнал на выход или сокращение позиции."
      : "Неясное направление — лучше сохранить капитал, чем гадать.";

  signalsDataBase.unshift({
    symbol,
    reco: r.reco,
    dir: r.dir,
    change: parseFloat(change),
    tf,
    comment: commentBase,
  });
  // ограничиваем длину
  if (signalsDataBase.length > 6) signalsDataBase.pop();

  renderSignals(document.querySelector(".chip.chip-active").dataset.symbol);
});

// ====== ACADEMY: lessons & progress ======
const lessonsData = [
  {
    id: "basic",
    title: "Что такое криптовалюта простыми словами",
    tag: "База",
    text:
      "Криптовалюта — это цифровые деньги, которые живут в блокчейне. Нет банка-центра, который может «откатить» перевод.\n\n" +
      "Каждая транзакция попадает в цепочку блоков, которую сложно подделать. Отсюда и плюс (никто не заблокирует твой счёт), и минус (если ошибся — отката нет).\n\n" +
      "Для новичка главное: волатильность + ответственность. Здесь нет кнопки «вернуть деньги».",
  },
  {
    id: "risk",
    title: "Риск-менеджмент: почему это важнее входа",
    tag: "Риск",
    text:
      "Большинство новичков сливают депозит не потому, что «не угадали монету», а потому, что не считали риск.\n\n" +
      "Базовые правила:\n" +
      "• на одну сделку — фиксированный процент от депозита;\n" +
      "• стоп-лосс ставится до входа, а не после;\n" +
      "• одно резкое движение не должно сносить весь аккаунт.\n\n" +
      "Задача mini-апки — напоминать об этом каждый раз, когда ты что-то считаешь.",
  },
  {
    id: "wallets",
    title: "Биржи и кошельки: где держать крипту",
    tag: "Безопасность",
    text:
      "Биржа (Binance, OKX и др.) — удобно торговать, но это не твои ключи.\n" +
      "Кошелёк (Trust Wallet, MetaMask и др.) — приватные ключи у тебя, но больше ответственности.\n\n" +
      "Если сумма серьёзная — основную часть держат на кошельках, а на бирже оставляют активы под торговлю.\n" +
      "Seed-фразы никогда не вводятся на «подозрительных сайтах ради аирдропа».",
  },
  {
    id: "signals",
    title: "Как пользоваться сигналами бота с головой",
    tag: "Практика",
    text:
      "Сигнал — это повод открыть график и подумать, а не приказ «бери сейчас».\n\n" +
      "Алгоритм:\n" +
      "1) Пришёл сигнал — смотри тренд и волатильность.\n" +
      "2) Оцени, не было ли до этого уже огромного пампа.\n" +
      "3) Считай размер позиции через калькулятор.\n" +
      "4) Сразу ставь стоп и цели.\n\n" +
      "Так ты превращаешь уведомления в инструмент, а не в казино.",
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
  updateStreak(); // уровень учитывает уроки
}

function renderLessonsList() {
  lessonsListEl.innerHTML = "";
  lessonsData.forEach((lesson) => {
    const item = document.createElement("div");
    item.className = "lesson-item";

    const meta = document.createElement("div");
    meta.className = "lesson-meta";
    const t = document.createElement("div");
    t.textContent = lesson.title;
    const tag = document.createElement("div");
    tag.className = "lesson-tag";
    tag.textContent = lesson.tag;
    meta.appendChild(t);
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
  markQuest("learn");
});

renderLessonsList();
updateProgress();

// ====== QUIZ ======
const quizQuestions = [
  {
    q: "Что главное для новичка в крипте?",
    options: [
      "Угадать монету, которая x100 за неделю",
      "Научиться управлять риском и не сливать депозит",
      "Брать как можно больше плечо (кредитное плечо)",
    ],
    correct: 1,
  },
  {
    q: "Что такое стоп-лосс?",
    options: [
      "Кнопка, которая гарантирует прибыль",
      "Цена, по которой ты заранее согласен выйти с контролируемым убытком",
      "Автоматическая покупка по лучшей цене",
    ],
    correct: 1,
  },
  {
    q: "Где безопаснее хранить крупные суммы?",
    options: [
      "На бирже без 2FA, чтобы быстро выводить",
      "Только на стейкинге с сумасшедшими процентами",
      "На собственных кошельках с сохранённой seed-фразой",
    ],
    correct: 2,
  },
];

let currentQuizIndex = 0;

const quizQuestionEl = document.getElementById("quiz-question");
const quizOptionsEl = document.getElementById("quiz-options");
const quizResultEl = document.getElementById("quiz-result");
const quizNextBtn = document.getElementById("quiz-next");
const quizBestEl = document.getElementById("quiz-best");

function renderBestQuiz() {
  quizBestEl.textContent = `${state.bestQuizScore.correct}/${state.bestQuizScore.total}`;
}

function renderQuiz() {
  quizResultEl.textContent = "";
  quizOptionsEl.innerHTML = "";
  const q = quizQuestions[currentQuizIndex];
  quizQuestionEl.textContent = q.q;
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt;
    btn.addEventListener("click", () => handleQuizAnswer(idx));
    quizOptionsEl.appendChild(btn);
  });
}

function handleQuizAnswer(idx) {
  const q = quizQuestions[currentQuizIndex];
  const buttons = quizOptionsEl.querySelectorAll(".quiz-option");
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.correct) b.classList.add("correct");
    if (i === idx && i !== q.correct) b.classList.add("wrong");
  });

  const correct = idx === q.correct;
  quizResultEl.textContent = correct ? "✅ Верно! Так держать." : "⚠️ Не совсем. Перечитай уроки — это не страшно.";
  // обновляем лучший результат
  state.bestQuizScore.total += 1;
  if (correct) state.bestQuizScore.correct += 1;
  localStorage.setItem("bestQuizScore", JSON.stringify(state.bestQuizScore));
  renderBestQuiz();
}

quizNextBtn.addEventListener("click", () => {
  currentQuizIndex = (currentQuizIndex + 1) % quizQuestions.length;
  renderQuiz();
});

renderBestQuiz();
renderQuiz();

// ====== TOOLS ======

// Position size
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
    `(риск ${risk.toFixed(2)}% от депозита, стоп ${stop.toFixed(2)}%).`;

  markQuest("calc");
});

// DCA
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
    dcaResult.textContent = "Введи две цены и одинаковый объём.";
    return;
  }
  const coins1 = amount / p1;
  const coins2 = amount / p2;
  const totalCoins = coins1 + coins2;
  const totalSpent = amount * 2;
  const avgPrice = totalSpent / totalCoins;
  dcaResult.textContent = `Средняя цена входа ≈ ${avgPrice.toFixed(
    2
  )}. DCA сглаживает вход, но не отменяет риск.`;
});

// PnL
const pnlEntry = document.getElementById("pnl-entry");
const pnlExit = document.getElementById("pnl-exit");
const pnlSize = document.getElementById("pnl-size");
const pnlBtn = document.getElementById("pnl-btn");
const pnlResult = document.getElementById("pnl-result");

pnlBtn.addEventListener("click", () => {
  const entry = parseFloat(pnlEntry.value);
  const exit = parseFloat(pnlExit.value);
  const size = parseFloat(pnlSize.value);

  if (!entry || !exit || !size || entry <= 0 || exit <= 0 || size <= 0) {
    pnlResult.textContent = "Заполни все поля.";
    return;
  }

  const changePct = ((exit - entry) / entry) * 100;
  const profit = (changePct / 100) * size;

  pnlResult.textContent =
    `Изменение цены: ${changePct.toFixed(2)}%. ` +
    (profit >= 0
      ? `Примерная прибыль: +${profit.toFixed(2)} USDT.`
      : `Примерный убыток: ${profit.toFixed(2)} USDT.`);
});

// Plan
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
    planResult.textContent = "Стоп-лосс должен быть ниже входа.";
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
    `Соотношение риск/прибыль ≈ ${rr.toFixed(
      2
    )}. Чем выше R:R, тем меньше сделок нужно, чтобы быть в плюсе.`;
});
