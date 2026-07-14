import {
  getMemes,
  parseCookies,
} from "../lib/memes.js";
import { renderEmptyPage, renderErrorPage, renderMemePage } from "../lib/page.js";

export default {
  async fetch(request) {
    try {
      const cookies = parseCookies(request.headers.get("cookie"));
      const headers = new Headers({
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Type": "text/html; charset=utf-8",
      });

      if (!cookies.meme_id) {
        return new Response(renderEmptyPage(), { status: 200, headers });
      }

      const memes = await getMemes();
      const meme = memes.find((item) => item.id === cookies.meme_id);

      return new Response(meme ? renderMemePage(meme) : renderEmptyPage(), {
        status: 200,
        headers,
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
