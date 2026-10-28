# Stage 1 decisions and open dependencies

| Decision/check | State | Evidence or next action |
|---|---|---|
| Native canvas app | Confirmed | New development app saved in the development environment; original app/site untouched |
| Current environment access | Confirmed for authoring | Create, save, paste native controls and preview succeeded |
| SharePoint project location | Selected privately | Confirm access before provisioning; tenant-specific locations are kept outside this repository |
| SharePoint sign-in | Pending authorisation | Obtain the required sign-in authorisation before following the organisation's federation flow |
| Lists and data connections | Not created | Confirm list-creation access and approved scope after sign-in |
| Production licence rights | Unverified | Confirm actual staff/manager entitlements, allowed connectors and relevant flow licensing |
| Standard connector baseline | Proposed | SharePoint is standard; that alone does not establish every user's entitlement or tenant policy |
| Production PDF route | Unresolved | Word template/convert connector is premium; Power Apps PDF() is experimental and not the production baseline |
| Excel export | Planned | Preserve the existing coded A2:BG2 summary contract; generate separate output files, not concurrent writes to one workbook |
| Permissions | Designed, untested | Data-source isolation, direct URL tests and protected approval stores required |
| Multi-user and restart persistence | Pending | Session-only demo storage is not a substitute for this test |
| Exact timetable behaviour | Partly prototyped | Native duration sliders and row layout work; draggable start/end edges, day view and recurrence are stage 2 |
| Phone layout | Not accepted | Current prototype targets desktop/tablet; minimum screen width 760 and height 768 |
| Production deployment | Not done | Saved as an unpublished development app |

## Microsoft references checked on 28 October 2026

- [Code view and paste](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/code-view)
- [Current canvas YAML format](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/power-apps-yaml)
- [Native slider and accessibility properties](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/control-slider)
- [SharePoint connector](https://learn.microsoft.com/en-us/connectors/sharepoint/)
- [Microsoft 365 and Power Platform licensing](https://learn.microsoft.com/en-us/power-platform/admin/pricing-billing-skus)
- [Data-source security](https://learn.microsoft.com/en-us/power-platform/admin/security/connect-data-sources)
- [Delegation and complete data queries](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/delegation-overview)
- [Word Online Business connector](https://learn.microsoft.com/en-us/connectors/wordonlinebusiness/)
- [PDF function limitations](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/how-to/pdf-function)
- [Excel Online Business connector](https://learn.microsoft.com/en-us/connectors/excelonlinebusiness/)

Microsoft also offers a connected canvas authoring MCP workflow. It requires an existing saved app, coauthoring session and the appropriate supported tooling. This prototype was actually built through Power Apps Studio's native code-paste workflow; no MCP deployment is claimed.
