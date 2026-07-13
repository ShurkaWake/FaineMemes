import {
  chooseRandomMeme,
  getMemes,
  makeMemeCookie,
  parseCookies,
} from "../lib/memes.js";
import { renderErrorPage } from "../lib/page.js";

export default {
  async fetch(request) {
    try {
      const memes = await getMemes();
      const currentId = parseCookies(request.headers.get("cookie")).meme_id;
      const nextMeme = chooseRandomMeme(memes, currentId);

      return new Response(null, {
        status: 303,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          Location: "/",
          "Set-Cookie": makeMemeCookie(nextMeme.id, request.url),
        },
      });
    } catch (error) {
      return new Response(renderErrorPage(error), {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }
  },
};
