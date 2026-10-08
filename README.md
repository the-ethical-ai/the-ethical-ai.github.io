# Personal GitHub Pages Website

This is a plain static website designed for GitHub Pages. It has four pages:

- `index.html`: animated opening, introduction, portrait, and social links
- `research.html`: overview, publications, roles, and relevant links
- `cv.html`: web CV with a last-updated marker
- `existential-ai.html`: interactive satirical incident likelihood estimator
- `styles.css`: shared celestial theme and responsive layout
- `script.js`: shared animated star field, Scholar metrics, risk estimator, and automatic footer year

## Current Content

The site contains Tyler Chang's biography, portrait, current research focus,
social and academic profiles, three ACM publications, CUI 2026 presentation
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
