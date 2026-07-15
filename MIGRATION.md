# Friday migration to the second GitHub account

This package copies the reviewed static service site to a second personal GitHub account without changing DentSignal, DNS, Vercel, Azure or the locked account's Pages settings.

Replace every literal `SECOND_USERNAME` below with the exact second-account username. Do not guess it. GitHub usernames cannot contain underscores, so the placeholder itself is not a valid final value.

## Important access limitation

A repository owned by a personal GitHub account has only two access levels: owner and collaborator. A collaborator can pull and push, but cannot be granted the organization-only **Admin** repository role. Therefore:

- `SECOND_USERNAME` must perform the one-time repository settings and Pages-source steps while signed in as the repository owner;
- `Niyam-Paneru` can be added as a collaborator for code, branches and pull requests;
- if true delegated Admin access is mandatory, use an organization-owned repository instead—but that changes the account/URL design and should not be improvised during this migration.

## URL inventory

The base URL must change from:

```text
https://niyam-paneru.github.io
```

to:

```text
https://SECOND_USERNAME.github.io
```

The replacement script updates canonical URLs, Open Graph page URLs, Open Graph image URLs, README references and this migration document. Current base-URL occurrences are intentionally located in:

- `index.html`
- `case-study-dentsignal.html`
- `sample-web-app-launch-blocker.html`
- `sample-fastapi-api-repair.html`
- `sample-workflow-reliability.html`
- `sample-voice-agent-qa.html`
- `voice-agent-qa.html`
- `README.md`
- `MIGRATION.md`

Do **not** automatically replace:

- `https://dentsignal.me/` — separate DentSignal production site;
- `https://github.com/Niyam-Paneru` — existing engineering profile and repository evidence;
- `niyampaneru79@gmail.com` — confirmed public professional contact;
- any source URL in the private prospect system.

After the new site is live, the proof links in the private `Give-Me-Money/client-acquisition/` proposal files must be changed separately to the verified new base URL.

## 1. Create the destination repository

While signed in as `SECOND_USERNAME`:

1. Open GitHub → **New repository**.
2. Set **Repository name** to exactly `SECOND_USERNAME.github.io`.
3. Set visibility to **Public**.
4. Leave **Add a README**, `.gitignore`, license and template unchecked so the repository is empty.
5. Create the repository.
6. Do not add a custom domain or `CNAME` file.

The username repository name is required for the root URL `https://SECOND_USERNAME.github.io/`.

## 2. Add the current account as collaborator

Still signed in as `SECOND_USERNAME`:

1. Open `SECOND_USERNAME/SECOND_USERNAME.github.io` → **Settings**.
2. Open **Collaborators** or **Collaborators and teams** under Access.
3. Select **Add people** and enter `Niyam-Paneru` exactly.
4. Confirm the invitation.
5. Sign in to `Niyam-Paneru`, open the GitHub notification or invitation URL and accept it.
6. Return to the repository and confirm `Niyam-Paneru` appears as a collaborator.

Personal repositories do not provide an Admin role selector for this collaborator. Use the second-account owner for Settings and Pages administration.

## 3. Copy the reviewed repository and preserve history

On the laptop, use a terminal with Git authenticated through the normal GitHub sign-in/credential helper. Do not paste a token into the command or store one in the repository.

```bash
git clone https://github.com/Niyam-Paneru/Niyam-Paneru.github.io.git service-site-migration
cd service-site-migration
git switch main
git status --short --branch
```

Expected before editing: branch `main`, no uncommitted files.

## 4. Replace and verify the public base URL

First preview the exact replacements:

```bash
node scripts/replace-base-url.mjs SECOND_USERNAME --check
```

Read every listed file. Then apply the replacement:

```bash
node scripts/replace-base-url.mjs SECOND_USERNAME
```

Confirm that no old service-site base remains and that DentSignal was not changed:

```bash
git diff --check
git diff --stat
git diff
rg -n "https://niyam-paneru\.github\.io" --glob "*.html" README.md
rg -n "dentsignal\.me" .
```

Expected:

- the first `rg` command returns no old service-site base URL in public HTML or the README (the replacement script deliberately retains its source constant so it can be audited);
- the second returns only the documented DentSignal separation/case-study references;
- no `CNAME` file exists;
- no secret, token or credential file appears in `git status`.

## 5. Run the site checks before pushing

