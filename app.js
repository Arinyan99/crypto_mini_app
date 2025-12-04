// === БАЗОВЫЕ НАСТРОЙКИ ===
const BOT_USERNAME = "netysilcryptoaisignal_bot"; // если поменяешь имя бота — обнови здесь

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) {
  tg.expand();
  tg.setBackgroundColor("#020617");
}

const state = {
  theme: localStorage.getItem("theme") || "dark",
  lastTab: localStorage.getItem("lastTab") || "overview",
  riskMode: localStorage.getItem("riskMode") || "beginner",
  myCoins: JSON.parse(localStorage.getItem("myCoins") || "[]"),
  signalsPage: 1,
  filter: {
    minChange: null,
    direction: "all",
  },
  signalsTab: "feed",
};

// === ТЕМА ===
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

// === ИМЯ ПОЛЬЗОВАТЕЛЯ ИЗ TELEGRAM ===
const userPill = document.getElementById("user-pill");
if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
  const u = tg.initDataUnsafe.user;
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
  userPill.textContent = fullName || "Пользователь";
}

// === ВЕРХНИЕ ВКЛАДКИ ===
const navTabs = document.querySelectorAll(".nav-tab");
const tabPanels = {
  overview: document.getElementById("tab-overview"),
  signals: document.getElementById("tab-signals"),
  academy: document.getElementById("tab-academy"),
  tools: document.getElementById("tab-tools"),
};

function switchTab(tab) {
  state.lastTab = tab;
  localStorage.setItem("lastTab", tab);

  navTabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  Object.entries(tabPanels).forEach(([key, panel]) => {
    panel.classList.toggle("active", key === tab);
  });
}

navTabs.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

switchTab(state.lastTab);

