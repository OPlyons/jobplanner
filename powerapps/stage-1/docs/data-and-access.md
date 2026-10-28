# Data and access design

This is the proposed storage contract. The lists have not been provisioned. A document-library folder is not itself a Microsoft List. Create the supporting lists at an approved site; use an appropriately restricted folder for approved documents and exports.

## Structure

Use stable GUID text keys, integer minutes for time, date-only fields for civil planning dates, and UTC timestamps for audit events. Preserve the original category IDs. Index plan keys, owner identifiers, reporting periods, status fields and organisational filter keys before volume testing. Record directory labels on approved snapshots so later directory edits do not rewrite history.

| Proposed store | Purpose | Authoritative writers |
|---|---|---|
| JP_Plans | Plan identity, period and draft metadata | Authorised staff for their drafts; controlled processes for ownership |
| JP_Assignments | Authoritative owner and reviewer assignments | Nominated administrator or protected process only |
| JP_WorkingPatterns | Seven weekday values and effective periods | Authorised draft editor |
| JP_Activities | Dated planned activity or repeating series | Authorised draft editor |
| JP_Exceptions | Skipped/replaced occurrences, keyed by series and date | Authorised draft editor |
| JP_AnnualWork | Undated annual hours and session counts | Authorised draft editor |
| JP_Discussions | Objectives, resources, adjustments and review discussion | Plan owner and assigned reviewers only |
| JP_RecordedTime | Actual-time entries and personal reflection | Plan owner; any further access must be separately agreed |
| JP_Approvals | Decisions tied to a specific immutable submitted version | Controlled approval process validating the actual signed-in reviewer |
| JP_ApprovedSummaries | Reporting-safe totals and latest eligible version pointer | Controlled process only |
| JP_Directory | Team, division, borough and profession choices | Nominated directory editor |
| JP_Categories | Original category codes, display names, colours and work/absence classification | Nominated administrator |
| Version document library | Immutable submitted/approved snapshots and generated reports | Controlled process; restricted readers |

Column definitions are in `../data/list-definitions.json`. They are an implementation specification, not a deployed security policy.

## Access contract

| Role | Own draft | Assigned plan/discussion | Routine master summaries | Approval records |
|---|---|---|---|---|
| Staff | Read/edit | Own plan only | None by default | Read decisions on own plan; cannot write approvals |
| Assigned manager | Read/comment on authorised plans | Read/comment | Scope agreed for their teams | Submit a decision through validated workflow |
| Second reviewer | Only where explicitly assigned | Read necessary version | None by default | Submit their required decision through workflow |
| Reporting editor | No blanket access | No blanket access | Read approved coded summaries | Read relevant approval state; cannot impersonate a reviewer |
| Directory editor | No blanket access | No blanket access | As separately authorised | None |
| Service owner/admin | Access for administration under agreed policy | Auditable administrative access | Administrative access | Cannot silently substitute a user's decision |

Apply access to the data source as well as the app. App filters and hidden buttons do not secure records. Do not share the entire site or every list with all app users merely to make a connector work. The approval process must authenticate the caller and resolve reviewer assignments from a protected source; a user-editable manager email or status field is not proof of authority.

SharePoint does not provide general per-column security for staff-editable records. Keep authoritative approvals, reporting eligibility and approved summaries in separate stores that staff cannot directly edit. A draft's displayed status is advisory until reconciled against the protected approval record.

## Permission feasibility test before production

Prototype a plan-scoped permission boundary with inherited permissions for child data, where supported. Record the real number of permission scopes, projected plans per year, retention period and administrator workload. Avoid creating an independent permission grant for every activity row. Do not call this design viable until direct list/document URLs have been tested with a second staff account and an assigned manager account.

If SharePoint cannot meet the required isolation and scale without fragile permissions, evaluate Dataverse owner/team security with CNWL and confirm licensing before proceeding. This is a decision gate, not a commitment to buy premium licences.

## Save, version and reporting rules

Save operations need stale-write detection, explicit failure states and recovery. Use the store's supported concurrency token/version handling; never claim a multi-list save is atomic. Submit an immutable version only after all required draft parts are saved and validated. Approval references that exact version and fingerprint. Later amendments create a draft while the agreed version remains available.

The reporting process writes one eligible summary per reference and exact period. Repeated flow delivery must be idempotent. Updating an approval must not append another counted copy of the same plan. Treat report rows as generated data and record their source version and calculation version.

For large reports, calculate and verify complete summaries using a supported delegated/server process. Never infer correctness from a report that only loaded the first page of records.
