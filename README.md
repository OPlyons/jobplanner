# CNWL Job Planner

Single-file, browser-local job planning tool. Current application release: **v2.0.14**.

The deployable application is `public/index.html`. It is the complete original HTML, with its fonts, images, PDF/Excel libraries and blank master template embedded. It can also be downloaded and opened locally.

## Cloudflare Pages setup

| Setting | Value |
| --- | --- |
| Project | `cnwl-job-planner` |
| GitHub repository | `OPlyons/jobplanner` |
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run build` |
| Output directory | `dist` |
| Root directory | Repository root |
| Environment variables | `NODE_VERSION=24`, `SKIP_DEPENDENCY_INSTALL=true` |
| Custom domains | `jplanner.space`, `www.jplanner.space` |

The project has no npm dependencies. The build validates the embedded JavaScript before copying `public/` to `dist/`. Each commit to `main` is intended to trigger a Cloudflare Pages deployment after Git integration is configured.

## Updating the planner

1. Update `public/index.html` with the reviewed single-file release.
2. Update the version in `package.json` and the version check in `scripts/build.mjs`.
3. Run `npm test` and `npm run build`.
4. Commit the change. Check the Cloudflare deployment succeeds and verify the live release.

Do not commit personal job plans, browser backups, generated staff reports or filled Excel summaries.

## Data and governance

Cloudflare serves the application files. The application saves entered plans in the user's browser. This repository does not add a database, staff accounts, analytics or error-reporting service. Downloaded staff reports and summaries must follow the agreed local governance process.

Browser storage belongs to the full origin: scheme, hostname and port. Preserve each existing hostname and HTTPS when moving hosting. Work saved at `www.jplanner.space` does not automatically appear at `jplanner.space`, so both addresses should serve the planner rather than forcing a redirect. Staff should keep an editable JSON backup before changing browser, device or address.

## Deployment handover

The existing domain currently points at the previous hosting service. Create and verify the Pages deployment first. Then add both custom domains and replace only the existing apex A record and `www` CNAME with the Pages project's required DNS records. Leave other DNS records intact. Keep the previous host available during the transition.

## Verification limits

The application previously passed workflow, calculation, storage and PDF/Excel checks. Repository build checks validate JavaScript syntax and the copied HTML. They do not replace real-browser interaction, accessibility or NHS-device checks. Some non-Latin characters and emoji may be unavailable in generated PDFs because of the embedded font.