// === ПРОФИЛЬ РИСКА ===
const riskDescriptions = {
  beginner: "Минимальный риск и объём. Цель — не потерять депозит и привыкнуть к волатильности.",
  safe: "Осторожная торговля с ограниченным риском на сделку и обязательными стопами.",
  normal: "Сбалансированный подход: есть риск, но он заранее посчитан и контролируем.",
  aggressive: "Повышенный риск, частая торговля, возможно использование плеча. Нужна дисциплина.",
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

// === ОБЗОР СИГНАЛОВ (примерные данные) ===
const overviewSubsEl = document.getElementById("overview-subs");
const overviewLastSignalEl = document.getElementById("overview-last-signal");
const overviewThresholdEl = document.getElementById("overview-threshold");

overviewSubsEl.textContent = "2";
overviewLastSignalEl.textContent = "BTCUSDT · HOLD";
overviewThresholdEl.textContent = "0.01% (из бота)";

document.getElementById("btn-open-settings").addEventListener("click", () => {
  if (tg) {
    tg.openTelegramLink(`https://t.me/${BOT_USERNAME}?start=settings_from_webapp`);
  }
});

// === ДАННЫЕ СИГНАЛОВ (демо, но максимально приближено к реальному формату) ===
const signalsData = [
  {
    id: "btc-15-long",
    symbol: "BTCUSDT",
    reco: "BUY",
    dir: "buy",
    timeframe: "15m",
    price: 92500,
    prevPrice: 91320,
    change: 1.3,
    volatility: "умеренная",
    reasons: [
      "Цена закрепилась выше локального диапазона консолидации последних часов.",
      "Объём покупок на споте и фьючерсах выше среднего за 24 часа.",
      "Фандинг в лёгком плюсе, перекоса в одну сторону нет.",
    ],
    riskNote:
      "Рекомендуется риск не более 1–2% от депозита на сделку. При пробое обратно зоны пробоя сценарий отменяется.",
    actionPlan:
      "Потенциальный вход — после короткой локальной коррекции к зоне пробоя. Стоп — под нижней границей диапазона, цели — ближайший локальный максимум.",
  },
  {
    id: "btc-5-short",
    symbol: "BTCUSDT",
    reco: "SELL",
    dir: "sell",
    timeframe: "5m",
    price: 92100,
    prevPrice: 92850,
    change: -0.8,
    volatility: "повышенная",
    reasons: [
      "Резкий откат после агрессивного импульса вверх, свечи с длинными верхними тенями.",
      "Рост открытого интереса на фьючерсах при снижении цены — возможное накапливание шортов.",
      "Укрепление доллара и снижение аппетита к риску на традиционном рынке.",
    ],
    riskNote:
      "Сценарий относится к внутридневной спекуляции. Без опыта активный шорт лучше пропускать или торговать минимальным объёмом.",
    actionPlan:
      "Рассматривать частичную фиксацию прибыли по лонгам или небольшие шорты с жёстким стопом над максимумом импульса.",
  },
  {
    id: "eth-h1-hold",
    symbol: "ETHUSDT",
    reco: "HOLD",
    dir: "hold",
    timeframe: "1h",
    price: 3700,
    prevPrice: 3690,
    change: 0.27,
    volatility: "низкая",
    reasons: [
      "Цена двигается в узком диапазоне без явного доминирования покупателей или продавцов.",
      "Объёмы снижаются, рынок ждёт внешнего триггера (новости, движение BTC).",
      "Основные уровни поддержки/сопротивления не пробиты.",
    ],
    riskNote: "В такие периоды легко поймать «пилу». Лишние сделки не добавят прибыли, но увеличат комиссии.",
    actionPlan:
      "Логично подождать выхода из диапазона либо отклика на движение Bitcoin, а уже потом принимать решение.",
  },
  {
    id: "sol-h1-buy",
    symbol: "SOLUSDT",
    reco: "BUY",
    dir: "buy",
    timeframe: "1h",
    price: 150,
    prevPrice: 144,
    change: 4.1,
    volatility: "высокая",
    reasons: [
      "Выход из нисходящего канала на объёмах выше среднего.",
      "Появление положительных новостей по экосистеме Solana и рост активности в DeFi/NFT.",
      "Ончейн-метрики показывают рост количества активных адресов.",
    ],
    riskNote:
      "Высокая волатильность. Возможны глубокие откаты внутри восходящего движения. Объём позиции должен быть умеренным.",
    actionPlan:
      "Рассматривать набор позиции частями. Стоп — под уровнем пробоя. Фиксация — частями по мере движения к ключевым сопротивлениям.",
  },
  {
    id: "ton-15-sell",
    symbol: "TONUSDT",
    reco: "SELL",
    dir: "sell",
    timeframe: "15m",
    price: 6.1,
    prevPrice: 6.4,
    change: -4.5,
    volatility: "высокая",
    reasons: [
      "Сильный импульс вниз после продолжительного роста без глубоких коррекций.",
      "Рост объёмов на продажу, активная фиксация прибыли ранними участниками.",
      "Ослабление интереса к альтам на фоне коррекции Bitcoin.",
    ],
    riskNote:
      "Агрессивный сценарий. Новичкам лучше не входить против глобального тренда, если он остаётся бычьим.",
    actionPlan:
      "Если был лонг — подумать о частичной фиксации. Новые шорты открывать только при явном слабом отскоке и с коротким стопом.",
  },
  {
    id: "bnb-h4-hold",
    symbol: "BNBUSDT",
    reco: "HOLD",
    dir: "hold",
    timeframe: "4h",
    price: 600,
    prevPrice: 598,
    change: 0.33,
    volatility: "умеренная",
    reasons: [
      "Цена находится в середине диапазона между сильной поддержкой и сопротивлением.",
      "Объёмы средние, серьёзных аномалий в ордербуке нет.",
      "Фундаментальный фон без значимых новостей.",
    ],
    riskNote: "При такой картине риск/прибыль обычно хуже, чем при торговле от границ диапазона.",
    actionPlan:
      "Адекватная тактика — ждать движения к крайним уровням диапазона или переходить на более сильные сетапы по другим монетам.",
  },
];

const PER_PAGE = 4;

// === СИГНАЛЫ: ВНУТРЕННИЕ ВКЛАДКИ ===
const signalsTabs = document.querySelectorAll(".signals-tab");
const signalsFeedEl = document.getElementById("signals-feed");
const signalsEmptyEl = document.getElementById("signals-empty");
const pageLabelEl = document.getElementById("signals-page-label");
const prevBtn = document.getElementById("signals-prev");
const nextBtn = document.getElementById("signals-next");

// блоки "Мои монеты" и "Фильтры"
const signalsMyBlock = document.getElementById("signals-my");
const signalsFiltersBlock = document.getElementById("signals-filters");

// детали сигнала
const detailsTitle = document.getElementById("details-title");
const detailsSubtitle = document.getElementById("details-subtitle");
const detailsBody = document.getElementById("details-body");

// фильтры
const filterMinChangeInput = document.getElementById("filter-min-change");
const filterDirectionSelect = document.getElementById("filter-direction");
const applyFiltersBtn = document.getElementById("apply-filters");

// Мои монеты
const availableCoins = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "TONUSDT", "BNBUSDT"];
const myCoinsListEl = document.getElementById("my-coins-list");