```bash
node scripts/check-site.mjs
node --check assets/script.js
npx --yes html-validate "*.html"
npx --yes csstree-validator assets/styles.css
npx --yes markdownlint-cli2 "*.md" "samples/*.md"
npx --yes cspell "*.html" "*.md" "samples/*.md"
git diff --check
```

Do not push if any check fails. Fix the smallest source issue, rerun all checks, then inspect the complete diff.

## 6. Commit and push to the second account

```bash
git add index.html case-study-dentsignal.html sample-web-app-launch-blocker.html sample-fastapi-api-repair.html sample-workflow-reliability.html sample-voice-agent-qa.html voice-agent-qa.html README.md MIGRATION.md
git commit -m "Point service site to second GitHub Pages account"
git remote rename origin locked-origin
git remote add origin https://github.com/SECOND_USERNAME/SECOND_USERNAME.github.io.git
git remote -v
git push -u origin main
```

The push preserves the reviewed project history. Do not force-push over a non-empty destination repository. If the destination was accidentally initialized, delete and recreate the empty repository before continuing rather than combining unrelated histories.

## 7. Configure GitHub Pages

While signed in as the `SECOND_USERNAME` repository owner:

1. Open repository **Settings → Actions → General**.
2. Confirm GitHub Actions are allowed for this public repository. The workflow uses only official `actions/*` components.
3. Open **Settings → Pages**.
4. Under **Build and deployment → Source**, select **GitHub Actions**.
5. Leave **Custom domain** empty.
6. Open the **Actions** tab and select **Deploy static site to GitHub Pages**.
7. If the push did not trigger a run, use **Run workflow** on `main` once.
8. Open the run and confirm every `deploy` step succeeds: checkout, configure Pages, upload artifact and deploy Pages.

Do not change DentSignal DNS, Vercel, HTTPS, Azure or any DentSignal repository setting.

## 8. Verify production

Allow GitHub Pages a few minutes after a successful workflow. Then verify:

- `https://SECOND_USERNAME.github.io/`
- `/sample-web-app-launch-blocker.html`
- `/sample-fastapi-api-repair.html`
- `/sample-workflow-reliability.html`
- `/case-study-dentsignal.html`
- `/voice-agent-qa.html`
- `/sample-voice-agent-qa.html`
- all four Markdown sample links;
- `/404.html` and a nonexistent nested route;
- `/assets/styles.css`, `/assets/script.js`, favicon and social-preview image.

For root and every interior HTML page, inspect page source and confirm:

- canonical and `og:url` use `https://SECOND_USERNAME.github.io`;
- `og:image` uses the same host;
- no metadata uses `niyam-paneru.github.io` or `dentsignal.me`;
- the primary navigation leads with broad technical services and does not contain Voice QA;
- every page names Niyam and offers an email route;
- synthetic pages show **Synthetic demonstration** near the title and in the page body/footer.

Test a 390 px mobile viewport and a 1440 px desktop viewport. Check the mobile menu, Escape-to-close, keyboard focus, page refresh on interior routes, horizontal overflow and email buttons.

Separately open `https://dentsignal.me/`. It must still show DentSignal from its existing production deployment and must not redirect to the service site.

## 9. Update private proposal links

Only after the new service site passes production verification:

1. In the private `Give-Me-Money` repository, replace `https://niyam-paneru.github.io` with the verified `https://SECOND_USERNAME.github.io` in `client-acquisition/`.
2. Reopen every top-ranked opportunity before sending.
3. Open every proof link from the final proposal text.
4. Commit the link-only update on a narrow branch and merge it after review.
5. Keep the old blocked deployment note until the new site is actually verified.

## Rollback

If URL replacement or the destination push is wrong **before deployment**:

1. Do not change the old repository or DentSignal.
2. Delete the local migration directory and clone the reviewed source again.
3. Repeat with the confirmed username.

If the new Pages deployment succeeds but the site is wrong:

1. Stop proposal sending.
2. Record the failing URL and workflow run.
3. Revert the migration commit without rewriting history:

   ```bash
   git revert HEAD
   git push origin main
   ```

4. Monitor the rollback workflow and verify the new host again.
5. The old repository and `dentsignal.me` remain untouched throughout.

If the second account cannot run Actions, leave the destination repository intact, do not change DNS or DentSignal, and resolve only the second account's Actions/account restriction before retrying.
