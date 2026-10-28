# Feature inventory and migration contract

Baseline: repository release 2.1.5, commit `94f31b3`; built HTML SHA-256 `f38e31006cce1773302348ebc0029d3b2a9d86afc869eccc8e7699d200aeef56`.

| Existing capability | Power Apps destination | Stage |
|---|---|---|
| Home, task icons, help and progressive guidance | Home with clear task cards and short contextual help | 1 foundation; refine throughout |
| Identity, role, team, division, subdivision, borough and profession | Profile and controlled organisation directory | 1 model; 2 complete form |
| Seven daily working-hours values and confirmation | Working pattern linked to a plan version | 2 |
| Horizontal / vertical / day-list diary | Weekly planner with remembered preference | 1 control prototype; 2 full timetable |
| 15-minute edge sliders, keyboard controls and undo | Native time controls; prototype exact timetable-edge behaviour before committing | 1 duration prototype; 2 full controls |
| Activity dates, start/end times, breaks, overnight work, locations | Activity and occurrence records | 2 |
| Repetition, end dates, exclusions, single occurrence / series editing | Repeat rules and exceptions | 2 |
| Copy day/week/period, extend repetition, saved favourites | Validated planning actions | 2 |
| Daily duration dials | Alternative editing of the same planned dated work | 2 |
| Annual plan: Overview; Leave & dates; Annual work | Prominent Annual Job Plan flow | 2 |
| Annual undated commitments: hours per session × sessions | Annual commitments with categories and time types | 2 |
| Usual hours, paid overtime, unpaid overtime | Separate totals and chart series | 2–4 |
| Needs, objectives, resources, adjustments and supervision | Restricted review discussion records | 3 |
| Manager agreement, optional second review, invalidation after edits | Authorised approvals for immutable version snapshots | 3 |
| Personal work mix, dated trends, capacity and overtime | Personal Insights | 3 |
| Time in motion, actual durations and reflections | Separate Recorded Work area | 3 |
| Coded master summary, reference, version and fingerprint | Approved reporting summary and version identity | 3–4 |
| Master: Paste plans | Automated ingestion of eligible approved versions | 4 |
| Master: Check entries | Data quality queue with actionable messages | 4 |
| Master: Team list | Controlled team directory with an accountable editor | 4 |
| Master: Dashboard | Period/division/borough/team/profession management filters | 4 |
| Five-page PDF and optional detailed appendices | Supported tenant-approved PDF generation route | 1 dependency; 5 delivery |
| Coded filled Excel A2:BG2 | Compatible export and downloadable reporting data | 5 |
| Editable JSON backup and restore | Validated migration/export with schema versioning | 5 |

## Information boundaries to preserve

The current Excel output contains coded planned totals, without names, private notes, sickness details or recorded time. Codes are potentially identifiable; they do not make records anonymous. Keep private discussion and individual actual-time records outside routine master reporting. Use workload summaries to support planning and resources, not to rank staff.

Individual JSON backups contain detailed editable data. A master workbook summary cannot reconstruct a person's diary. Migration must distinguish these sources and preview what can actually be imported.

The existing 61 JavaScript regression scenarios supply acceptance examples. They do not automatically validate a Power Fx rewrite. Record matched inputs/outputs and add tenant integration and access tests.
