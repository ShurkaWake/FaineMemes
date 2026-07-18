const DEFAULT_CACHE_TTL_MS = 60_000;

let cache = {
  key: "",
  memes: null,
  expiresAt: 0,
};

export function parseCsv(csv) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];

    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (character !== "\r") {
      value += character;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findColumn(headers, acceptedNames) {
  return headers.findIndex((header) => acceptedNames.includes(header));
}

function requireHttpUrl(value, label, rowNumber) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Unsupported URL protocol");
    }
  } catch {
    throw new Error(`У рядку ${rowNumber} некоректне посилання на ${label}.`);
  }
}

export function rowsToMemes(rows) {
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);
  const idColumn = findColumn(headers, ["id"]);
  const memeColumn = findColumn(headers, [
    "link to meme",
    "meme link",
    "meme",
    "image",
    "image link",
  ]);
  const musicColumn = findColumn(headers, [
    "youtube music link",
    "music link",
    "youtube link",
    "song",
    "song link",
  ]);
  const ownerColumn = findColumn(headers, [
    "owner",
    "author",
    "author link",
    "owner link",
  ]);

  if (idColumn === -1 || memeColumn === -1 || musicColumn === -1 || ownerColumn === -1) {
    throw new Error(
      'У таблиці мають бути колонки "id", "link to meme", "youtube music link" та "owner".',
    );
  }

  const seenIds = new Set();
  const memes = [];

  for (const [rowIndex, row] of rows.slice(1).entries()) {
    const rowNumber = rowIndex + 2;
    const id = row[idColumn]?.trim();
    const driveUrl = row[memeColumn]?.trim();
    const musicUrl = row[musicColumn]?.trim();
    const ownerUrl = row[ownerColumn]?.trim();

    if (!id || !driveUrl || !musicUrl || !ownerUrl) {
      continue;
    }

    requireHttpUrl(driveUrl, "мем", rowNumber);
    requireHttpUrl(musicUrl, "музику", rowNumber);
    requireHttpUrl(ownerUrl, "автора", rowNumber);

    if (seenIds.has(id)) {
      throw new Error(`У таблиці повторюється id мема "${id}".`);
    }

    seenIds.add(id);
    memes.push({ id, driveUrl, musicUrl, ownerUrl });
  }

  return memes;
}

export function getSheetCsvUrl(env = process.env) {
  if (env.GOOGLE_SHEET_CSV_URL) {
    return env.GOOGLE_SHEET_CSV_URL;
  }

  if (env.GOOGLE_SHEET_ID) {
    const sheetId = encodeURIComponent(env.GOOGLE_SHEET_ID);
    const gid = encodeURIComponent(env.GOOGLE_SHEET_GID || "0");
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }

  throw new Error(
    "Додай GOOGLE_SHEET_CSV_URL (або GOOGLE_SHEET_ID) до змінних середовища у Vercel.",
  );
}

export async function getMemes() {
  const url = getSheetCsvUrl();
  const now = Date.now();

  if (cache.key === url && cache.memes && cache.expiresAt > now) {
    return cache.memes;
  }

  const response = await fetch(url, {
    headers: { Accept: "text/csv" },
  });

  if (!response.ok) {
    throw new Error(`Google Таблиці повернули помилку ${response.status}. Переконайся, що таблиця загальнодоступна.`);
  }

  const memes = rowsToMemes(parseCsv(await response.text()));

  if (memes.length === 0) {
    throw new Error("У Google-таблиці ще немає жодного заповненого рядка з мемом.");
  }

  const configuredTtl = Number(process.env.SHEET_CACHE_TTL_MS);
  const ttl = Number.isFinite(configuredTtl) && configuredTtl >= 0
    ? configuredTtl
    : DEFAULT_CACHE_TTL_MS;

  cache = {
    key: url,
    memes,
    expiresAt: now + ttl,
  };

  return memes;
}

export function resetMemeCache() {
  cache = { key: "", memes: null, expiresAt: 0 };
}

export function chooseRandomMeme(memes, excludedId, random = Math.random) {
  const candidates = memes.length > 1
    ? memes.filter((meme) => meme.id !== excludedId)
    : memes;

  return candidates[Math.floor(random() * candidates.length)];
}

export function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    String(cookieHeader ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        const name = separator === -1 ? part : part.slice(0, separator);
        const value = separator === -1 ? "" : part.slice(separator + 1);

        try {
          return [name, decodeURIComponent(value)];
        } catch {
          return [name, value];
        }
      }),
  );
}

export function makeMemeCookie(memeId, requestUrl) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `meme_id=${encodeURIComponent(memeId)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`;
}

function driveFileId(url) {
  try {
    const parsed = new URL(url);
    const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    return pathMatch?.[1] || parsed.searchParams.get("id");
  } catch {
    return null;
  }
}

export function googleDriveImageUrl(url) {
  const fileId = driveFileId(url);
  return fileId
    ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`
    : url;
}

export function youtubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId = null;

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0];
    } else if (
      host === "youtube.com" ||
      host === "music.youtube.com" ||
      host === "m.youtube.com"
    ) {
      videoId = parsed.searchParams.get("v");

      if (!videoId) {
        const pathMatch = parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/);
        videoId = pathMatch?.[1] || null;
      }
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`;
  } catch {
    return null;
  }
}
