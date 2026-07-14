import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import pageHandler from "../api/page.js";
import newHandler from "../api/new.js";
import {
  chooseRandomMeme,
  googleDriveImageUrl,
  parseCsv,
  resetMemeCache,
  rowsToMemes,
  youtubeEmbedUrl,
} from "../lib/memes.js";

const csv = `id,link to meme,youtube music link
one,https://drive.google.com/file/d/abc123/view,https://music.youtube.com/watch?v=dQw4w9WgXcQ
two,"https://drive.google.com/open?id=def456","https://youtu.be/aqz-KE-bpKQ"`;

test("parses the requested sheet columns", () => {
  const memes = rowsToMemes(parseCsv(csv));
  assert.equal(memes.length, 2);
  assert.deepEqual(memes[0], {
    id: "one",
    driveUrl: "https://drive.google.com/file/d/abc123/view",
    musicUrl: "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
  });
});

test("ignores incomplete rows while the sheet is being edited", () => {
  const inProgressCsv = `id,link to meme,youtube music link
one,https://drive.google.com/file/d/abc123/view,https://music.youtube.com/watch?v=dQw4w9WgXcQ
two,https://drive.google.com/file/d/unfinished/view,
three,,https://music.youtube.com/watch?v=aqz-KE-bpKQ
,https://drive.google.com/file/d/no-id/view,https://music.youtube.com/watch?v=aqz-KE-bpKQ
four,https://drive.google.com/file/d/finished/view,https://youtu.be/aqz-KE-bpKQ`;

  assert.deepEqual(
    rowsToMemes(parseCsv(inProgressCsv)).map((meme) => meme.id),
    ["one", "four"],
  );
});

test("converts Google Drive and YouTube Music links", () => {
  assert.equal(
    googleDriveImageUrl("https://drive.google.com/file/d/abc123/view?usp=sharing"),
    "https://drive.google.com/thumbnail?id=abc123&sz=w1600",
  );
  assert.equal(
    youtubeEmbedUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=hello"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
  );
});

test("includes a local PNG for the donation QR code", async () => {
  const png = await readFile(new URL("../public/donate-qr.png", import.meta.url));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});

test("chooses a different meme when possible", () => {
  const memes = rowsToMemes(parseCsv(csv));
  assert.equal(chooseRandomMeme(memes, "one", () => 0).id, "two");
});

test("rejects unsafe links from the sheet", () => {
  const unsafeCsv = `id,link to meme,youtube music link
one,javascript:alert(1),https://music.youtube.com/watch?v=dQw4w9WgXcQ`;
  assert.throws(() => rowsToMemes(parseCsv(unsafeCsv)), /некоректне посилання на мем/);
});

test("only /new chooses a meme and the page preserves it", async (context) => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.GOOGLE_SHEET_CSV_URL;
  const originalTtl = process.env.SHEET_CACHE_TTL_MS;

  context.after(() => {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) {
      delete process.env.GOOGLE_SHEET_CSV_URL;
    } else {
      process.env.GOOGLE_SHEET_CSV_URL = originalUrl;
    }
    if (originalTtl === undefined) {
      delete process.env.SHEET_CACHE_TTL_MS;
    } else {
      process.env.SHEET_CACHE_TTL_MS = originalTtl;
    }
    resetMemeCache();
  });

  process.env.GOOGLE_SHEET_CSV_URL = "https://example.test/memes.csv";
  process.env.SHEET_CACHE_TTL_MS = "60000";
  let sheetFetches = 0;
  globalThis.fetch = async () => {
    sheetFetches += 1;
    return new Response(csv, { status: 200 });
  };
  resetMemeCache();

  const empty = await pageHandler.fetch(new Request("https://memes.test/"));
  assert.equal(empty.status, 200);
  assert.equal(empty.headers.get("set-cookie"), null);
  assert.equal(sheetFetches, 0);
  const emptyHtml = await empty.text();
  assert.match(emptyHtml, /Твій мем трошки соромиться/);
  assert.match(
    emptyHtml,
    /href="https:\/\/send\.monobank\.ua\/jar\/7t8JsafPMD"[^>]*>задонатити<\/a>/,
  );
  assert.doesNotMatch(emptyHtml, /Мем №/);

  const stale = await pageHandler.fetch(
    new Request("https://memes.test/", { headers: { cookie: "meme_id=missing" } }),
  );
  assert.equal(stale.headers.get("set-cookie"), null);
  assert.match(await stale.text(), /Твій мем трошки соромиться/);
  assert.equal(sheetFetches, 1);

  const first = await newHandler.fetch(new Request("https://memes.test/new"));
  assert.equal(first.status, 303);
  assert.equal(first.headers.get("location"), "/");
  const firstCookie = first.headers.get("set-cookie");
  assert.match(firstCookie, /^meme_id=(one|two);/);
  assert.equal(sheetFetches, 1);

  const cookiePair = firstCookie.split(";", 1)[0];
  const selectedId = decodeURIComponent(cookiePair.split("=")[1]);
  const refreshed = await pageHandler.fetch(
    new Request("https://memes.test/", { headers: { cookie: cookiePair } }),
  );
  assert.equal(refreshed.headers.get("set-cookie"), null);
  const refreshedHtml = await refreshed.text();
  assert.match(refreshedHtml, new RegExp(`Мем №${selectedId}`));
  assert.match(
    refreshedHtml,
    /href="https:\/\/send\.monobank\.ua\/jar\/7t8JsafPMD"[^>]*>задонатиш на новий<\/a>/,
  );
  assert.match(
    refreshedHtml,
    /class="donation-qr"\s+src="\/donate-qr\.png"/,
  );
  assert.doesNotMatch(refreshedHtml, /send\.monobank\.ua\/widget\.html|<iframe[^>]+donation/);
  assert.doesNotMatch(refreshedHtml, /Покажи інший/);

  const next = await newHandler.fetch(
    new Request("https://memes.test/new", { headers: { cookie: cookiePair } }),
  );
  assert.equal(next.status, 303);
  assert.equal(next.headers.get("location"), "/");
  assert.doesNotMatch(next.headers.get("set-cookie"), new RegExp(`meme_id=${selectedId};`));
});
