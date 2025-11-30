/**************************************************
 * DOM 準備できたら全部初期化
 **************************************************/
document.addEventListener("DOMContentLoaded", () => {
  initBurgerMenu();
  initNoteFeed();
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
      const isFeatured = index === 0;

      const card = document.createElement("article");
      card.className = "note-card" + (isFeatured ? " note-card--featured" : "");

      card.innerHTML = `
        <p class="note-card__date text-small">${pubDate}</p>
        <h3 class="note-card__title heading-ja">
          <a href="${link}" target="_blank" rel="noopener noreferrer">
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
