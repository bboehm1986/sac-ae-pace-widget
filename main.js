/*
    AE Employer Election — Pace Thermometer — SAC Custom Widget (PROTOTYPE)

    Quick visual answer to "how far along are we": a literal thermometer
    (vertical tube + bulb, liquid fill) comparing actual completion rate
    against an expected-pace line for this point in the cycle. Requested
    2026-09-30 by Blair/leadership as a "Thermometer/Barometer for
    expectations" for both Member and Employer reporting -- this is the
    Employer half. A separate, stylistically similar Member widget
    (sac-member-pace-widget) is the other half -- two separate widgets
    sharing the same visual language, not one shared component, per
    Blair. SVG thermometer-drawing logic and CSS adapted closely from
    that Member prototype (style-approved 2026-09-30), re-pointed at
    Employer's own data.

    PROTOTYPE STATUS: first pass for Blair to react to, not a finished
    build.

    Two differences from the Member prototype, both deliberate:
      1. "Expected pace" reuses AE_EXPECTED_PACING verbatim from
         sac-ae-snap-report-widget/sac-ae-operational-widget -- a
         14-point curve derived from Blair's actual historical send/
         reminder schedule (Email Invite -> Reminder 1/2/3 -> Final
         Reminder -> Assigned Value HDHP default), not a straight-line
         interpolation. Employer's single 14-day window made this
         buildable where Member's 4 differently-shaped waves couldn't
         (see that widget's own header comment). A real prior-year
         empirical curve (built from Gold's Status_2026/Action_Date_2026
         fields, mirroring the Timeline chart's own day-bucketing logic)
         was considered and rejected 2026-10-01 -- Action_Date_2026
         (sourced from ACTDATE) was already proven unreliable for
         day-level granularity and reverted once before, 2026-09-16, see
         sac-ae-snap-report-widget/BUILD_PLAN_VWEMPLOYERSAVES.md's
         "Reversal: 2026 day-by-day Timeline data is not usable".
      2. "Actual %" = Completed / Total Set Up so far, same open
         question as Member's prototype (no reliable total-eligible-
         employer figure independent of Gold's own population -- Gold's
         employer set is defined by who has a vEmployerSaves record at
         all, so there's no broader "expected universe" to divide into).

    NO NEW DATASPHERE WORK -- reuses the exact same "employerStatus"
    binding (AM_EMPLOYER_ENROLLMENT_SUMMARY) as sac-ae-snap-report-widget
    and sac-ae-operational-widget, reading only the Status/Region
    row-kind (Election Sub-Type blank, Status non-blank). See those
    widgets' own main.js for the full dimension/measure order this
    multiplexed cube exposes -- this widget only needs Status
    (dimensions_0) and Employer Count (measures_0).

    No in-widget filter controls, no theme toggle, light theme only --
    same reasoning as every widget in this suite: SAC's Optimized-story
    View mode doesn't deliver internal click/change events to a custom
    widget's shadow DOM.
*/
(function () {
    "use strict";

    // Fixed AE election window -- same constant as
    // sac-ae-snap-report-widget/sac-ae-operational-widget, confirmed by
    // Blair 2026-09-15: Annual Enrollment always runs 10/1 through
    // 10/14, every plan year. TODO: reconfirm each cycle, same annual-
    // maintenance pattern as the EventDate literals used elsewhere in
    // this build.
    const CYCLE_START = new Date(2026, 9, 1);   // Oct 1, 2026
    const CYCLE_LENGTH_DAYS = 14;

    // Verbatim copy of sac-ae-snap-report-widget's AE_EXPECTED_PACING --
    // expected cumulative % of total completions by day-of-window,
    // index 0 = day 1 (10/1). Keep these two copies in sync if the
    // underlying schedule ever changes.
    const AE_EXPECTED_PACING = [0.0, 5.5, 10.9, 16.4, 21.8, 27.3, 33.1, 39.0, 44.8, 52.1, 59.5, 74.6, 81.1, 87.7];

    // ---- Mock data (mirrors the real SAC ResultSet row shape, and the
    // same illustrative Status/Region numbers used in
    // sac-ae-snap-report-widget's own mock -- 143 total set up, 107
    // completed, so the two widgets' previews agree with each other). ----
    function row(dims, measures) {
        const out = {};
        dims.forEach((d, i) => { out["dimensions_" + i] = { id: d, label: d }; });
        measures.forEach((m, i) => { out["measures_" + i] = { raw: m, formatted: m == null ? "" : String(m) }; });
        return out;
    }
    const MOCK_EMPLOYER_STATUS = { data: [
        row(["Success", "Southwestern Minnesota", "", "", ""], [53, 265]),
        row(["Not Started", "Southwestern Minnesota", "", "", ""], [5, 20]),
        row(["In Progress", "Southwestern Minnesota", "", "", ""], [2, 10]),
        row(["Abandoned", "Southwestern Minnesota", "", "", ""], [3, 12]),
        row(["Needs Follow-up", "Southwestern Minnesota", "", "", ""], [2, 8]),
        row(["Success", "Metropolitan Chicago", "", "", ""], [36, 361]),
        row(["Not Started", "Metropolitan Chicago", "", "", ""], [8, 50]),
        row(["In Progress", "Metropolitan Chicago", "", "", ""], [4, 25]),
        row(["Abandoned", "Metropolitan Chicago", "", "", ""], [2, 9]),
        row(["Needs Follow-up", "Metropolitan Chicago", "", "", ""], [2, 13]),
        row(["Success", "Southeastern Synod", "", "", ""], [18, 120]),
        row(["Not Started", "Southeastern Synod", "", "", ""], [4, 20]),
        row(["In Progress", "Southeastern Synod", "", "", ""], [3, 13]),
        row(["Abandoned", "Southeastern Synod", "", "", ""], [1, 4]),
    ] };

    // ---- Template ----
    const template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host {
                display: block;
                box-sizing: border-box;
                font-family: "72", "Segoe UI", Arial, sans-serif;
                /* Same glassmorphism system as the rest of the suite,
                   copy-pasted deliberately -- each shadow root is isolated. */
                --mesh-1: rgba(0, 75, 141, 0.14);
                --mesh-2: rgba(47, 111, 224, 0.12);
                --mesh-3: rgba(20, 151, 111, 0.10);
                --surface: rgba(255, 255, 255, 0.58);
                --border: rgba(255, 255, 255, 0.65);
                --text: #171a23;
                --text-soft: #5b6072;
                --accent: #004b8d;
                --accent-bg: rgba(0, 75, 141, 0.14);
                --success: #14976f;
                --success-bg: rgba(20, 151, 111, 0.14);
                --warning: #a5700c;
                --warning-bg: rgba(165, 112, 12, 0.14);
                --danger: #c94b4b;
                --danger-bg: rgba(201, 75, 75, 0.14);
                --track: rgba(23,26,35,0.07);
                --glass-blur: blur(20px) saturate(180%);
                --shadow-card: 0 1px 1px rgba(23,26,35,0.03), 0 4px 12px -2px rgba(23,26,35,0.07), 0 14px 28px -10px rgba(23,26,35,0.10);
            }
            * { box-sizing: border-box; }
            .dashboard {
                width: 100%; height: 100%; overflow: auto;
                background:
                    radial-gradient(at 12% 8%, var(--mesh-1) 0%, transparent 45%),
                    radial-gradient(at 88% 14%, var(--mesh-2) 0%, transparent 45%),
                    radial-gradient(at 50% 100%, var(--mesh-3) 0%, transparent 50%),
                    #f4f5fa;
                color: var(--text); border-radius: 18px; padding: 18px;
            }
            .eyebrow { font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-soft); margin-bottom: 2px; }
            .title { font-size: 16px; font-weight: 700; margin: 0 0 2px; }
            .asof { font-size: 10.5px; color: var(--text-soft); margin-bottom: 10px; }
            .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 100px; border: 1px solid; }
            .badge.onpace { color: var(--success); border-color: rgba(20,151,111,0.35); background: var(--success-bg); }
            .badge.watch { color: var(--warning); border-color: rgba(165,112,12,0.35); background: var(--warning-bg); }
            .badge.behind { color: var(--danger); border-color: rgba(201,75,75,0.35); background: var(--danger-bg); }
            .badge.mock { color: var(--accent); border-color: rgba(0,75,141,0.35); background: var(--accent-bg); }

            .body-row { display: flex; gap: 22px; align-items: center; margin-top: 4px; }
            .therm-wrap { flex: 0 0 auto; width: 110px; }
            .therm-svg { width: 100%; height: auto; display: block; }
            .readout { flex: 1 1 auto; min-width: 0; }
            .readout-actual { font-size: 38px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
            .readout-actual.onpace { color: var(--success); }
            .readout-actual.watch { color: var(--warning); }
            .readout-actual.behind { color: var(--danger); }
            .readout-label { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-soft); margin-bottom: 6px; }
            .readout-expected { font-size: 12px; color: var(--text-soft); margin: 8px 0 10px; }
            .stat-row { display: flex; gap: 18px; margin-top: 4px; }
            .stat { text-align: left; }
            .stat-value { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text); }
            .stat-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-soft); }

            .notice { margin-top: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 8px 12px; font-size: 10.5px; color: var(--text-soft); box-shadow: var(--shadow-card); }
        </style>
        <div class="dashboard">
            <div class="eyebrow">2027 Annual Enrollment — Employer</div>
            <div class="title">Enrollment Pace</div>
            <div class="asof" id="asof"></div>
            <span class="badge mock" id="dataBadge">Mock Data — Preview</span>

            <div class="body-row">
                <div class="therm-wrap"><div id="thermSvg"></div></div>
                <div class="readout">
                    <div class="readout-label">Actual Completion</div>
                    <div class="readout-actual" id="actualPct"></div>
                    <div class="readout-expected" id="expectedSub"></div>
                    <div id="statusBadgeWrap"></div>
                    <div class="stat-row">
                        <div class="stat"><div class="stat-value" id="statCompleted"></div><div class="stat-label">Completed</div></div>
                        <div class="stat"><div class="stat-value" id="statSetUp"></div><div class="stat-label">Total Set Up</div></div>
                        <div class="stat"><div class="stat-value" id="statDay"></div><div class="stat-label">Day of Cycle</div></div>
                    </div>
                </div>
            </div>

            <div class="notice">Prototype — "Actual" = Completed ÷ Total Set Up so far; "Expected" marker uses the same historical pacing curve as the Snap Report/Operational widgets' pacing badge, not a straight-line assumption. Open for discussion.</div>
        </div>
    `;

    class AEPace extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._props = { width: 420, height: 370 };
            this._employerStatus = MOCK_EMPLOYER_STATUS;
            this._usingMockData = true;
        }

        connectedCallback() { this._render(); }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = Object.assign({}, this._props, changedProperties);
        }
        onCustomWidgetAfterUpdate(changedProperties) {
            if ("width" in changedProperties) this.style.width = changedProperties.width + "px";
            if ("height" in changedProperties) this.style.height = changedProperties.height + "px";
            if ("employerStatus" in changedProperties) { this._employerStatus = changedProperties.employerStatus; this._usingMockData = false; }
            this._render();
        }
        onCustomWidgetDestroy() {}
        refresh() { this._render(); }

        _dim(r, i) { const d = r["dimensions_" + i]; return d ? d.label : ""; }
        _measure(r, i) { const m = r["measures_" + i]; return m && m.raw != null ? Number(m.raw) : 0; }

        // Isolates the Status/Region row-kind out of the multiplexed cube
        // the same way sac-ae-snap-report-widget/sac-ae-operational-widget
        // do: Election Sub-Type (dimensions_2) blank, Status
        // (dimensions_0) non-blank -- every other row-kind in this model
        // either leaves Status blank or Election Sub-Type populated.
        _computePace() {
            const rows = ((this._employerStatus && this._employerStatus.data) || [])
                .filter((r) => this._dim(r, 0) && !this._dim(r, 2));
            let totalSetUp = 0, completed = 0;
            rows.forEach((r) => {
                const count = this._measure(r, 0);
                totalSetUp += count;
                if (this._dim(r, 0) === "Success") completed += count;
            });

            const today = new Date();
            const daysElapsed = Math.min(CYCLE_LENGTH_DAYS, Math.max(0, Math.round((today - CYCLE_START) / 86400000) + 1));
            const expectedPct = daysElapsed <= 0 ? 0 : Math.round(AE_EXPECTED_PACING[daysElapsed - 1]);
            const actualPct = totalSetUp ? Math.round((completed / totalSetUp) * 100) : 0;
            const delta = actualPct - expectedPct;
            const status = delta >= -5 ? "onpace" : delta >= -15 ? "watch" : "behind";
            const statusLabel = status === "onpace" ? (delta >= 5 ? "Ahead of Pace" : "On Pace") : status === "watch" ? "Watch" : "Behind Pace";

            return { totalSetUp, completed, daysElapsed, expectedPct, actualPct, status, statusLabel };
        }

        // A literal thermometer: rounded stem + bulb, liquid fill rising
        // from the bulb, a thin glass highlight for a "stylish, not corny"
        // finish, tick marks down one side, and a dashed expected-pace
        // notch crossing the stem. Adapted verbatim from
        // sac-member-pace-widget -- only the CSS color variables differ.
        _thermSvg(actualPct, expectedPct, status) {
            const w = 110, h = 280;
            const cx = 46;
            const stemHalfW = 13;
            const stemTop = 14;
            const stemBottom = 202;   // where the stem visually meets the bulb
            const bulbCy = 226;
            const bulbR = 26;
            const colorVar = status === "onpace" ? "var(--success)" : status === "watch" ? "var(--warning)" : "var(--danger)";

            const pctToY = (pct) => stemBottom - (Math.max(0, Math.min(100, pct)) / 100) * (stemBottom - stemTop);
            const fillTopY = pctToY(actualPct);
            const expectedY = pctToY(expectedPct);

            const ticks = [0, 25, 50, 75, 100].map((pct) => {
                const y = pctToY(pct);
                return `<line x1="${(cx + stemHalfW + 4).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx + stemHalfW + 10).toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--text-soft)" stroke-width="1.5"></line>
                        <text x="${(cx + stemHalfW + 14).toFixed(1)}" y="${(y + 3).toFixed(1)}" font-size="8.5" fill="var(--text-soft)">${pct}</text>`;
            }).join("");

            return `<svg viewBox="0 0 ${w} ${h}" class="therm-svg" role="img" aria-label="Enrollment pace thermometer">
                <defs>
                    <clipPath id="stemClip">
                        <rect x="${cx - stemHalfW}" y="${stemTop}" width="${stemHalfW * 2}" height="${stemBottom - stemTop + 40}" rx="${stemHalfW}"></rect>
                    </clipPath>
                </defs>

                <!-- bulb (always "full", same color as current fill) -->
                <circle cx="${cx}" cy="${bulbCy}" r="${bulbR}" fill="${colorVar}"></circle>
                <circle cx="${cx}" cy="${bulbCy}" r="${bulbR}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"></circle>

                <!-- stem track (empty) -->
                <rect x="${cx - stemHalfW}" y="${stemTop}" width="${stemHalfW * 2}" height="${stemBottom - stemTop}" rx="${stemHalfW}" fill="var(--track)"></rect>

                <!-- stem fill (clipped to the rounded stem shape) -->
                <g clip-path="url(#stemClip)">
                    <rect x="${cx - stemHalfW}" y="${fillTopY.toFixed(1)}" width="${stemHalfW * 2}" height="${(stemBottom - fillTopY + 40).toFixed(1)}" fill="${colorVar}"></rect>
                </g>

                <!-- stem outline -->
                <rect x="${cx - stemHalfW}" y="${stemTop}" width="${stemHalfW * 2}" height="${stemBottom - stemTop}" rx="${stemHalfW}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"></rect>

                <!-- glass highlight -->
                <rect x="${(cx - stemHalfW + 3).toFixed(1)}" y="${stemTop + 4}" width="4" height="${stemBottom - stemTop - 8}" rx="2" fill="rgba(255,255,255,0.35)"></rect>

                <!-- expected-pace marker -->
                <line x1="${(cx - stemHalfW - 6).toFixed(1)}" y1="${expectedY.toFixed(1)}" x2="${(cx + stemHalfW + 6).toFixed(1)}" y2="${expectedY.toFixed(1)}" stroke="var(--text)" stroke-width="2" stroke-dasharray="3,2"></line>

                ${ticks}
            </svg>`;
        }

        _render() {
            const root = this._shadowRoot;
            const p = this._computePace();

            root.getElementById("asof").textContent = "As of: " + new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
            root.getElementById("dataBadge").textContent = this._usingMockData ? "Mock Data — Preview" : "Live";

            root.getElementById("thermSvg").innerHTML = this._thermSvg(p.actualPct, p.expectedPct, p.status);
            const actualEl = root.getElementById("actualPct");
            actualEl.textContent = p.actualPct + "%";
            actualEl.className = "readout-actual " + p.status;
            root.getElementById("expectedSub").textContent = "Expected " + p.expectedPct + "% by today (dashed line)";
            root.getElementById("statusBadgeWrap").innerHTML = `<span class="badge ${p.status}">${p.statusLabel}</span>`;

            root.getElementById("statCompleted").textContent = p.completed.toLocaleString();
            root.getElementById("statSetUp").textContent = p.totalSetUp.toLocaleString();
            root.getElementById("statDay").textContent = p.daysElapsed + " of " + CYCLE_LENGTH_DAYS;
        }
    }

    customElements.define("com-porticobenefits-aepace", AEPace);
})();
