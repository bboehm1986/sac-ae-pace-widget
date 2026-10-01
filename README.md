# AE Employer Election — Pace Thermometer — SAC Custom Widget (PROTOTYPE)

A custom widget for SAP Analytics Cloud giving a quick visual answer to
"how far along is Employer Annual Enrollment": a literal thermometer
(vertical glass tube + bulb, liquid fill) showing actual completion rate
against a dashed expected-pace line for this point in the cycle.

Requested 2026-09-30 by Blair/leadership as a "Thermometer/Barometer for
expectations" for both Member and Employer reporting. This is the
Employer half — `sac-member-pace-widget` is the Member half, a separate,
stylistically similar twin, not a shared component.

**Status: prototype.** Built 2026-10-01 against mock data, adapted from
the Member prototype's style-approved thermometer design; not yet bound
to real Datasphere data or added to a Story.

## No new Datasphere work

This widget reuses the exact same `employerStatus` binding
(`AM_EMPLOYER_ENROLLMENT_SUMMARY`) as `sac-ae-snap-report-widget` and
`sac-ae-operational-widget` — same multiplexed cube, same 5 dimensions /
2 measures in the same order. It only reads the Status/Region row-kind
(`Election Sub-Type` blank, `Status` non-blank) — `Employer Count` summed
by `Status`.

## How this differs from the Member prototype

1. **Expected pace** reuses `AE_EXPECTED_PACING` verbatim from the Snap
   Report/Operational widgets — a 14-point curve derived from Blair's
   actual historical send/reminder schedule, not a straight-line
   interpolation. Employer's single 14-day window (10/1–10/14, every
   plan year) made this buildable where Member's 4 differently-shaped
   waves couldn't.

   A real *prior-year empirical* curve (built from Gold's
   `Status_2026`/`Action_Date_2026` fields, mirroring the Timeline
   chart's own day-bucketing logic) was considered and rejected
   2026-10-01 — `Action_Date_2026` was already proven unreliable for
   day-level granularity and an equivalent feature was reverted once
   before, 2026-09-16 (see `sac-ae-snap-report-widget/BUILD_PLAN_VWEMPLOYERSAVES.md`,
   "Reversal: 2026 day-by-day Timeline data is not usable"). Reusing the
   existing, already-trusted `AE_EXPECTED_PACING` curve was judged the
   sounder choice over rebuilding something this project already killed.
2. **Status vocabulary**: "Completed" = `Enrollment_Status = 'Success'`
   (Employer's own 5-value vocabulary: Success / Abandoned / Not Started
   / In Progress / Needs Follow-up) — not the same set as Member's.

Everything else — "Actual %" = Completed ÷ Total Set Up so far (same
open question as Member's prototype: no reliable total-eligible-employer
figure independent of Gold's own population), the on-pace/watch/behind
thresholds, and the thermometer SVG/CSS itself — is a close adaptation
of the Member prototype.

## Files

- `widget.json` — manifest: properties (`width`, `height`, `asOfLabel`),
  a single `employerStatus` data binding, one exposed scripting method
  (`refresh`).
- `main.js` — defines the `<com-porticobenefits-aepace>` custom element.
  Renders an inline SVG thermometer (rounded stem + bulb, clipped liquid
  fill, tick marks, dashed expected-pace marker, subtle glass highlight)
  — hand-rolled, no external chart library, same reasoning as the rest
  of the suite (SAC widget iframes are CSP-strict). Falls back to
  built-in mock data when no data binding is bound.
- `icon.svg` — Employer-family blue (`#004b8d`), thermometer-shaped —
  distinct from Member's purple icon, since this widget belongs to the
  Employer family visually (same palette as Snap Report/Operational/
  Drill-Down).
- `preview.html` — standalone local test harness; drives the widget
  through the real `onCustomWidgetBeforeUpdate`/`onCustomWidgetAfterUpdate`
  lifecycle hooks, same pattern as the rest of this suite.

## Open questions, flagged for discussion, not yet resolved

- Should "Actual %" be measured against Total Set Up so far, or against
  a real total-eligible-employer figure? Gold's employer population is
  defined by who has a `vEmployerSaves` record at all, so there's no
  independently-sourced "total eligible employers" figure to divide
  into without new source-system work.
- What should the widget show before the real cycle window starts (Oct
  1)? Right now Expected correctly shows 0%, same as the Member
  prototype's own open question.

## Next steps

1. Get Blair's sign-off on style and the open questions above.
2. Host on GitHub Pages, register in SAC, bind to
   `AM_EMPLOYER_ENROLLMENT_SUMMARY` (Measures then Dimensions, same
   order as the other widgets in this suite) and add to the "AE
   Employer Election" story.
3. Compute the real integrity hash and set it in `widget.json` before
   registering — don't leave it empty.
