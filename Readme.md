# Overview

This application is a two-panel interactive selector built with Chart.js v4 and plugins (Annotation, DataLabels) loaded via UMD in index.html. It visualizes relationships for water systems and supports fast, responsive interaction.

Core formulas (water):
- Power/Flow (left chart): Q_lh = HEAT_FACTOR × P_kW / ΔT_C. For each selected ΔT, we draw a line segment within the visible axes range by computing its two visible endpoints and rendering a straight line between them.
- Valve/Pressure Drop (right chart): Q_m3h = Q_lh / 1000; Δp_bar = (Q_m3h / Kvs)^2; Δp_kPa = 100 × Δp_bar. For each selected Kvs, we compute the two visible endpoints of the Δp–Q curve and render the clipped segment.

Recent interaction and UI improvements:
- Hover-only inline labels: End-of-line labels (via chartjs-plugin-datalabels) now display only for the currently hovered dataset and only at its last point. Labels are clamped inside the chart area (clamp: true) and drawn above other elements (z: 1000) for reliable visibility.
- Tracking circle on hover: A lightweight custom plugin (“hoverTracker”) draws a small circle that follows the mouse along the hovered line. The circle updates on every hover event for smooth feedback. Default tooltips are disabled to keep the view clean.
- Proximity snapping: Hover detection snaps to the nearest dataset line within a device-pixel–aware threshold (PICK_TOL_PX scaled by devicePixelRatio). The current implementation projects the mouse to the straight line segment spanned by the first and last visible points of each dataset, then selects the nearest within the threshold.
- Robust hover interaction: Charts use interaction: { mode: 'dataset', intersect: false } so hovering near a line reliably activates it without requiring pixel-perfect intersection. The cursor changes to a pointer when a line is active.
- Performance-focused rendering: animation: false and parsing: false ensure snappy updates; hover re-renders use chart.update('none') for minimal overhead.
- Legend and visibility sync: Custom HTML legends mirror dataset labels and colors and are synchronized with the checkbox groups that control ΔT and Kvs visibility.
- Click workflows preserved: A 14 px tolerance (PICK_TOL_PX) governs selection. Left→Right: select nearest ΔT at a chosen Q to compute/sync values. Right→Left: select nearest Kvs at a chosen Q and sync the companion chart with reference guides and intersection annotations.
- Internationalization: UI text is localized via i18n files (EN/DE/PL/ZH).

Notes:
- Each dataset segment is computed within the current axes rectangle; only the visible portion is rendered. Inline label font size and offsets scale with chart width for consistent readability.
- Security and UX: No tooltips or extraneous overlays; only the hovered line’s end label and the tracking circle are shown to reduce clutter and highlight focus.