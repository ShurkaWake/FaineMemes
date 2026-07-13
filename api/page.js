import {
  chooseRandomMeme,
  getMemes,
  makeMemeCookie,
  parseCookies,
} from "../lib/memes.js";
import { renderErrorPage, renderMemePage } from "../lib/page.js";

export default {
  async fetch(request) {
    try {
      const memes = await getMemes();
      const cookies = parseCookies(request.headers.get("cookie"));
      let meme = memes.find((item) => item.id === cookies.meme_id);
      const headers = new Headers({
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Type": "text/html; charset=utf-8",
      });

      if (!meme) {
        meme = chooseRandomMeme(memes);
        headers.set("Set-Cookie", makeMemeCookie(meme.id, request.url));
      }

      return new Response(renderMemePage(meme), { status: 200, headers });
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
