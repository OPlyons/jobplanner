# Layout choice in v2.1.3

The weekly diary now has a visible Layout selector: Horizontal, Vertical and Day list. Horizontal places days down the left and hours across the top. Vertical keeps the existing day columns and activity cards. Both display the same plan records.

The chosen layout is remembered on this browser, independently of plan data and backups. Horizontal is the default on desktop; a new phone session defaults to Day list. Opening an individual day does not replace the preferred weekly layout. The Weekly diary button returns to that preference, and Options uses the same preference.

The horizontal timeline retains its start and finish sliders. The grip marks are clearer and the instruction explains the 15-minute step. Arrow keys also adjust the selected edge; Shift changes by an hour. Existing capacity, overlap, recurrence, undo and save protections remain in place. Short-activity labels use the same title capitalisation as the other views.

The weekly hours summary is compact, with its breakdown available on demand, leaving more room for the diary. The horizontal timetable scrolls inside its own bounded region. No plan schema or calculation formula has changed.

## Validation

- 37 regression checks passed, including remembered layouts, unchanged plan data when switching, preference-storage failure, recurring activity resizing, capacity and overlap checks, and a saved change through the actual keyboard slider handler.
- All five inline scripts parsed; the reconstructed build matches the packaged source checksum.
- The browser preview displayed the new selector, horizontal activities and both time handles with synthetic plan data. No horizontal page overflow was observed at 1363 × 936.
- Further browser interaction was blocked by the browser URL security policy. The final compact-summary refinement and pointer dragging could not receive a completed browser check; code-level checks cover the saved keyboard edit and shared resize calculations.

## Custom domain check

Cloudflare reports `jplanner.space` as active, with an active certificate and an apex CNAME pointing at `cnwl-job-planner.pages.dev`. There were no custom page rules, Worker routes or IP access rules on the zone. After the user reported old content, a purge for the `jplanner.space` hostname was accepted. The separate `www` and wildcard records were unchanged. Requests from the development environment still returned a blocked response, so the user's live view could not be independently confirmed.
