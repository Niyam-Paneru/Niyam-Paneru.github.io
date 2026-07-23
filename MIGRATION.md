# GitHub Pages Migration

## Fixed scope

- Source: `C:\Users\thely\Downloads\14_days_sprint\service-site-source`
- Source branch: `codex/premium-proof-portfolio`
- Destination: `C:\Users\thely\Downloads\14_days_sprint\service-site-destination`
- Destination repository: `Niyam-Paneru/Niyam-Paneru.github.io`
- Public URL: `https://niyam-paneru.github.io/`

This procedure publishes only the reviewed static portfolio. It does not transfer the DentSignal domain, copy DentSignal source, send outreach, or change paid infrastructure.

## 1. Verify the source candidate

From the source repository:

```powershell
git branch --show-current
git status --short
npm ci
npm run check
npm run test:browser
git diff --check
git log -1 --oneline
```

Required evidence:

- branch is `codex/premium-proof-portfolio`;
- worktree is clean;
- 28 unit/static tests pass;
- browser smoke passes;
- site checker reports ten HTML pages;
- no whitespace errors.

## 2. Verify the destination before copying

From the destination repository:

```powershell
git status --short --branch
git remote -v
gh auth status
gh repo view Niyam-Paneru/Niyam-Paneru.github.io
Test-Path CNAME
```

Stop if the destination contains unrelated user work or if the authenticated account cannot write to the repository. `Test-Path CNAME` must return `False`.

## 3. Copy only the reviewed tracked tree

Create a temporary archive from the verified source commit, not from untracked browser artifacts:

```powershell
$sourceRepo = 'C:\Users\thely\Downloads\14_days_sprint\service-site-source'
$destinationRepo = 'C:\Users\thely\Downloads\14_days_sprint\service-site-destination'
$archive = Join-Path $env:TEMP 'niyam-portfolio-source.tar'
git -C $sourceRepo archive --format=tar -o $archive HEAD
tar -xf $archive -C $destinationRepo
```

This is safe only when the destination was verified as empty or already dedicated to this exact site. Do not copy `.git`, `.playwright-cli`, `output`, `node_modules`, generated concept images, or any DentSignal repository file.

## 4. Activate destination URLs and Pages push

From the destination repository:

```powershell
node scripts/replace-base-url.mjs Niyam-Paneru --check
node scripts/replace-base-url.mjs Niyam-Paneru
```

The first command previews canonical URL handling and the workflow activation. Run the mutating second command only after reviewing that preview; it activates Pages on pushes to `main`. The helper is tested against LF and CRLF workflow files.

Verify migration hygiene:

```powershell
rg -n "SECOND_USERNAME|https://niyam-paneru.github.io" . -g "!.git/**" -g "!node_modules/**"
Test-Path CNAME
git diff --check
```

Expected: no stale URL or username-token matches, no `CNAME`, and no whitespace errors.

## 5. Re-run the full destination gate

```powershell
npm ci
npm run check
npm run test:browser
```

Do not push if any command fails. Local preview is not proof of deployment.

## 6. Commit and publish

```powershell
git add -A
git commit -m "feat: launch premium proof portfolio"
git push origin main
```

In repository settings, set Pages source to **GitHub Actions** if it is not already configured. Then verify the workflow itself:

```powershell
gh run list --repo Niyam-Paneru/Niyam-Paneru.github.io --workflow pages.yml --limit 5
gh run watch --repo Niyam-Paneru/Niyam-Paneru.github.io --exit-status
```

## 7. Verify the public build

Open `https://niyam-paneru.github.io/` in a fresh browser context and verify:

- title is `Niyam Paneru | Software repair and launch support`;
- all local assets return successfully;
- Work, Offers, Contact, and `Send the bug` work;
- all eight proof links open;
- CSV sample, repair, error, and download paths work;
- Webhook delivered, duplicate, invalid JSON, and exhausted-retry paths work;
- DentSignal caption remains visible;
- mobile navigation opens as `Close` and closes with Escape;
- console has zero errors.

Record the destination commit SHA and successful workflow URL. Only the live check can support a deployment-complete claim.
