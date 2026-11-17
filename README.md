# Nevaeh · GCSE Revision 💗

A pink GCSE revision site with every topic for AQA Maths (Higher), Edexcel English Language & Literature, Edexcel Combined Science (Higher), OCR Geography A (J383) and Eduqas Sociology (C200QS). It has videos for every topic, Maths Genie and Plumi question sets, a day-by-day mixed revision plan, past papers with mark schemes, a built-in PDF editor, and private GitHub Gist syncing across devices.

There is no build step. GitHub Pages can serve `index.html` and `files/` directly. The optional Node server can also serve the same site.

## Run locally

Requires Node 18 or newer:

```text
node server.js
```

Then open `http://localhost:3000`.

## Deploy with persistent saving

Publish the repository with GitHub Pages. On the site, click **☁️ Sync**, create a GitHub token with only the `gist` permission, and connect it. The site creates a private `nevaeh-revision-sync` Gist and automatically saves to it.

## Past papers in the editor
On Windows, run `tools/Get GCSE papers.bat`. It downloads every paper, mark scheme and Maths Genie sheet into a `gcse-papers` folder. On the site, go to **Exams & papers → Import papers folder** and pick that folder. Every ✏️ button then opens the paper in the PDF editor, and your writing saves automatically.

## Syncing between devices
Click **☁️ Sync**, connect a GitHub token, then use the same token on another browser or device. Completed topics, daily question tasks, quiz scores, paper scores, plans and PDF annotations sync automatically.

Imported PDF files themselves stay on each device because they are large. Import the papers folder once on each device; the annotations sync through the private Gist.

This site stores its progress separately from Kenz's site, even if both are hosted on the same GitHub account.
