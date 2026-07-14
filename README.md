# Niyam Paneru — focused engineering sprints

Static service website for Niyam Paneru. It uses semantic HTML, one CSS file, and a small progressive-enhancement script so it can be deployed directly with GitHub Pages.

## Local preview

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/`.

## Checks

```bash
node scripts/check-site.mjs
node --check assets/script.js
npx cspell "*.html" "README.md" "samples/*.md"
```

The GitHub Pages workflow deploys the repository root after a push to `main`.

## Important custom-domain note

The base branch contained a `CNAME` file pointing the username repository at `dentsignal.me`, which is already serving the separate DentSignal site. This branch removes that file so the service site is designed for the standard `https://niyam-paneru.github.io/` address. Do not merge until the repository Pages settings and the existing `dentsignal.me` DNS/Vercel binding have been reviewed. Opening this pull request does not alter the current deployment.

## Content boundaries

- DentSignal is described only as an independent engineering project.
- No client, revenue, certification, clinic deployment, testimonial, or conversion claim is made.
- Both sample deliverables are conspicuously labeled synthetic.
- No analytics, form provider, cookies, or external JavaScript is used.
