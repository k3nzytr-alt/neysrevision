# Nevaeh · GCSE Revision 💗

A pink GCSE revision site with every topic for AQA Maths (Higher), Edexcel English Language & Literature, Edexcel Combined Science (Higher), OCR Geography A (J383) and Eduqas Sociology (C200QS). It has videos for every topic, Maths Genie question sets, a weekly plan up to the exams, past papers with mark schemes, and a built-in PDF editor.

It's one static page (`index.html`) plus `files/`. There's no build step.

## Hosting (GitHub Pages)
1. Create a repo and upload everything in this folder.
2. Go to Settings → Pages → Deploy from a branch → `main` / `(root)`.
3. Open `https://<username>.github.io/<repo-name>/`.

## Past papers in the editor
On Windows, run `tools/Get GCSE papers.bat`. It downloads every paper, mark scheme and Maths Genie sheet into a `gcse-papers` folder. On the site, go to **Exams & papers → Import papers folder** and pick that folder. Every ✏️ button then opens the paper in the PDF editor, and your writing saves automatically.

## Syncing between devices
Click **☁️ Sync** and paste a GitHub token that has only the `gist` box ticked. Your progress is kept in a private Gist (`nevaeh-revision-sync`). To set up another device, use **📱 Link another device**.

This site stores its progress separately from Kenz's site, even if both are hosted on the same GitHub account.
