# Awesome Japanese — website code (`homepage` branch)

This branch holds **only the website machinery** for the Awesome Japanese site:

- `site/` — the homepage theme, the build script (`build.mjs`) that turns
  `readme.md` (from `master`) into the themed `index.html`, and `share.js`
  (the share widget).
- `package.json` / `package-lock.json`, `robots.txt`, `.nojekyll`.

The interactive Japanese TV guide moved to its own repository
([`japantvapp`](https://github.com/yudataguy/japantvapp) → <https://japantv.app>);
it is no longer part of this site.

**Do not edit learning content here.** The curated lists live on the
[`master`](https://github.com/yudataguy/Awesome-Japanese/tree/master) branch
(`readme.md`, …). The `Deploy site` GitHub Action on `master` builds and
publishes the site from `master`'s content plus the theme on this branch, so
`master` stays clean for readers.

To change the look, edit files on this branch, then run the
**Deploy site** workflow (Actions tab → Run workflow).
