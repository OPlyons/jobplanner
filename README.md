# CNWL Job Planner

CNWL Job Planner v2.1.4. The production site is hosted at **https://jplanner.space/** through Cloudflare Pages; a review branch does not replace production until merged into `main`. The GitHub repository is `OPlyons/jobplanner`.

The planner is a self-contained HTML application. Its images, downloads and application code remain embedded in the HTML. Plans are held in each visitor's browser; this project does not add a server database.

The visual refresh follows the approved [Figma design](https://www.figma.com/design/TlWUVHmrtFZUdGddibbiTQ): a clearer homepage, weekly activity cards, daily dials with 15-minute controls, a simpler Share screen and mobile navigation. Existing plans, calculations and exports use the same data format and engines. See [design implementation notes](docs/figma-refresh.md).

v2.1.2 simplifies the homepage, highlights common annual work and adds softly tinted, clearly headed form sections. Annual commitments use a two-step Work/Time form with a live total. See [clarity changes and verification](docs/clarity-v2.1.2.md). The [v2.1.1 usability fixes](docs/usability-v2.1.1.md), including repaired Options and explicit annual navigation, are retained.

v2.1.3 restores a prominent Horizontal / Vertical / Day list selector, remembers the chosen layout and keeps the draggable time sliders available in the horizontal timeline. See [layout changes and verification](docs/layout-v2.1.3.md).

v2.1.4 adds gentle colours and task icons to the homepage, with shorter horizontal diary rows and more room for the timetable. See [appearance changes and verification](docs/appearance-v2.1.4.md).

## Source and exact HTML preservation

`source/` contains the complete HTML compressed as deterministic gzip and divided into 128 KiB binary parts. `source/manifest.json` records their order, the release version, byte counts and SHA-256 checksums. This packaging makes the large source file easier to transfer into GitHub. It is only a source-storage and transport format.

The build joins the parts, checks the compressed checksum, decompresses them, checks the original size and checksum, validates the release footer and parses every executable inline JavaScript block. It then writes the original bytes to `dist/index.html`. The published HTML, and the HTML obtained by downloading it, are identical to the supplied single-file planner. The build does not minify, rewrite or redesign the application.

For this release:

- Restored file: `dist/index.html`
- HTML bytes: `8236334`
- HTML SHA-256: `ad090ec0b9281d3d2d57471d1dbc8ca01e6e376c73e248957fc1bccc99814b89`
- Executable inline JavaScript blocks: `5`

`public/_headers` supplies `Cache-Control: no-cache`, `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`. It is copied alongside the restored HTML.

## Build and validate

Use Node.js 24. There are no npm dependencies and no dependency installation is needed locally.

```sh
npm test
npm run build
```

`npm test` verifies the packaged source, parses the JavaScript and runs 39 regression checks against the real application and embedded PDF/Excel engines, using synthetic plans. These checks do not replace browser layout and interaction testing. `npm run build` validates the source package and creates `dist/index.html` and `dist/_headers`.

While editing, run `node tests/planner-regression.cjs public/index.html` to test the local HTML before repackaging it.

To obtain a single HTML file for editing, build the repository and copy `dist/index.html` to an editing location. `public/index.html` is available as an optional, gitignored local editing path. The build reads the committed `source/` package rather than this local copy.

## Publish through Cloudflare Pages

Use the GitHub project with these settings:

| Setting | Value |
| --- | --- |
| Repository | `OPlyons/jobplanner` |
| Production branch | `main` |
| Framework preset | None |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `24` (also set in `.node-version`) |
| Custom domain | `jplanner.space` |

Serve the application directly at `https://jplanner.space/`. Keep this origin consistent and do not redirect users to `pages.dev` or a different hostname: browser storage belongs to the origin where a plan was created. Data saved under another address or a local HTML file is not automatically transferred to this domain.

Both `jplanner.space` and `www.jplanner.space` are attached directly to this Pages project. The `www` hostname was moved from the old hosting after it was identified as the address still serving v2.0.14. Both hostnames serve the same release without redirecting between origins, preserving access to plans saved under either address. The two hostnames have separate browser storage. Use the planner's editable JSON backup and restore controls when moving a plan between addresses, browsers or devices.

Do not commit personal job plans, browser backups, generated staff reports or filled Excel summaries. Downloaded staff reports and summaries should follow the agreed local governance process.

Once Cloudflare Pages is connected to the repository, a successful push to `main` triggers the next production build. Check the Pages deployment result and the custom-domain page after each release.

## Update the planner

1. Edit a copy of the complete HTML file, retaining all embedded content.
2. If the release changes, update the HTML footer and `package.json` to the same version. The pack command checks that they agree.
3. Regenerate the packaged source using the edited file:

   ```sh
   npm run pack -- /path/to/updated-planner.html
   npm test
   npm run build
   ```

4. Open `dist/index.html` and check the affected interactions. The build output should have the same SHA-256 as the edited input file.
5. Commit the changed `source/` files and `package.json`, plus any intentional script, header or documentation changes. Push them to `main` to publish through the Git integration.

The pack command uses Node's built-in gzip encoder, a zero gzip timestamp and a normalized OS header. It updates the manifest and removes obsolete generated part files if the number of parts shrinks. Do not edit the binary parts by hand. Do not commit a second full copy in `public/index.html`, and do not commit `dist/` or `node_modules/`.
