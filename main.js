/**************************************************
 * DOM 準備できたら全部初期化
 **************************************************/
document.addEventListener("DOMContentLoaded", () => {
  initBurgerMenu();
  initNoteFeed();
  initHeaderReveal();
  initHeroIntro();
  initBreezeMotion();
});

/**************************************************
 * ハンバーガーメニュー
 **************************************************/
function initBurgerMenu() {
  const burger  = document.getElementById("burgerBtn");
  const nav     = document.getElementById("globalNav");
  const overlay = document.getElementById("navOverlay");

  // 要素がなければ何もしない（PCだけの時のエラー防止）
  if (!burger || !nav || !overlay) return;

  burger.addEventListener("click", () => {
    const isActive = burger.classList.toggle("active");
    nav.classList.toggle("active", isActive);
    overlay.classList.toggle("active", isActive);

    // ARIA（アクセシビリティ）更新
    burger.setAttribute("aria-expanded", isActive ? "true" : "false");
  });

  overlay.addEventListener("click", () => {
    burger.classList.remove("active");
    nav.classList.remove("active");
    overlay.classList.remove("active");
    burger.setAttribute("aria-expanded", "false");
  });

  // SP 用ナビのリンクをクリックしたらメニューを閉じる
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      burger.classList.remove("active");
      nav.classList.remove("active");
      overlay.classList.remove("active");
      burger.setAttribute("aria-expanded", "false");
    });
  });
}

/**************************************************
 * ヒーローを通過したらヘッダーを表示
 **************************************************/
function initHeaderReveal() {
  const header = document.querySelector(".site-header");
  const hero = document.querySelector(".hero");

  if (!header || !hero) return;

  const toggleHeader = () => {
    const heroBottom = hero.getBoundingClientRect().bottom;
    const shouldShow = heroBottom <= 0;

    header.classList.toggle("site-header--visible", shouldShow);
    header.classList.toggle("site-header--prefade", !shouldShow);
  };

  toggleHeader();

  window.addEventListener("scroll", toggleHeader, { passive: true });
  window.addEventListener("resize", toggleHeader);
}

/**************************************************
 * ヒーロー ローディング演出
 **************************************************/
function initHeroIntro() {
  const hero = document.querySelector(".hero");

  if (!hero) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hasPlayed =
    document.documentElement.classList.contains("is-hero-intro-done") ||
    sessionStorage.getItem("heroIntroPlayed") === "1";

  const setFinalState = () => {
    hero.classList.add("hero--text-visible", "hero--bg-visible", "hero--final");
    document.body.classList.add("is-hero-done");
    document.documentElement.classList.add("is-hero-intro-done");
  };

  if (prefersReducedMotion.matches || hasPlayed) {
    setFinalState();
    sessionStorage.setItem("heroIntroPlayed", "1");
    return;
  }

  document.body.classList.add("is-hero-animating");

  const TEXT_DELAY = 120; // ms
  const HOLD_DURATION = 1100;
  const BG_REVEAL_DURATION = 1000;

  requestAnimationFrame(() => {
    setTimeout(() => {
      hero.classList.add("hero--text-visible");
    }, TEXT_DELAY);

    setTimeout(() => {
      hero.classList.add("hero--bg-visible");
    }, TEXT_DELAY + HOLD_DURATION);

    setTimeout(() => {
      hero.classList.add("hero--final");
      document.body.classList.remove("is-hero-animating");
      document.body.classList.add("is-hero-done");
      sessionStorage.setItem("heroIntroPlayed", "1");
      document.documentElement.classList.add("is-hero-intro-done");
    }, TEXT_DELAY + HOLD_DURATION + BG_REVEAL_DURATION);
  });
}

/**************************************************
 * note 最新3件取得＆描画
 *  - note-rss.php 経由で公式 note の RSS を取得する前提
 **************************************************/
async function initNoteFeed() {
  const container = document.getElementById("note-list");
  if (!container) return;

  // ★ ここがポイント：ブラウザから note.com 直ではなく
  //    同じディレクトリに置いた PHP を叩く
  const RSS_ENDPOINT = "note-rss.php";

  try {
    const response = await fetch(RSS_ENDPOINT);

    if (!response.ok) {
      console.error("note RSS の取得に失敗しました:", response.status);
      container.innerHTML =
        `<p class="text-small">現在、記事を取得できません。</p>`;
      return;
    }

    const rssText = await response.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(rssText, "application/xml");

    const items = Array.from(xml.querySelectorAll("item")).slice(0, 3);

    container.innerHTML = "";

    if (items.length === 0) {
      container.innerHTML =
        `<p class="text-small">まだ記事がありません。</p>`;
      return;
    }

    items.forEach((item, index) => {
      const title = item.querySelector("title")?.textContent ?? "タイトル未設定";
      const link = item.querySelector("link")?.textContent ?? "#";
      const pubDateRaw = item.querySelector("pubDate")?.textContent ?? "";
      const description = item.querySelector("description")?.textContent ?? "";

      const pubDate = formatNoteDate(pubDateRaw);
      const excerpt = truncateText(stripHtml(description), 80);
      const isLatest = index === 0;

      const card = document.createElement("article");
      card.className = "note-card" + (isLatest ? " note-card--latest" : "");

      card.innerHTML = `
       <div class="note-card__top">
          <span class="note-card__date-tag">
            <span class="note-card__date-icon">📅</span>${pubDate}
          </span>
          ${
            isLatest
              ? '<span class="note-card__badge note-card__badge--new">NEW</span>'
              : ""
          }
        </div>
        <h3 class="note-card__title heading-ja">
          <a class="note-card__title-link" href="${link}" target="_blank" rel="noopener noreferrer">
            ${title}
          </a>
        </h3>
        <p class="note-card__excerpt text-small">${excerpt}</p>
      `;

      container.appendChild(card);
    });

  } catch (error) {
    console.error("note RSS 読み込み中にエラー:", error);
    container.innerHTML =
      `<p class="text-small">現在、記事を取得できません。</p>`;
  }
}

/**************************************************
 * ユーティリティ関数群
 **************************************************/

// pubDate → 「2025年11月30日」形式に
function formatNoteDate(pubDateString) {
  if (!pubDateString) return "";
  const date = new Date(pubDateString);
  if (isNaN(date.getTime())) return "";

  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}年${m}月${d}日`;
}

// HTMLタグをざっくり除去
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// 長文カットして「…」をつける
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

/**************************************************
 * Copy section breeze motion
 **************************************************/
function initBreezeMotion() {
  const copySection = document.querySelector(".copy");
  if (!copySection) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (prefersReduced.matches) return;

  const baseSpeed = 1;
  const maxSpeed = 1.35;
  const easing = 0.08;
  const decay = 0.04;
  let targetSpeed = baseSpeed;
  let currentSpeed = baseSpeed;

  const onScroll = () => {
    targetSpeed = maxSpeed;
  };

  window.addEventListener("scroll", onScroll, { passive: true });

  const tick = () => {
    currentSpeed += (targetSpeed - currentSpeed) * easing;
    targetSpeed += (baseSpeed - targetSpeed) * decay;

    copySection.style.setProperty("--breeze-speed", currentSpeed.toFixed(3));
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
