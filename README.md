# Nevaeh · GCSE Revision 💗

A pink GCSE revision site with every topic for AQA Maths (Higher), Edexcel English Language & Literature, Edexcel Combined Science (Higher), OCR Geography A (J383) and Eduqas Sociology (C200QS). It has videos for every topic, Maths Genie question sets, a weekly plan up to the exams, past papers with mark schemes, a built-in PDF editor, and normal accounts for cross-device saving.

There is no build step. The Node server serves `index.html` and `files/`, and provides the account/sync API.

## Run locally

Requires Node 18 or newer:

```text
node server.js
```

Then open `http://localhost:3000`.

## Deploy with persistent saving

Deploy this repository as a Node web service with start command `node server.js`.

- **Render free tier:** create a free Upstash Redis database and add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to the service environment.
- **Railway/VPS:** attach a persistent volume at `/data` and set `DATA_DIR=/data`.

GitHub Pages still works as a device-only fallback, but it cannot run `server.js`; account sync requires the Node-hosted URL.

## Past papers in the editor
On Windows, run `tools/Get GCSE papers.bat`. It downloads every paper, mark scheme and Maths Genie sheet into a `gcse-papers` folder. On the site, go to **Exams & papers → Import papers folder** and pick that folder. Every ✏️ button then opens the paper in the PDF editor, and your writing saves automatically.

## Syncing between devices
Click **☁️ Sync**, create an account, then sign in with the same username and password on another browser or device. Completed topics, quiz scores, paper scores, plans and PDF annotations sync automatically.

Imported PDF files themselves stay on each device because they are large. Import the papers folder once on each device; the annotations sync through the account.

This site stores its progress separately from Kenz's site, even if both are hosted on the same GitHub account.
