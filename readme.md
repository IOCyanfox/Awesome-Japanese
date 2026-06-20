# Awesome Japanese — website code (`homepage` branch)

This branch holds **only the website machinery** for the Awesome Japanese site:

- `site/` — the homepage theme and the build script (`build.mjs`) that turns
  `readme.md` (from `master`) into the themed `index.html`.
- `tv/` — the interactive Japanese TV guide app (served at `/tv/`).
- `package.json` / `package-lock.json`, `robots.txt`, `.nojekyll`.

**Do not edit learning content here.** The curated lists live on the
[`master`](https://github.com/yudataguy/Awesome-Japanese/tree/master) branch
(`readme.md`, `tv.md`, …). The `Deploy site` GitHub Action on `master` builds and
publishes the site from `master`'s content plus the theme/app on this branch, so
`master` stays clean for readers.

To change the look or the TV app, edit files on this branch, then run the
**Deploy site** workflow (Actions tab → Run workflow).
