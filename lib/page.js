import { googleDriveImageUrl, youtubeEmbedUrl } from "./memes.js";

const DONATION_URL = "https://send.monobank.ua/jar/7t8JsafPMD";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function documentShell({ title, body }) {
  return `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f2ee84">
    <meta name="description" content="Випадковий мем та ідеально підібрана до нього пісня.">
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://drive.google.com">
    <link rel="preconnect" href="https://www.youtube-nocookie.com">
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>${body}</body>
</html>`;
}

export function renderMemePage(meme) {
  const imageUrl = googleDriveImageUrl(meme.driveUrl);
  const embedUrl = youtubeEmbedUrl(meme.musicUrl);
  const player = embedUrl
    ? `<iframe
          class="player"
          src="${escapeHtml(embedUrl)}"
          title="Програвач YouTube Music для мема ${escapeHtml(meme.id)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>`
    : `<a class="music-fallback" href="${escapeHtml(meme.musicUrl)}" target="_blank" rel="noopener noreferrer">
         Слухати цю пісню в YouTube Music
       </a>`;

  return documentShell({
    title: "Файні меми",
    body: `<main class="shell">
      <header class="masthead">
        <a class="brand" href="/" aria-label="Головна сторінка «Файні меми»">
          <span class="brand-mark" aria-hidden="true">☺</span>
          <span>Файні меми</span>
        </a>
        <span class="counter">Мем №${escapeHtml(meme.id)}</span>
      </header>

      <section class="meme-stage" aria-label="Твій мем">
        <img
          class="meme-image"
          src="${escapeHtml(imageUrl)}"
          alt="Випадковий мем номер ${escapeHtml(meme.id)}"
          referrerpolicy="no-referrer"
        >
      </section>

      <section class="soundtrack" aria-labelledby="soundtrack-title">
        <div class="soundtrack-heading">
          <span class="eyebrow">Саундтрек дня</span>
          <h1 id="soundtrack-title">Вмикай. Так смішніше.</h1>
        </div>
        ${player}
      </section>

      <nav class="actions" aria-label="Дії з мемом">
        <a class="button button-secondary" href="${escapeHtml(meme.driveUrl)}" target="_blank" rel="noopener noreferrer">
          Відкрити оригінал на Google Drive
        </a>
      </nav>

      <section class="donation" aria-labelledby="donation-title">
        <div class="donation-copy">
          <span class="eyebrow">Хочеш новий мем?</span>
          <p class="refresh-note" id="donation-title">
            Цей мем тут залишиться, доки ти не
            <a class="donation-link" href="${escapeHtml(DONATION_URL)}" target="_blank" rel="noopener noreferrer">задонатиш на новий</a>.
          </p>
          <p class="donation-hint">Тицяй на посилання або скануй QR-код.</p>
        </div>
        <a
          class="donation-qr-link"
          href="${escapeHtml(DONATION_URL)}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Задонатити на новий мем через monobank"
        >
          <img
            class="donation-qr"
            src="/donate-qr.png"
            width="512"
            height="512"
            alt="QR-код для донату на новий мем"
            loading="lazy"
          >
        </a>
      </section>
    </main>`,
  });
}

export function renderErrorPage(error) {
  return documentShell({
    title: "Файні меми — потрібне налаштування",
    body: `<main class="shell error-shell">
      <div class="error-card">
        <span class="eyebrow">Майже готово</span>
        <h1>Поличку з мемами треба трохи налаштувати.</h1>
        <p>${escapeHtml(error.message || "Не вдалося завантажити список мемів.")}</p>
        <p class="error-help">Опублікуй Google-таблицю у форматі CSV, а потім додай її URL як <code>GOOGLE_SHEET_CSV_URL</code> у Vercel.</p>
      </div>
    </main>`,
  });
}