function switchSignalsTab(tab) {
  state.signalsTab = tab;
  signalsTabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.sigTab === tab));

  if (tab === "feed") {
    signalsMyBlock.style.display = "none";
    signalsFiltersBlock.style.display = "none";
  } else if (tab === "my") {
    signalsMyBlock.style.display = "block";
    signalsFiltersBlock.style.display = "none";
  } else if (tab === "filters") {
    signalsMyBlock.style.display = "none";
    signalsFiltersBlock.style.display = "block";
  }

  if (tab === "feed") {
    renderSignalsFeed();
  }
}

signalsTabs.forEach((btn) => {
  btn.addEventListener("click", () => switchSignalsTab(btn.dataset.sigTab));
});

switchSignalsTab(state.signalsTab);

// фильтрация массива сигналов
function getFilteredSignals() {
  return signalsData.filter((s) => {
    // фильтр по монетам, если мы хотим смотреть только свои
    if (state.signalsTab === "feed" && state.myCoins.length > 0) {
      if (!state.myCoins.includes(s.symbol)) return false;
    }

    // фильтр по направлению
    if (state.filter.direction !== "all" && state.filter.direction !== s.dir) return false;

    // фильтр по изменению
    if (state.filter.minChange != null) {
      const min = Math.abs(state.filter.minChange);
      if (Math.abs(s.change) < min) return false;
    }

    return true;
  });
}

// отрисовка ленты сигналов с пагинацией
function renderSignalsFeed() {
  const all = getFilteredSignals();
  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  if (state.signalsPage > totalPages) state.signalsPage = totalPages;
  if (state.signalsPage < 1) state.signalsPage = 1;

  const start = (state.signalsPage - 1) * PER_PAGE;
  const pageItems = all.slice(start, start + PER_PAGE);

  signalsFeedEl.innerHTML = "";

  if (pageItems.length === 0) {
    signalsEmptyEl.style.display = "block";
  } else {
    signalsEmptyEl.style.display = "none";
  }

  pageItems.forEach((s) => {
    const card = document.createElement("div");
    card.className = "signal-card";
    card.dataset.id = s.id;

    const header = document.createElement("div");
    header.className = "signal-header";

    const left = document.createElement("div");
    left.innerHTML = `<span class="signal-symbol">${s.symbol}</span> · <span class="signal-tf">${s.timeframe}</span>`;

    const badge = document.createElement("span");
    badge.className = "badge";
    if (s.dir === "buy") badge.classList.add("badge-buy");
    if (s.dir === "sell") badge.classList.add("badge-sell");
    if (s.dir === "hold") badge.classList.add("badge-hold");
    badge.textContent = s.reco;

    header.appendChild(left);
    header.appendChild(badge);

    const body = document.createElement("div");
    body.className = "tiny muted";
    body.textContent =
      s.reasons[0] ||
      "Алгоритм нашёл интересную ситуацию на рынке. Подробный разбор смотри в деталях сигнала.";

    const footer = document.createElement("div");
    footer.className = "signal-footer";
    footer.innerHTML = `<span>Изм. за период: ${s.change.toFixed(2)}%</span><span>${s.volatility}</span>`;

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    card.addEventListener("click", () => showSignalDetails(s.id));

    signalsFeedEl.appendChild(card);
  });

  pageLabelEl.textContent = `${all.length === 0 ? 0 : state.signalsPage}/${totalPages}`;
}

