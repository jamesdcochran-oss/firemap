# Fire Weather Dashboard (Ready-to-upload)

This repository is a self-contained, live-ready Fire Weather Dashboard built to run on GitHub Pages with a GitHub Actions job that fetches NASA FIRMS hotspot counts every 15 minutes.

Files included:
- index.html
- static/main.js
- scripts/build_data.py
- .github/workflows/fire-agent.yml
- docs/fire_data.json (sample)

Deployment (short):
1. Push these files to a new GitHub repo (main branch).
2. In repo Settings → Secrets → Actions add a secret named `FIRMS_KEY` (NASA FIRMS key). Optional: add `WINDY_KEY`.
3. Settings → Actions → General: set Workflow permissions to Read and write (or ensure workflow has `permissions: contents: write`).
4. Settings → Pages: Source -> main branch / docs folder.
5. Trigger the workflow (Actions → Fire Agent → Run workflow). After the Action runs, your site will be available at `https://OWNER.github.io/REPO/`.
