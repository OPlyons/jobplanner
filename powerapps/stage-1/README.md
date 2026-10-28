# CNWL Job Planner: Power Apps stage 1

Status: native canvas prototype created and saved in the development environment on 28 October 2026. Shared storage, tenant licensing and two-account permission testing remain open. This is a development prototype, not the completed job-planning service.

## What is built

- A native Power Apps canvas screen with four working sections: Home, My details, Weekly planner and Build progress.
- Fictional profile and ten sample activities, using the original planner's category IDs and gentle colours.
- Horizontal compact rows and a vertical stacked layout, with 15-minute duration controls and live weekly totals.
- Editable example name, role, team and weekly hours, with numeric range checks.
- Save and reopen **within the current app session**. Closing or reloading the app discards these test drafts. The app states this explicitly.

The annual plan, insights and review cards identify the later stages. They are navigation and scope previews, not completed annual calculations, reporting or approval workflows.

## Source

- `canvas/JobPlanner.pa.yaml`: native screen code accepted through Power Apps Studio's code-paste feature. It is not a standalone app import package.
- `scripts/build_canvas.py`: generates that screen and its fictional fixtures.
- `data/`: extracted source categories, master workbook field inventory, planned list definitions and test fixtures.
- `docs/`: feature inventory, data/access design, calculation contract, setup decisions and verification record.

Rebuild with `python powerapps/stage-1/scripts/build_canvas.py` from the repository root. The screen can be pasted into a development canvas app using Power Apps Studio's code-paste feature. Set this screen as the starting screen. Verify formulas and interactions in the target tenant before using it.

Run `python powerapps/stage-1/scripts/validate_artifacts.py` for the category, list-reference and workbook-contract checks. See `docs/verification.md` for the actual Power Apps interaction checks and remaining gaps.

The downloadable build bundle also contains the actual `.msapp` exported from Power Apps Studio and a screenshot. Extract the bundle before opening the `.msapp` in Studio. The outer ZIP is a collection of deliverables, **not** a Power Platform solution import ZIP. The app has fictional data and session-only saving; importing it does not create the proposed SharePoint lists.

## Next dependency

A project location has been selected privately. Shared-storage sign-in authorisation and access confirmation remain pending. No SharePoint lists or permissions have been changed. The proposed storage design is ready for implementation once those prerequisites are met.

Stage 1 is complete only after shared save/reopen works across sessions, the intended licences/connectors are confirmed, and separate staff/manager test accounts pass the access tests.
