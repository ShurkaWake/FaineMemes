import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import pageHandler from "./api/page.js";
import newHandler from "./api/new.js";

const port = Number(process.env.PORT || 3001);

function requestUrl(request) {
  const host = request.headers.host || `localhost:${port}`;
  return `http://${host}${request.url}`;
}

async function sendNodeResponse(nodeResponse, webResponse) {
  nodeResponse.statusCode = webResponse.status;
  webResponse.headers.forEach((value, name) => {
    nodeResponse.setHeader(name, value);
  });

  const body = Buffer.from(await webResponse.arrayBuffer());
  nodeResponse.end(body);
}

const server = createServer(async (request, response) => {
  const url = new URL(requestUrl(request));

  try {
    if (url.pathname === "/styles.css") {
      response.setHeader("Content-Type", "text/css; charset=utf-8");
      response.end(await readFile(new URL("./public/styles.css", import.meta.url)));
      return;
    }

    if (url.pathname === "/donate-qr.png") {
      response.setHeader("Content-Type", "image/png");
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      response.end(await readFile(new URL("./public/donate-qr.png", import.meta.url)));
      return;
    }

    if (url.pathname === "/favicon.ico") {
      response.statusCode = 204;
      response.end();
      return;
    }

    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) {
        value.forEach((item) => headers.append(name, item));
      } else if (value !== undefined) {
        headers.set(name, value);
      }
    }

    const webRequest = new Request(url, {
      method: request.method,
      headers,
    });

    if (url.pathname === "/" || url.pathname === "/api/page") {
      await sendNodeResponse(response, await pageHandler.fetch(webRequest));
      return;
    }

    if (url.pathname === "/new" || url.pathname === "/api/new") {
      await sendNodeResponse(response, await newHandler.fetch(webRequest));
      return;
    }

    response.statusCode = 404;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end("Not found");
  } catch (error) {
    response.statusCode = 500;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end(error instanceof Error ? error.message : "Unexpected error");
  }
});

server.listen(port, () => {
  console.log(`Faine Memes is running at http://localhost:${port}`);
});
