# Faine Memes

A dependency-free Vercel app that pairs a random Google Drive meme with a YouTube Music track.

## Google Sheet format

The first row must contain these headers:

| id | link to meme | youtube music link |
| --- | --- | --- |
| 1 | `https://drive.google.com/file/d/.../view` | `https://music.youtube.com/watch?v=...` |

Each completed row needs all three values, and each `id` must be unique. Incomplete rows are ignored, so you can safely add a new meme while the site is live. Share every Drive image so that anyone with the link can view it.

In Google Sheets, use **File → Share → Publish to web**, select the correct tab and choose **Comma-separated values (.csv)**. Copy that URL.

## Run locally

1. Copy `.env.example` to `.env` or `.env.local` and add the published CSV URL.
2. Load the variables in your shell, then run:

   ```powershell
   $env:GOOGLE_SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/YOUR_ID/export?format=csv&gid=0"
   npm run dev
   ```

3. Open `http://localhost:3001`.

Port `3001` is the local default. Set the `PORT` environment variable if you need a different one.

The home page never chooses a meme by itself. Without a valid meme cookie it shows the donation prompt. Visiting `/new` chooses a meme, stores its ID in an HTTP-only cookie, and redirects to `/`; refreshing `/` then keeps that meme.

## Deploy to Vercel

1. Import this folder or its Git repository into Vercel.
2. Add `GOOGLE_SHEET_CSV_URL` in **Project Settings → Environment Variables**.
3. Deploy. There is no build command and no framework preset required.

Vercel automatically serves the JavaScript files in `api/` as Node.js functions. `vercel.json` maps `/` and `/new` to those functions.

## Tests

```powershell
npm test
```
