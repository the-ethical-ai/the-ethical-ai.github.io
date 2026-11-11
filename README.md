# Personal GitHub Pages Website

This is a plain static website designed for GitHub Pages. It has five pages:

- `index.html`: animated opening, introduction, portrait, and social links
- `research.html`: overview, publications, roles, and relevant links
- `cv.html`: web CV with a last-updated marker
- `existential-ai.html`: interactive satirical incident likelihood estimator
- `companion-ai-analytics.html`: password-encrypted companion AI traffic dashboard
- `styles.css`: shared celestial theme and responsive layout
- `script.js`: shared animated star field, Scholar metrics, risk estimator, and automatic footer year

## Current Content

The site contains Tyler Chang's biography, portrait, current research focus,
social and academic profiles, four ACM publications, CUI 2026 presentation
photos, academic roles, education, technical skills, and awards.

The celestial background uses the browser's built-in canvas API, so it works on
GitHub Pages without a server or additional dependencies. It automatically
becomes a still background when a visitor enables reduced motion, and pauses
animation while the page is hidden. Silver stars, a Milky Way ribbon, and fine
orbital lines draw inspiration from a celestial watch dial.

## Scholar Metrics

The research page displays citation and h-index data from Tyler's public Google
Scholar profile. `.github/workflows/update-scholar-metrics.yml` refreshes
`data/scholar-metrics.json` every Monday and can also be run manually from the
repository's Actions tab. If Google Scholar rejects a refresh, the website keeps
showing the most recent successful data rather than replacing it. Temporary
request failures are retried up to three times. Each successful workflow run
explicitly requests a GitHub Pages rebuild, since commits made with the Actions
token do not trigger branch-based Pages builds automatically. The card shows
"Cached" if its data cannot load or the last successful refresh is over ten days
old. Persistent Google Scholar blocking can still prevent a scheduled refresh;
failed runs are visible in the repository's Actions tab.

To refresh from a machine that can reach Google Scholar, run
`python3 scripts/update-scholar-metrics.py`, then publish the changed JSON file.

## Publish With GitHub Pages

1. Create a GitHub repository named `the-ethical-ai.github.io`.
2. Push these files to the repository.
3. In GitHub, open Settings → Pages.
4. Set the source to deploy from your default branch.
5. Visit the URL GitHub provides after deployment finishes.

## Companion AI Analytics Dashboard

`companion-ai-analytics.html` adds a restricted dashboard in the existing theme,
with selectable platform trends, linear/logarithmic scales, a data table, and
coverage-aware statistics. Last updated: November 11, 2026. Values are monthly
website visits **in millions**, supplied from Similarweb; this is a selected
sample, not the whole market. The last-updated date is a collection update marker,
not the current date on each visit. Monthly updates are manual.

GitHub Pages has no server-side password authentication. This page instead uses
Web Crypto to decrypt `data/companion-traffic.encrypted.json` with a shared
password (AES-256-GCM, PBKDF2-SHA256, 600,000 iterations, random salt and IV).
Only ciphertext is published. The password and decrypted dataset are never
stored in localStorage, sessionStorage, cookies, or repository files. Refreshing
or using “Lock dashboard” requires the password again. Serve via HTTPS or
localhost; opening the HTML as a `file://` URL will not load the data.
The page title and development/contact notice are public. Anyone with the shared
password can view and copy the dataset. Rotate the password by re-encrypting.

For monthly updates, keep a private source JSON **outside this repository**:

```json
{
  "updated": "2026-10-29",
  "months": ["2026-03", "2026-07", "2026-08", "2026-09"],
  "platforms": [
    { "name": "example.ai", "visits": [null, 1.2, 1.3, 1.4] }
  ]
}
```

Use `null` for observations that were not recorded. Months must be chronological;
all series must have one entry per month. Append new months/platforms, update
`updated`, and run the following from the checkout (Node.js, no dependencies):

```sh
node scripts/encrypt-companion-data.mjs /absolute/path/to/private-data.json
```

Enter the password at the hidden prompt. For scripting, `--password-stdin` reads
it from standard input. Keep it out of command arguments and shell history.
Update the public `<time>` in `companion-ai-analytics.html` to the same date, then
publish the encrypted JSON and website files together. All summaries and chart
labels recalculate from the decrypted rows. No private source JSON should be
committed. The original manually supplied aggregate rows are replaced by
statistics computed from the individual observations.
