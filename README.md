# Niyam Paneru — technical repair and implementation sprints

Static service website for Niyam Paneru. It leads with web-app, API/backend, deployment, workflow-reliability and small-build services. Voice Agent QA is a secondary specialist lane. The site uses semantic HTML, one CSS file and a small progressive-enhancement script so it can be deployed directly with GitHub Pages.

## Local preview

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/`.

## Checks

```bash
node scripts/check-site.mjs
node --check assets/script.js
npx cspell "*.html" "*.md" "samples/*.md"
```

The GitHub Pages workflow deploys the repository root after a push to `main`.

## Domain boundary

The legacy GitHub Pages custom-domain association and `CNAME` file for `dentsignal.me` were removed before the initial service-site merge. This repository is intended only for `https://niyam-paneru.github.io/` until the documented account migration. Do not add a custom domain here or change the separate DentSignal DNS/Vercel deployment as part of service-site work.

## Second-account migration

Read [`MIGRATION.md`](MIGRATION.md) before copying the repository. It documents the exact repository name, personal-account collaborator limitation, base-URL replacement, Pages setup, verification and rollback steps.

Preview the URL replacement only after substituting the real second username:

```bash
node scripts/replace-base-url.mjs SECOND_USERNAME --check
```

The literal placeholder intentionally fails validation. Replace it with the real GitHub username first.

## Content boundaries

- DentSignal is described only as an independent engineering project.
- No client, revenue, certification, clinic deployment, testimonial, or conversion claim is made.
- All four sample deliverables are conspicuously labeled synthetic.
- No analytics, form provider, cookies, or external JavaScript is used.