prevBtn.addEventListener("click", () => {
  state.signalsPage -= 1;
  renderSignalsFeed();
});

nextBtn.addEventListener("click", () => {
  state.signalsPage += 1;
  renderSignalsFeed();
});

// детали сигнала
function showSignalDetails(id) {
  const s = signalsData.find((x) => x.id === id);
  if (!s) return;

  detailsTitle.textContent = `${s.symbol} · ${s.reco}`;
  detailsSubtitle.textContent = `Таймфрейм ${s.timeframe}, изменение за период ${s.change.toFixed(
    2
  )}%`;

  detailsBody.innerHTML = "";

  const priceRow = document.createElement("div");
  priceRow.className = "details-row";
  priceRow.innerHTML = `<div class="details-row-title">Цена</div>
    <div class="tiny">Старая: ${s.prevPrice.toFixed(2)} · Новая: ${s.price.toFixed(2)}</div>`;
  detailsBody.appendChild(priceRow);

  const reasonsRow = document.createElement("div");
  reasonsRow.className = "details-row";
  reasonsRow.innerHTML = `<div class="details-row-title">Почему возможен ${
    s.dir === "buy" ? "рост" : s.dir === "sell" ? "спад" : "боковик"
  }</div>`;
  const ul = document.createElement("ul");
  ul.className = "details-reasons";
  s.reasons.forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r;
    ul.appendChild(li);
  });
  reasonsRow.appendChild(ul);
  detailsBody.appendChild(reasonsRow);

  const riskRow = document.createElement("div");
  riskRow.className = "details-row";
  riskRow.innerHTML = `<div class="details-row-title">Риск</div>
    <div class="tiny">${s.riskNote}</div>`;
  detailsBody.appendChild(riskRow);

  const planRow = document.createElement("div");
  planRow.className = "details-row";
  planRow.innerHTML = `<div class="details-row-title">Идея плана сделки</div>
    <div class="tiny">${s.actionPlan}</div>`;
  detailsBody.appendChild(planRow);
}

// показать первый сигнал по умолчанию
showSignalDetails(signalsData[0].id);
renderSignalsFeed();

// === Мои монеты ===
function renderMyCoins() {
  myCoinsListEl.innerHTML = "";
  availableCoins.forEach((symbol) => {
    const item = document.createElement("div");
    item.className = "my-coin-item";

    const name = document.createElement("div");
    name.textContent = symbol;

    const actions = document.createElement("div");
    actions.className = "my-coin-actions";

    const status = document.createElement("span");
    status.className = "tiny";
    const active = state.myCoins.includes(symbol);
    status.textContent = active ? "отслеживается" : "не выбрана";

    const btn = document.createElement("button");
    btn.className = "toggle-btn";
    btn.textContent = active ? "Убрать" : "Выбрать";

    btn.addEventListener("click", () => {
      const idx = state.myCoins.indexOf(symbol);
      if (idx === -1) state.myCoins.push(symbol);
      else state.myCoins.splice(idx, 1);
      localStorage.setItem("myCoins", JSON.stringify(state.myCoins));
      renderMyCoins();
      renderSignalsFeed();
    });

    actions.appendChild(status);
    actions.appendChild(btn);
    item.appendChild(name);
    item.appendChild(actions);
    myCoinsListEl.appendChild(item);
  });
}

renderMyCoins();

// === Фильтры сигналов ===
applyFiltersBtn.addEventListener("click", () => {
  const val = parseFloat(filterMinChangeInput.value);
  state.filter.minChange = isNaN(val) ? null : val;
  state.filter.direction = filterDirectionSelect.value;
  state.signalsPage = 1;
  renderSignalsFeed();
});

// === АКАДЕМИЯ ===
const academyListEl = document.getElementById("academy-list");
const academyArticleBlock = document.getElementById("academy-article");
const academyTitleEl = document.getElementById("academy-title");
const academyTextEl = document.getElementById("academy-text");

