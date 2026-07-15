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

## Domain boundary

The legacy GitHub Pages custom-domain association and `CNAME` file for `dentsignal.me` were removed before the initial service-site merge. This repository is intended only for `https://niyam-paneru.github.io/`. Do not add a custom domain here or change the separate DentSignal DNS/Vercel deployment as part of service-site work.

## Content boundaries

- DentSignal is described only as an independent engineering project.
- No client, revenue, certification, clinic deployment, testimonial, or conversion claim is made.
- Both sample deliverables are conspicuously labeled synthetic.
- No analytics, form provider, cookies, or external JavaScript is used.
