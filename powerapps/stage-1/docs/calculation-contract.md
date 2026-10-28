# Calculation contract

Baseline functions: `planningBudget`, `workTimeSummary`, `annualStats`, activity validation and recurrence helpers in release 2.1.5.

## Units and dates

- Store minutes as integers. Display hours as minutes / 60.
- A duration slider uses quarter-hour units: round(slider value) × 15 minutes.
- An activity's net duration is end minute − start minute + 1,440 if overnight, minus unpaid break minutes. Reject nonpositive duration and invalid breaks.
- The planning period includes both endpoints. Calculate gross capacity by the person's paid working pattern on each included civil date; do not use 52 × weekly hours as an annual shortcut.
- Expand repeating activities from their anchors using the original weekday/interval/end-date rules. Apply exceptions once. Overnight allocation, leap days and daylight-saving transitions need explicit parity cases.

## Available annual time

```
gross = sum of paid working-pattern minutes on each included date
leaveAndBank = max(annualLeaveAllowance + bankHolidayAllowance, datedLeave)
otherAway = max(otherAbsenceAllowance, datedSicknessAndOtherLeave)
available = gross - leaveAndBank - otherAway
```

All values above are minutes. These max operations avoid deducting the allowance and the same dated leave twice. Preserve a negative available value as a visible validation problem instead of silently clamping it to zero.

Example: gross 117,000; annual leave 12,150; bank holidays 3,600; dated leave 6,000; other allowance 900; dated other absence 600 → deductions 16,650 and available 100,350 minutes (1,672.5 hours).

## Allocation and reporting

Planned usual work is the sum of dated usual-hours work plus undated usual-hours annual commitments. Each annual commitment is hours per session × session count × 60. Keep paid and unpaid overtime in separate totals. Breaks and absence are not work categories.

Do not put the same commitment into the dated diary and annual undated work. Warn and let the user resolve suspected duplication; do not guess that two similarly named activities are the same.

Undated annual work contributes to the annual allocation and work mix, but must not be spread artificially across weekly/monthly dated charts. Retrospective actual work does not alter the prospective plan or master summary. An empty actual diary is not evidence that no work happened.

## Prototype scope

The stage 1 prototype totals only its ten fictional weekly activities. Its initial total is 885 minutes (14.75 hours), compared with 37.5 weekly paid hours, leaving 22.75 hours. It does not claim to calculate annual capacity or recurrence yet. The native Power Fx total is `Sum(colJPFActivities, DurationMinutes) / 60`.

## Acceptance examples to port

Normal, zero-hours and uneven weekly patterns; inclusive period boundaries; leap years; daylight-saving changes; monthly recurrence; excluded/replaced occurrences; overnight activities; unpaid breaks; allowance versus dated leave; overtime separation; undated commitments; duplicated imports/copies; invalid backups; concurrent edits; approval invalidation; exact-period reporting and idempotent summaries; export totals and cancellation.
