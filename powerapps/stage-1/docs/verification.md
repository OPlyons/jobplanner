# Stage 1 verification — 28 October 2026

## Confirmed in Power Apps Studio

| Check | Observed result |
|---|---|
| Native app created and saved | CNWL Job Planner - Stage 1 in the development environment; saved, unpublished |
| Starting screen | Only final `JPFHome` screen remains; earlier draft and blank screen removed |
| Formula checker | No errors found |
| Accessibility checker | No errors found; this is a tool check, not a claim of full accessibility conformance |
| Runtime checker after interaction tests | No errors found |
| Initial weekly total | Ten fictional activities: 14.75 hours; usual paid hours 37.5; 22.75 left |
| First keyboard increment | First activity 2 → 2.25 hours; total 14.75 → 15; 22.5 left |
| Repeated keyboard increment | Focus remains on the slider; next Right arrow produces 2.5 hours and total 15.25 |
| Save / edit / reopen in session | Saved at 2.5 hours; edited to 2.75; reopen restored 2.5 and total 15.25 |
| Saved-state indicator | Reopen displays “Saved session draft reopened”; no false unsaved state |
| Horizontal / vertical selector | Row arrangement changes; values and totals remain the same |
| Whole-hour formatting | Displays `2 h` and `15 h`, without a trailing decimal point |
| Profile hours | Valid 30 accepted; negative and above-168 inputs rejected; reopening restored 37.5 |
| Final demo state | Restored initial fictional 14.75-hour sample |
| Native export | Actual 64,658-byte `.msapp` downloaded from Power Apps Studio; ZIP integrity passed; contains `Src\JPFHome.pa.yaml`, `Src\App.pa.yaml`, editor state |

## Source and fixture checks

Generated YAML was parsed successfully with 64 uniquely named native controls. Each property formula has the expected `=` prefix. Power Apps Studio performed the actual formula validation.

`scripts/validate_artifacts.py` passed: proposed list names and keys, cross-store references, all 19 source categories, ten fictional activity records, 885-minute fixture total, and master workbook tab/header contract. The workbook has 59 input columns A:BG and six derived check/filter columns BH:BM.

The final screen uses a stable display-row collection and a separate editable activity collection. This avoids rebuilding the gallery on every slider change, which previously caused keyboard focus to disappear. Save/reopen copies the edited values, and the slider defaults and labels read them by row ID.

## Not yet verified

- Shared save/reopen after a reload, another browser or another device.
- Staff-versus-staff and manager permissions, including direct list/document access.
- SharePoint list provisioning, connection permissions, concurrency and volume/delegation behaviour.
- Current production licences and supported PDF generation route.
- Annual calculations, recurrence, sign-off and reporting workflows; these are the later build stages.
- Phone and small-window layouts. The current desktop/tablet prototype has minimum dimensions of 760 × 768.

The current Save button is a deliberately labelled session-only test action. It must be replaced with the authorised shared-data implementation before real plans are entered. Stage 1 remains in progress until its storage and access gates pass.