const academyArticles = [
  {
    id: "what-is-crypto",
    title: "Что такое криптовалюта и блокчейн",
    tag: "База",
    text:
      "Криптовалюта — это цифровой актив, учёт которого ведётся в распределённом реестре (блокчейн).\n\n" +
      "Главные особенности:\n" +
      "• нет единого центра, который может «откатить» перевод;\n" +
      "• транзакции необратимы — если ошибся адресом, деньги не вернуть;\n" +
      "• доступ к средствам определяется владением закрытым ключом.\n\n" +
      "Из этого следуют как плюсы (цензура устойчивость), так и минусы (высокая ответственность пользователя).",
  },
  {
    id: "risk-management",
    title: "Риск-менеджмент важнее точки входа",
    tag: "Риск",
    text:
      "Большинство депозитов сливается не из-за «неправильной монеты», а из-за отсутствия управления риском.\n\n" +
      "Базовые принципы:\n" +
      "• фиксированный риск на сделку (например, 1–2% от депозита);\n" +
      "• стоп-лосс ставится до входа, а не после;\n" +
      "• позиция рассчитывается от стопа, а не от желания «зайти побольше».\n\n" +
      "Калькуляторы в разделе «Инструменты» помогут дисциплинировать этот процесс.",
  },
  {
    id: "security",
    title: "Биржи, кошельки и безопасность",
    tag: "Безопасность",
    text:
      "Биржа удобна для торговли, но ключи и контроль — у площадки. Кошелёк даёт полный контроль, но и всю ответственность.\n\n" +
      "Практические советы:\n" +
      "• крупные суммы держать на собственных кошельках, не на бирже;\n" +
      "• seed-фразу хранить оффлайн и никому не передавать;\n" +
      "• всегда проверять домен сайта и включать двухфакторную аутентификацию.\n\n" +
      "Любые «гарантированные» доходности и просьбы отправить токены для «умножения» игнорируй.",
  },
  {
    id: "how-to-use-signals",
    title: "Как работать с сигналами бота",
    tag: "Практика",
    text:
      "Сигнал бота — это не приказ открыть сделку, а повод посмотреть на рынок внимательнее.\n\n" +
      "Алгоритм работы:\n" +
      "1) Проверить общий тренд и важные уровни.\n" +
      "2) Оценить волатильность и потенциальную глубину отката.\n" +
      "3) Через калькулятор посчитать размер позиции и стоп.\n" +
      "4) Принять решение — входить частично, ждать подтверждения или пропустить сетап.\n\n" +
      "Так ты используешь сигналы как источник идей, а не как замену собственной голове.",
  },
];

function renderAcademyList() {
  academyListEl.innerHTML = "";
  academyArticles.forEach((art) => {
    const item = document.createElement("div");
    item.className = "academy-item";
    item.dataset.id = art.id;

    const title = document.createElement("div");
    title.className = "academy-title";
    title.textContent = art.title;

    const tag = document.createElement("div");
    tag.className = "academy-tag";
    tag.textContent = art.tag;

    item.appendChild(title);
    item.appendChild(tag);

    item.addEventListener("click", () => openArticle(art.id));

    academyListEl.appendChild(item);
  });
}

function openArticle(id) {
  const art = academyArticles.find((a) => a.id === id);
  if (!art) return;
  academyTitleEl.textContent = art.title;
  academyTextEl.textContent = art.text;
  academyArticleBlock.style.display = "block";
}

renderAcademyList();

// === ИНСТРУМЕНТЫ ===

// 1) Калькулятор позиции
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

  calcResult.textContent = `Максимальный размер позиции ≈ ${positionSize.toFixed(
    2
  )} USDT (риск ${risk.toFixed(2)}% при стопе ${stop.toFixed(2)}%).`;
});

// 2) DCA
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

// 3) PnL
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

// 4) План сделки
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
    `• вход: ${entry}\n` +
    `• цель: ${target}\n` +
    `• стоп: ${stop}\n\n` +
    `Соотношение риск/прибыль ≈ ${rr.toFixed(
      2
    )}. Чем выше R:R, тем меньше сделок нужно, чтобы быть в плюсе.`;
});
