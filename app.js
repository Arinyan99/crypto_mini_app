// Telegram init
const tg = window.Telegram ? window.Telegram.WebApp : null;

document.addEventListener("DOMContentLoaded", () => {
  // Устанавливаем имя пользователя в правый чип
  if (tg) {
    tg.ready();
    const user = tg.initDataUnsafe?.user;
    const pill = document.getElementById("user-pill");
    if (user && pill) {
      const name = user.username
        ? `@${user.username}`
        : user.first_name || "Пользователь";
      pill.textContent = name;
    }
  }

  // Навигация между экранами
  const screens = {
    home: document.getElementById("screen-home"),
    overview: document.getElementById("screen-overview"),
    signals: document.getElementById("screen-signals"),
    academy: document.getElementById("screen-academy"),
    tools: document.getElementById("screen-tools"),
  };

  const navButtons = document.querySelectorAll(".nav-tab");
  const homeCards = document.querySelectorAll(".home-card");

  function openScreen(key) {
    Object.values(screens).forEach((el) => el.classList.remove("active"));
    if (screens[key]) screens[key].classList.add("active");

    navButtons.forEach((btn) => {
      if (btn.dataset.open === key) btn.classList.add("active");
      else btn.classList.remove("active");
    });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.open;
      openScreen(key);
    });
  });

  homeCards.forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.dataset.open;
      openScreen(key);
    });
  });

  // Стартовый экран
  openScreen("home");

  // Профиль трейдера
  const chips = document.querySelectorAll(".chip");
  const currentProfile = document.getElementById("current-profile");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      if (currentProfile) currentProfile.textContent = chip.textContent.trim();
    });
  });

  // Калькулятор риска
  const depInput = document.getElementById("dep-input");
  const riskInput = document.getElementById("risk-input");
  const riskBtn = document.getElementById("calc-risk");
  const riskResult = document.getElementById("risk-result");

  if (riskBtn) {
    riskBtn.addEventListener("click", () => {
      const dep = parseFloat(depInput.value);
      const risk = parseFloat(riskInput.value);
      if (!dep || !risk || dep <= 0 || risk <= 0) {
        riskResult.textContent = "Введи депозит и риск больше нуля.";
        return;
      }
      const loss = (dep * risk) / 100;
      riskResult.textContent = `Максимальный риск на сделку: ~${loss.toFixed(
        2
      )} USDT`;
    });
  }

  // Академия — текст уроков
  const lessons = document.querySelectorAll(".lesson-row");
  const lessonContent = document.getElementById("lesson-content");

  const lessonTexts = {
    basic:
      "📘 <b>Что такое криптовалюта</b><br><br>Цифровые деньги в блокчейне, без банка посредника. Все переводы фиксируются в цепочке блоков и не могут быть задним числом изменены.",
    risk:
      "⚠️ <b>Риски и как не слить депозит</b><br><br>Не заходи all-in, ставь стоп-лосс, не торгуй на эмоциях и используй только свободные деньги.",
    wallets:
      "👛 <b>Биржи и кошельки</b><br><br>Биржа — для торговли, кошелёк — для хранения. Главное правило: Not your keys — not your coins.",
  };

  lessons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.lesson;
      if (!lessonContent) return;
      lessonContent.innerHTML =
        '<p class="muted small">' + (lessonTexts[key] || "") + "</p>";
    });
  });

  // Премиум — кнопки оплаты
  function openPremium() {
    const premiumLink = "https://t.me/crypto_ai_bot?start=subscribe"; // <-- если надо, поменяй на свой deep-link

    if (tg) {
      tg.openTelegramLink(premiumLink);
    } else {
      window.open(premiumLink, "_blank");
    }
  }

  const premiumButtons = [
    "buy-premium-main",
    "buy-premium-overview",
    "buy-premium-signals",
  ];

  premiumButtons.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", openPremium);
  });

  // Переключение темы (внутри мини-апки, не телеграма)
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("light-theme");
      themeToggle.textContent = document.body.classList.contains("light-theme")
        ? "☀️"
        : "🌙";
    });
  }
});
