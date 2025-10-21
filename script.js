/* ----- Register plugins (per docs) ----- */
try {
    if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);
    if (typeof ChartAnnotation !== 'undefined') Chart.register(ChartAnnotation);
} catch (e) {
    console.error('Chart.js plugin registration failed:', e);
}

/* ----- Constants ----- */
import {
    SUPPORTED_LANGS,
    DT_VALUES,
    KVS_VALUES,
    DT_DT_VALUES_MIN,
    DT_DT_VALUES_MAX,
    KVS_VALUES_MIN,
    KVS_VALUES_MAX,
    QMIN,
    QMAX,
    PMIN,
    PMAX,
    DPMIN,
    DPMAX,
    PICK_TOL_PX,
    COLOR_GUIDE,
    COLORS_DT,
    COLORS_KVS,
    lightGrid,
    lightTick,
    CHART_PADDING_TOP,
    DATASET_BORDER_WIDTH,
    DATASET_BORDER_WIDTH_HIGHLIGHT,
    GUIDE_POINT_RADIUS,
    SERIES_POINT_RADIUS,
    LEGEND_LABEL_PADDING,
    LEGEND_BOX_WIDTH,
    LEGEND_BOX_HEIGHT,
    REF_LINE_COLOR,
    REF_LINE_DASH,
    REF_LINE_WIDTH,
    ARROW_HEAD_LENGTH,
    ARROW_HEAD_WIDTH,
    ARROW_LINE_WIDTH,
    INTERSECTION_LABEL_BG,
    INTERSECTION_LABEL_FG,
    DATALABEL_BG,
    DATALABEL_COLOR,
    DATALABEL_BORDER,
    DATALABEL_BORDER_WIDTH,
    DATALABEL_BORDER_RADIUS,
    DATALABEL_OFFSET,
    DATALABEL_PADDING,
    DATALABEL_FONT_MIN,
    DATALABEL_FONT_MAX,
    LABEL_SPACING_DEFAULT,
    HEAT_FACTOR,
    LPH_PER_M3H,
    DP_KPA_PER_BAR,
    KPATO_MH2O
} from './constants.js';


/* ----- Elements ----- */
const elChartP = document.getElementById('chartPower');
const elChartDP = document.getElementById('chartDP');
const dtBox = document.getElementById('dt-boxes');
const kvsBox = document.getElementById('kvs-boxes');
const emptyEl = document.getElementById('empty-state');
const showLegendsEl = document.getElementById('show-legends');
const summaryEl = document.getElementById('summary-panel');
const summaryContentEl = document.getElementById('summary-content');
const hoverTooltipP = document.getElementById('hoverTooltipP');
const hoverTooltipDP = document.getElementById('hoverTooltipDP');
// Settings modal elements
const settingsBtn = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const settingsClose = document.getElementById('settings-close');
const settingsDone = document.getElementById('settings-done');
const settingsBackdrop = settingsModal ? settingsModal.querySelector('.modal-backdrop') : null;

// Custom Values modal elements
const customModal = document.getElementById('custom-modal');
const customTitle = document.getElementById('custom-title');
const customInstructions = document.getElementById('custom-instructions');
const customInput = document.getElementById('custom-input');
const customError = document.getElementById('custom-error');
const customClose = document.getElementById('custom-close');
const customCancel = document.getElementById('custom-cancel');
const customConfirm = document.getElementById('custom-confirm');
const customBackdrop = customModal ? customModal.querySelector('.modal-backdrop') : null;
let customTarget = null; // 'dt' | 'kvs'

/* ----- Render checkbox groups ----- */
function renderBoxes(container, values, prefix, formatter) {
    container.innerHTML = values.map((v, i) => `
    <label class="checkbox" for="${prefix}-${i}">
      <input type="checkbox" id="${prefix}-${i}" value="${v}" checked>
      <span class="tag">${formatter(v)}</span>
    </label>
  `).join('');
}
// Active values (mutable by Custom modal)
let activeDT = [...DT_VALUES];
let activeKVS = [...KVS_VALUES];
renderBoxes(dtBox, activeDT, 'dt', v => fmt(v, 1) + '°');
renderBoxes(kvsBox, activeKVS, 'kvs', v => fmt(v, 1));

/* Select all/none handlers (synchronize visibility only) */
document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
        const grp = btn.dataset.target;
        const action = btn.dataset.action;
        if (action === 'custom') {
            openCustom(grp);
            return;
        }
        const check = action === 'select-all';
        document.querySelectorAll(`.checkboxes[data-group="${grp}"] input[type="checkbox"]`)
            .forEach(cb => cb.checked = check);
        // synchronize chart visibility with updated checkboxes
        applyVisibilityFromCheckboxes();
    });
});
document.addEventListener('change', e => {
    if (e.target.matches('.checkboxes input[type="checkbox"]')) {
        // reflect checkbox changes without rebuilding datasets
        applyVisibilityFromCheckboxes();
    }
});
if (showLegendsEl) {
    showLegendsEl.addEventListener('change', rebuild);
}
// Settings modal handlers
function openSettings() {
    if (!settingsModal) return;
    settingsModal.hidden = false;
    settingsModal.setAttribute('aria-hidden', 'false');
    (settingsClose || settingsDone || settingsModal).focus();
}

function closeSettings() {
    if (!settingsModal) return;
    settingsModal.hidden = true;
    settingsModal.setAttribute('aria-hidden', 'true');
}
if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettings);
}
if (settingsClose) {
    settingsClose.addEventListener('click', closeSettings);
}
if (settingsDone) {
    settingsDone.addEventListener('click', closeSettings);
}
if (settingsBackdrop) {
    settingsBackdrop.addEventListener('click', closeSettings);
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal && !settingsModal.hidden) {
        closeSettings();
    }
    if (e.key === 'Escape' && customModal && !customModal.hidden) {
        closeCustom();
    }
    const am = document.getElementById('axes-modal');
    if (e.key === 'Escape' && am && am.getAttribute('aria-hidden') === 'false') {
        closeAxisModal();
    }
});

// ----- Custom values modal -----
function openCustom(grp) {
    if (!customModal) return;
    customTarget = grp === 'kvs' ? 'kvs' : 'dt';
    const isDT = customTarget === 'dt';
    const min = isDT ? DT_DT_VALUES_MIN : KVS_VALUES_MIN;
    const max = isDT ? DT_DT_VALUES_MAX : KVS_VALUES_MAX;
    // Set localized title and instructions
    if (customTitle) customTitle.textContent = t(isDT ? 'customModal.title.dt' : 'customModal.title.kvs');
    if (customInstructions) customInstructions.innerHTML = tr(isDT ? 'customModal.instructions.dt' : 'customModal.instructions.kvs', {
        min: fmt(min, 1),
        max: fmt(max, 1)
    });
    if (customInput) customInput.setAttribute('placeholder', t(isDT ? 'customModal.placeholder.dt' : 'customModal.placeholder.kvs'));
    // Prefill with current active values, locale-aware
    const current = isDT ? activeDT : activeKVS;
    if (customInput) customInput.value = current.map(v => fmt(v, 1)).join('; ');
    if (customError) customError.textContent = '';
    customModal.hidden = false;
    customModal.setAttribute('aria-hidden', 'false');
    (customInput || customClose || customModal).focus();
}

function closeCustom() {
    if (!customModal) return;
    customModal.hidden = true;
    customModal.setAttribute('aria-hidden', 'true');
}

function parseLocaleNumber(s) {
    if (typeof s !== 'string') return NaN;
    const cleaned = s.trim().replace(/\s+/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : NaN;
}

function applyCustomValues() {
    if (!customTarget || !customModal) return;
    const isDT = customTarget === 'dt';
    const min = isDT ? DT_DT_VALUES_MIN : KVS_VALUES_MIN;
    const max = isDT ? DT_DT_VALUES_MAX : KVS_VALUES_MAX;
    const raw = (customInput?.value ?? '').trim();
    // Split by semicolons; allow spaces around
    const parts = raw.length ? raw.split(';') : [];
    // Validate numeric entries
    const nums = parts
        .map(p => parseLocaleNumber(p))
        .filter(v => !Number.isNaN(v));
    const hadNonNumeric = parts.some(p => p.trim().length && Number.isNaN(parseLocaleNumber(p)));
    if (hadNonNumeric) {
        if (customError) customError.textContent = t('customModal.error.numeric');
        return;
    }
    // Range validation
    const outOfRange = nums.some(v => v < min || v > max);
    if (outOfRange) {
        if (customError) customError.textContent = t('customModal.error.range');
        return;
    }
    // Build unique sorted list
    const uniq = Array.from(new Set(nums.map(v => Number(v.toFixed(2))))).sort((a, b) => a - b);
    if (uniq.length === 0) {
        if (customError) customError.textContent = t('customModal.error.numeric');
        return;
    }
    // Preserve previous selections
    const prevSelected = isDT ? getSelected(dtBox) : getSelected(kvsBox);
    if (isDT) {
        activeDT = uniq;
        renderBoxes(dtBox, activeDT, 'dt', v => fmt(v, 1) + '°');
        // Restore previous checks where possible
        dtBox.querySelectorAll('input[type="checkbox"]').forEach(input => {
            const val = parseFloat(input.value);
            if (prevSelected.includes(val)) input.checked = true;
        });
    } else {
        activeKVS = uniq;
        renderBoxes(kvsBox, activeKVS, 'kvs', v => fmt(v, 1));
        kvsBox.querySelectorAll('input[type="checkbox"]').forEach(input => {
            const val = parseFloat(input.value);
            if (prevSelected.includes(val)) input.checked = true;
        });
    }
    // Rebuild datasets with new active arrays and sync UI
    rebuild();

    // Hide hover labels when cursor leaves the canvas area (Power chart)
    if (elChartP) {
        const hideHoverP = () => {
            if (hoverTooltipP) hideTooltip(hoverTooltipP);
            const exp = chartPower.$_user_ || (chartPower.$_user_ = {});
            exp.hoverPoint = null;
            exp.hoveredDataset = null;
            chartPower.update('none');
            elChartP.style.cursor = 'default';
        };
        elChartP.addEventListener('mouseleave', hideHoverP);
        elChartP.addEventListener('mouseout', (e) => {
            const rt = e && e.relatedTarget ? e.relatedTarget : null;
            if (!rt || !elChartP.contains(rt)) hideHoverP();
        });
        // Also hide when leaving the canvas wrapper or on pointer cancellation (more robust)
        const wrapP = elChartP.parentElement;
        if (wrapP && !wrapP._hoverHideBoundP) {
            wrapP.addEventListener('pointerleave', hideHoverP);
            wrapP.addEventListener('mouseleave', hideHoverP);
            wrapP.addEventListener('touchend', hideHoverP, {
                passive: true
            });
            wrapP.addEventListener('pointercancel', hideHoverP);
            wrapP._hoverHideBoundP = true;
        }
        if (!window._hoverHideBlurP) {
            window.addEventListener('blur', hideHoverP);
            window._hoverHideBlurP = true;
        }
    }

    // Hide hover labels when cursor leaves the canvas area (Pressure Drop chart)
    if (elChartDP) {
        const hideHoverDP = () => {
            if (hoverTooltipDP) hideTooltip(hoverTooltipDP);
            const exp = chartDP.$_user_ || (chartDP.$_user_ = {});
            exp.hoverPoint = null;
            exp.hoveredDataset = null;
            chartDP.update('none');
            elChartDP.style.cursor = 'default';
        };
        elChartDP.addEventListener('mouseleave', hideHoverDP);
        elChartDP.addEventListener('mouseout', (e) => {
            const rt = e && e.relatedTarget ? e.relatedTarget : null;
            if (!rt || !elChartDP.contains(rt)) hideHoverDP();
        });
        // Also hide when leaving the canvas wrapper or on pointer cancellation (more robust)
        const wrapDP = elChartDP.parentElement;
        if (wrapDP && !wrapDP._hoverHideBoundDP) {
            wrapDP.addEventListener('pointerleave', hideHoverDP);
            wrapDP.addEventListener('mouseleave', hideHoverDP);
            wrapDP.addEventListener('touchend', hideHoverDP, {
                passive: true
            });
            wrapDP.addEventListener('pointercancel', hideHoverDP);
            wrapDP._hoverHideBoundDP = true;
        }
        if (!window._hoverHideBlurDP) {
            window.addEventListener('blur', hideHoverDP);
            window._hoverHideBlurDP = true;
        }
    }
    applyVisibilityFromCheckboxes();
    applyTranslations();
    closeCustom();
}
// Wire up modal controls
if (customClose) customClose.addEventListener('click', closeCustom);
if (customCancel) customCancel.addEventListener('click', closeCustom);
if (customBackdrop) customBackdrop.addEventListener('click', closeCustom);
if (customConfirm) customConfirm.addEventListener('click', applyCustomValues);

// ===== Axes UI (dynamic ranges) =====
let axesModal = null;
let axesElems = null;

function ensureAxisModal() {
    if (axesModal) return axesModal;
    axesModal = document.getElementById('axes-modal');
    if (!axesModal) return null;
    axesElems = {
        modal: axesModal,
        backdrop: axesModal.querySelector('.modal-backdrop'),
        close: axesModal.querySelector('#axes-close'),
        cancel: axesModal.querySelector('#axes-cancel'),
        apply: axesModal.querySelector('#axes-apply'),
        qmin: axesModal.querySelector('#ax-qmin'),
        qmax: axesModal.querySelector('#ax-qmax'),
        pmin: axesModal.querySelector('#ax-pmin'),
        pmax: axesModal.querySelector('#ax-pmax'),
        dpmin: axesModal.querySelector('#ax-dpmin'),
        dpmax: axesModal.querySelector('#ax-dpmax'),
        err: axesModal.querySelector('#axes-error'),
    };
    const close = () => closeAxisModal();
    axesElems.backdrop?.addEventListener('click', close);
    axesElems.close?.addEventListener('click', close);
    axesElems.cancel?.addEventListener('click', close);
    axesElems.apply?.addEventListener('click', () => {
        if (!axesElems) return;
        const vals = {
            qMin: Number(axesElems.qmin.value),
            qMax: Number(axesElems.qmax.value),
            pMin: Number(axesElems.pmin.value),
            pMax: Number(axesElems.pmax.value),
            dpMin: Number(axesElems.dpmin.value),
            dpMax: Number(axesElems.dpmax.value),
        };
        const bad = [
            !Number.isFinite(vals.qMin) || vals.qMin <= 0,
            !Number.isFinite(vals.qMax) || vals.qMax <= 0,
            !Number.isFinite(vals.pMin) || vals.pMin <= 0,
            !Number.isFinite(vals.pMax) || vals.pMax <= 0,
            !Number.isFinite(vals.dpMin) || vals.dpMin <= 0,
            !Number.isFinite(vals.dpMax) || vals.dpMax <= 0,
            vals.qMin >= vals.qMax,
            vals.pMin >= vals.pMax,
            vals.dpMin >= vals.dpMax,
        ].some(Boolean);
        if (bad) {
            if (axesElems.err) axesElems.err.textContent = t('axes.error');
            return;
        }
        AX.qMin = vals.qMin;
        AX.qMax = vals.qMax;
        AX.pMin = vals.pMin;
        AX.pMax = vals.pMax;
        AX.dpMin = vals.dpMin;
        AX.dpMax = vals.dpMax;
        applyAxisToCharts();
        closeAxisModal();
    });
    return axesModal;
}

function openAxisModal() {
    ensureAxisModal();
    if (!axesElems) return;
    axesElems.qmin.value = AX.qMin;
    axesElems.qmax.value = AX.qMax;
    axesElems.pmin.value = AX.pMin;
    axesElems.pmax.value = AX.pMax;
    axesElems.dpmin.value = AX.dpMin;
    axesElems.dpmax.value = AX.dpMax;
    if (axesElems.err) axesElems.err.textContent = '';
    axesModal.hidden = false;
    axesModal.setAttribute('aria-hidden', 'false');
    (axesElems.qmin || axesElems.close || axesModal).focus();
}

function closeAxisModal() {
    if (!axesModal) return;
    axesModal.hidden = true;
    axesModal.setAttribute('aria-hidden', 'true');
}

function initAxesUI() {
    const btns = document.querySelectorAll('.btn.ax-btn');
    btns.forEach((btn) => {
        if (!btn._axBound) {
            btn.addEventListener('click', openAxisModal);
            btn._axBound = true;
        }
        btn.title = t('axes.button');
        btn.setAttribute('aria-label', t('axes.button'));
    });
}

function applyAxisToCharts() {
    if (typeof chartPower !== 'undefined' && chartPower?.options?.scales) {
        chartPower.options.scales.xP.min = AX.pMin;
        chartPower.options.scales.xP.max = AX.pMax;
        chartPower.options.scales.yQ.min = AX.qMin;
        chartPower.options.scales.yQ.max = AX.qMax;
    }
    if (typeof chartDP !== 'undefined' && chartDP?.options?.scales) {
        chartDP.options.scales.xDP.min = AX.dpMin;
        chartDP.options.scales.xDP.max = AX.dpMax;
        chartDP.options.scales.yQ.min = AX.qMin;
        chartDP.options.scales.yQ.max = AX.qMax;
    }
    rebuild();
    clearGuides();
}
try {
    initAxesUI();
} catch (_) {}


/* ----- Helpers ----- */
function getSelected(container) {
    return [...container.querySelectorAll('input:checked')].map(i => parseFloat(i.value));
}

// Generic number formatter for tooltips and ticks
function fmt(v, decimals = 0) {
    const num = Number(v);
    if (!Number.isFinite(num)) return '';
    const locale = (globalThis.I18N && globalThis.I18N.current) ? globalThis.I18N.current : 'en';
    return num.toLocaleString(locale, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: 0
    });
}

// Robust event-to-canvas offset helper for Chart.js clicks
function getClickOffset(evt, chart) {
    const e = evt && evt.native ? evt.native : evt;
    if (e && typeof e.offsetX === 'number' && typeof e.offsetY === 'number') {
        return {
            x: e.offsetX,
            y: e.offsetY
        };
    }
    const rect = chart?.canvas?.getBoundingClientRect?.() || {
        left: 0,
        top: 0
    };
    const cx = (e && (e.clientX ?? e.x)) ?? 0;
    const cy = (e && (e.clientY ?? e.y)) ?? 0;
    return {
        x: cx - rect.left,
        y: cy - rect.top
    };
}

// Subtle tooltip fade helpers (150–200ms)
function showTooltip(el) {
    if (!el) return;
    if (el._hideToId) {
        clearTimeout(el._hideToId);
        el._hideToId = null;
    }
    el.hidden = false;
    el.classList.remove('is-hiding');
    // Force reflow so the transition runs when adding is-visible
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.classList.add('is-visible');
}

function hideTooltip(el, duration = 180) {
    if (!el) return;
    if (el.hidden) return;
    el.classList.remove('is-visible');
    el.classList.add('is-hiding');
    if (el._hideToId) clearTimeout(el._hideToId);
    el._hideToId = setTimeout(() => {
        el.hidden = true;
        el.classList.remove('is-hiding');
        el._hideToId = null;
    }, duration);
}

// Add helper to distribute label offsets vertically to avoid overlap
function verticalOffsets(chart, Qy, n, spacing = LABEL_SPACING_DEFAULT) {
    const yPix = chart.scales.yQ.getPixelForValue(Qy);
    const top = chart.chartArea.top + 8;
    const bottom = chart.chartArea.bottom - 8;
    const minAdj = top - yPix;
    const maxAdj = bottom - yPix;
    if (n <= 1) return [0];
    const res = [];
    const even = n % 2 === 0;
    if (even) {
        const k = n / 2;
        for (let i = 0; i < n; i++) {
            const idx = i - (k - 0.5);
            res.push(Math.max(minAdj, Math.min(maxAdj, idx * spacing)));
        }
    } else {
        const k = (n - 1) / 2;
        for (let i = -k; i <= k; i++) {
            res.push(Math.max(minAdj, Math.min(maxAdj, i * spacing)));
        }
    }
    return res;
}

/* ----- Dataset generation (no external data) ----- */
// Dynamic axis state initialized from constants
const AX = {
    qMin: QMIN,
    qMax: QMAX,
    pMin: PMIN,
    pMax: PMAX,
    dpMin: DPMIN,
    dpMax: DPMAX
};

function dtDatasets(selectedDT) {
    // For each ΔT, compute the visible segment within the current axes rect and use 2 endpoints
    return selectedDT.map((dt, i) => {
        const m = HEAT_FACTOR / dt; // Q = m * P
        const candidates = [{
                x: AX.pMin,
                y: m * AX.pMin
            },
            {
                x: AX.pMax,
                y: m * AX.pMax
            },
            {
                x: AX.qMin / m,
                y: AX.qMin
            },
            {
                x: AX.qMax / m,
                y: AX.qMax
            }
        ].filter(p => p.x >= AX.pMin && p.x <= AX.pMax && p.y >= AX.qMin && p.y <= AX.qMax);

        if (candidates.length < 2) return {
            label: `${t('tooltip.power.dt')} ${fmt(dt, 1)}°C`,
            data: [],
            borderColor: COLORS_DT[i % COLORS_DT.length],
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointHitRadius: 0,
            tension: 0,
            yAxisID: 'yQ',
            xAxisID: 'xP',
            _isDT: true,
            _dt: dt,
            datalabels: lineEndLabelCfg('left')
        };

        candidates.sort((a, b) => a.x - b.x);
        const data = [candidates[0], candidates[candidates.length - 1]];

        return {
            label: `${t('tooltip.power.dt')} ${fmt(dt, 1)}°C`,
            data,
            borderColor: COLORS_DT[i % COLORS_DT.length],
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointHitRadius: 0,
            datalabels: lineEndLabelCfg('left'),
            tension: 0,
            yAxisID: 'yQ',
            xAxisID: 'xP',
            _isDT: true,
            _dt: dt
        };
    });
}

function kvsDatasets(selectedKVS) {
    // For each Kvs, compute visible segment clipped to the axes rect
    return selectedKVS.map((K, i) => {
        const f = (dp) => LPH_PER_M3H * K * Math.sqrt(dp / DP_KPA_PER_BAR); // Q(dp)
        const inv = (Q) => DP_KPA_PER_BAR * Math.pow(Q / (LPH_PER_M3H * K), 2); // dp(Q)
        const candidates = [{
                x: AX.dpMin,
                y: f(AX.dpMin)
            },
            {
                x: AX.dpMax,
                y: f(AX.dpMax)
            },
            {
                x: inv(AX.qMin),
                y: AX.qMin
            },
            {
                x: inv(AX.qMax),
                y: AX.qMax
            }
        ].filter(p => p.x >= AX.dpMin && p.x <= AX.dpMax && p.y >= AX.qMin && p.y <= AX.qMax);

        if (candidates.length < 2) return {
            label: `${t('charts.dp.axisNote')} ${fmt(K, 1)}`,
            data: [],
            borderColor: COLORS_KVS[i % COLORS_KVS.length],
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointHitRadius: 0,
            tension: 0,
            yAxisID: 'yQ',
            xAxisID: 'xDP',
            _isKVS: true,
            _kvs: K,
            datalabels: lineEndLabelCfg('right')
        };

        candidates.sort((a, b) => a.x - b.x);
        const data = [candidates[0], candidates[candidates.length - 1]];

        return {
            label: `${t('charts.dp.axisNote')} ${fmt(K, 1)}`,
            data,
            borderColor: COLORS_KVS[i % COLORS_KVS.length],
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointHitRadius: 0,
            datalabels: lineEndLabelCfg('right'),
            tension: 0,
            yAxisID: 'yQ',
            xAxisID: 'xDP',
            _isKVS: true,
            _kvs: K
        };
    });
}

/* ----- Datalabels inline labels (with simple collision avoidance) ----- */
function lineEndLabelCfg(side) {
    return {
        align: side === 'left' ? 'start' : 'end',
        anchor: 'end',
        clamp: true,
        z: 1000,
        backgroundColor: DATALABEL_BG,
        borderColor: DATALABEL_BORDER,
        borderWidth: DATALABEL_BORDER_WIDTH,
        borderRadius: DATALABEL_BORDER_RADIUS,
        color: DATALABEL_COLOR,
        padding: DATALABEL_PADDING,
        font: (ctx) => {
            const chart = ctx.chart;
            const size = Math.max(DATALABEL_FONT_MIN, Math.min(DATALABEL_FONT_MAX, Math.round(chart.width * 0.012)));
            return {
                size,
                weight: '600',
                family: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
            };
        },
        offset: (ctx) => {
            const chart = ctx.chart;
            const size = Math.max(DATALABEL_FONT_MIN, Math.min(DATALABEL_FONT_MAX, Math.round(chart.width * 0.012)));
            const base = Math.round(DATALABEL_OFFSET * (size / 12));
            return side === 'left' ? -base : base;
        },
        display: (ctx) => {
            const chart = ctx.chart;
            const exp = chart.$_user_ || {};
            const hoveredDs = exp.hoveredDataset;
            const isHoveredDataset = hoveredDs != null && hoveredDs === ctx.datasetIndex;
            const isLast = ctx.dataIndex === ctx.dataset.data.length - 1;
            return isHoveredDataset && isLast;
        },
        formatter: (value, ctx) => ctx.dataset.label
    };
}

// Hover tracker plugin draws a small circle following the cursor over the hovered dataset line
const hoverTracker = {
    id: 'hoverTracker',
    afterDraw(chart, args, pluginOptions) {
        const exp = chart.$_user_;
        if (!exp || exp.hoveredDataset == null || !exp.hoverPoint) return;
        const ctx = chart.ctx;
        const {
            x,
            y
        } = exp.hoverPoint;
        ctx.save();
        ctx.fillStyle = (pluginOptions && pluginOptions.color) || '#0f172a';
        ctx.strokeStyle = (pluginOptions && pluginOptions.borderColor) || '#ffffff';
        ctx.lineWidth = (pluginOptions && pluginOptions.borderWidth) || 2;
        const r = (pluginOptions && pluginOptions.radius) || 4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
};
Chart.register(hoverTracker);

// Grey band plugin for Pressure Drop chart (renders at bottom layer)
const dpBandPlugin = {
    id: 'dpBand',
    beforeDraw(chart, args, opts) {
        // Only apply to the Δp chart which has xDP and yQ scales
        const xScale = chart.scales.xDP;
        const yScale = chart.scales.yQ;
        const area = chart.chartArea;
        if (!xScale || !yScale || !area) return;
        const min = (opts && typeof opts.min === 'number') ? opts.min : 3;
        const max = (opts && typeof opts.max === 'number') ? opts.max : 15;
        const left = Math.max(area.left, xScale.getPixelForValue(min));
        const right = Math.min(area.right, xScale.getPixelForValue(max));
        if (right <= left) return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = (opts && opts.fill) || 'rgba(203,213,225,0.25)'; // light gray with opacity
        ctx.fillRect(left, area.top, right - left, area.bottom - area.top);
        ctx.restore();
    }
};
Chart.register(dpBandPlugin);
/* ----- Charts (two panels) ----- */
// const lightGrid = '#e5e7eb', lightTick = '#334155';

const chartPower = new Chart(elChartP.getContext('2d'), {
    type: 'line',
    data: {
        datasets: []
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        animation: false,
        layout: {
            padding: {
                top: CHART_PADDING_TOP
            }
        },
        interaction: {
            mode: 'dataset',
            intersect: false
        },
        elements: {
            point: {
                radius: 0,
                hoverRadius: 0,
                hitRadius: 0,
                borderWidth: 0
            }
        },
        scales: {
            xP: {
                type: 'logarithmic',
                min: AX.pMin,
                max: AX.pMax,
                title: {
                    display: true,
                    text: t('charts.power.axisX')
                },
                grid: {
                    color: lightGrid
                },
                ticks: {
                    color: lightTick,
                    callback: (v) => fmt(v)
                }
            },
            yQ: {
                type: 'logarithmic',
                min: AX.qMin,
                max: AX.qMax,
                title: {
                    display: true,
                    text: t('charts.power.axisY')
                },
                grid: {
                    color: lightGrid
                },
                ticks: {
                    color: lightTick,
                    callback: (v) => fmt(v)
                }
            }
        },
        plugins: {
            legend: {
                display: false,
                position: 'top',
                labels: {
                    padding: LEGEND_LABEL_PADDING,
                    boxWidth: LEGEND_BOX_WIDTH,
                    boxHeight: LEGEND_BOX_HEIGHT
                }
            },
            annotation: {
                annotations: {}
            },
            tooltip: {
                enabled: false
            },
            hoverTracker: {
                radius: 4,
                color: '#0f172a',
                borderColor: '#fff',
                borderWidth: 2
            },
            datalabels: {}
        },
        onClick: handleLeftClick,
        onHover: function(event, elements, chart) {
            if (window && window._usePointerHandlers && !(event && event._fromPointer)) return;
            const exp = chart.$_user_ || (chart.$_user_ = {});
            const {
                x: mxCss,
                y: myCss
            } = getClickOffset(event, chart);
            const area = chart.chartArea;
            // If pointer is outside chart area, clear state
            if (!area || mxCss < area.left || mxCss > area.right || myCss < area.top || myCss > area.bottom) {
                exp.hoverPoint = null;
                exp.hoveredDataset = null;
                chart.update('none');
                if (chart && chart.canvas) chart.canvas.style.cursor = 'default';
                if (hoverTooltipP) hideTooltip(hoverTooltipP);
                return;
            }
            const xScale = chart.scales.xP,
                yScale = chart.scales.yQ;
            const Pmouse = xScale.getValueForPixel(mxCss);
            let best = null,
                bestDist = Infinity,
                bestIdx = null;
            chart.data.datasets.forEach((ds, i) => {
                if (!ds || !ds._isDT) return;
                if (!chart.isDatasetVisible(i)) return;
                const m = HEAT_FACTOR / ds._dt; // Q = m * P
                const Qline = m * Pmouse;
                if (Qline < AX.qMin || Qline > AX.qMax || Pmouse < AX.pMin || Pmouse > AX.pMax) return;
                const yLinePix = yScale.getPixelForValue(Qline);
                const d = Math.abs(yLinePix - myCss);
                if (d < bestDist) {
                    best = {
                        dt: ds._dt,
                        Q: Qline,
                        P: Pmouse
                    };
                    bestDist = d;
                    bestIdx = i;
                }
            });
            const ok = best && bestDist <= PICK_TOL_PX;
            if (!ok) {
                exp.hoverPoint = null;
                exp.hoveredDataset = null;
                chart.update('none');
                if (chart && chart.canvas) chart.canvas.style.cursor = 'default';
                if (hoverTooltipP) hideTooltip(hoverTooltipP);
                return;
            }
            exp.hoverPoint = {
                x: xScale.getPixelForValue(best.P),
                y: yScale.getPixelForValue(best.Q)
            };
            exp.hoveredDataset = bestIdx;
            chart.update('none');
            if (chart && chart.canvas) chart.canvas.style.cursor = 'pointer';
            if (hoverTooltipP) {
                hoverTooltipP.textContent = `P: ${fmt(best.P, 2)} kW, Q: ${fmt(best.Q, 0)} l/h`;
                showTooltip(hoverTooltipP);
                const prevVis = hoverTooltipP.style.visibility;
                hoverTooltipP.style.visibility = 'hidden';
                const container = chart.canvas.parentElement;
                const cw = container ? container.clientWidth : 0;
                const ch = container ? container.clientHeight : 0;
                const tw = hoverTooltipP.offsetWidth || 120;
                const th = hoverTooltipP.offsetHeight || 36;
                hoverTooltipP.style.visibility = prevVis || 'visible';
                let left = mxCss + 12;
                let top = myCss - 12;
                if (left + tw + 8 > cw) left = mxCss - tw - 12;
                if (top + th + 8 > ch) top = myCss - th - 12;
                if (left < 8) left = 8;
                if (top < 8) top = 8;
                hoverTooltipP.style.transform = 'none';
                hoverTooltipP.style.left = `${left}px`;
                hoverTooltipP.style.top = `${top}px`;
            }
        }
    }
});

const chartDP = new Chart(elChartDP.getContext('2d'), {
    type: 'line',
    data: {
        datasets: []
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        animation: false,
        layout: {
            padding: {
                top: CHART_PADDING_TOP
            }
        },
        interaction: {
            mode: 'dataset',
            intersect: false
        },
        elements: {
            point: {
                radius: 0,
                hoverRadius: 0,
                hitRadius: 0,
                borderWidth: 0
            }
        },
        scales: {
            xDP: {
                type: 'logarithmic',
                min: AX.dpMin,
                max: AX.dpMax,
                title: {
                    display: true,
                    text: t('charts.dp.axisX')
                },
                grid: {
                    color: lightGrid
                },
                ticks: {
                    color: lightTick,
                    callback: (v) => fmt(v)
                }
            },
            yQ: {
                type: 'logarithmic',
                min: AX.qMin,
                max: AX.qMax,
                title: {
                    display: true,
                    text: t('charts.dp.axisY')
                },
                grid: {
                    color: lightGrid
                },
                ticks: {
                    color: lightTick,
                    callback: (v) => fmt(v)
                }
            }
        },
        plugins: {
            legend: {
                display: false,
                position: 'top',
                labels: {
                    padding: LEGEND_LABEL_PADDING,
                    boxWidth: LEGEND_BOX_WIDTH,
                    boxHeight: LEGEND_BOX_HEIGHT
                }
            },
            annotation: {
                annotations: {}
            },
            tooltip: {
                enabled: false
            },
            hoverTracker: {
                radius: 4,
                color: '#0f172a',
                borderColor: '#fff',
                borderWidth: 2
            },
            datalabels: {},
            dpBand: {
                min: 3,
                max: 15,
                fill: 'rgba(203,213,225,0.25)'
            }
        },
        onClick: handleRightClick,
        onHover: function(event, elements, chart) {
            if (window && window._usePointerHandlers && !(event && event._fromPointer)) return;
            const exp = chart.$_user_ || (chart.$_user_ = {});
            const {
                x: mxCss,
                y: myCss
            } = getClickOffset(event, chart);
            const area = chart.chartArea;
            if (!area || mxCss < area.left || mxCss > area.right || myCss < area.top || myCss > area.bottom) {
                exp.hoverPoint = null;
                exp.hoveredDataset = null;
                chart.update('none');
                if (chart && chart.canvas) chart.canvas.style.cursor = 'default';
                if (hoverTooltipDP) hideTooltip(hoverTooltipDP);
                return;
            }
            const xScale = chart.scales.xDP,
                yScale = chart.scales.yQ;
            const dpMouse = xScale.getValueForPixel(mxCss);
            let best = null,
                bestDist = Infinity,
                bestIdx = null;
            chart.data.datasets.forEach((ds, i) => {
                if (!ds || !ds._isKVS) return;
                if (!chart.isDatasetVisible(i)) return;
                const Qline = LPH_PER_M3H * ds._kvs * Math.sqrt(dpMouse / DP_KPA_PER_BAR); // Q(dp)
                if (Qline < AX.qMin || Qline > AX.qMax || dpMouse < AX.dpMin || dpMouse > AX.dpMax) return;
                const yLinePix = yScale.getPixelForValue(Qline);
                const d = Math.abs(yLinePix - myCss);
                if (d < bestDist) {
                    best = {
                        dp: dpMouse,
                        Q: Qline
                    };
                    bestDist = d;
                    bestIdx = i;
                }
            });
            const ok = best && bestDist <= PICK_TOL_PX;
            if (!ok) {
                exp.hoverPoint = null;
                exp.hoveredDataset = null;
                chart.update('none');
                if (chart && chart.canvas) chart.canvas.style.cursor = 'default';
                if (hoverTooltipDP) hideTooltip(hoverTooltipDP);
                return;
            }
            exp.hoverPoint = {
                x: xScale.getPixelForValue(best.dp),
                y: yScale.getPixelForValue(best.Q)
            };
            exp.hoveredDataset = bestIdx;
            chart.update('none');
            if (chart && chart.canvas) chart.canvas.style.cursor = 'pointer';
            // Update tooltip content/position for Pressure Drop chart
            if (hoverTooltipDP) {
                hoverTooltipDP.textContent = `Δp: ${fmt(best.dp, 2)} kPa, Q: ${fmt(best.Q, 0)} l/h`;
                showTooltip(hoverTooltipDP);
                const prevVis = hoverTooltipDP.style.visibility;
                hoverTooltipDP.style.visibility = 'hidden';
                const container = chart.canvas.parentElement;
                const cw = container ? container.clientWidth : 0;
                const ch = container ? container.clientHeight : 0;
                const tw = hoverTooltipDP.offsetWidth || 120;
                const th = hoverTooltipDP.offsetHeight || 36;
                hoverTooltipDP.style.visibility = prevVis || 'visible';
                let left = mxCss + 12;
                let top = myCss - 12;
                if (left + tw + 8 > cw) left = mxCss - tw - 8;
                if (top + th + 8 > ch) top = myCss - th - 12;
                if (left < 8) left = 8;
                if (top < 8) top = 8;
                hoverTooltipDP.style.transform = 'none';
                hoverTooltipDP.style.left = `${left}px`;
                hoverTooltipDP.style.top = `${top}px`;
            }
        }
    }
});

// Enable pointer-based hover handling for consistent behavior
if (typeof window !== 'undefined') window._usePointerHandlers = true;

// Pointer handlers for Power chart
if (elChartP && typeof chartPower !== 'undefined' && chartPower) {
    const handlePointerMoveP = (e) => {
        if (chartPower.options && typeof chartPower.options.onHover === 'function') {
            chartPower.options.onHover({
                native: e,
                _fromPointer: true
            }, [], chartPower);
        }
    };
    const handlePointerLeaveP = () => {
        const exp = chartPower.$_user_ || (chartPower.$_user_ = {});
        exp.hoverPoint = null;
        exp.hoveredDataset = null;
        chartPower.update('none');
        if (hoverTooltipP) hideTooltip(hoverTooltipP);
        elChartP.style.cursor = 'default';
    };
    elChartP.addEventListener('pointermove', handlePointerMoveP);
    elChartP.addEventListener('pointerleave', handlePointerLeaveP);
}

// Pointer handlers for Pressure Drop chart
if (elChartDP && typeof chartDP !== 'undefined' && chartDP) {
    const handlePointerMoveDP = (e) => {
        if (chartDP.options && typeof chartDP.options.onHover === 'function') {
            chartDP.options.onHover({
                native: e,
                _fromPointer: true
            }, [], chartDP);
        }
    };
    const handlePointerLeaveDP = () => {
        const exp = chartDP.$_user_ || (chartDP.$_user_ = {});
        exp.hoverPoint = null;
        exp.hoveredDataset = null;
        chartDP.update('none');
        if (hoverTooltipDP) hideTooltip(hoverTooltipDP);
        elChartDP.style.cursor = 'default';
    };
    elChartDP.addEventListener('pointermove', handlePointerMoveDP);
    elChartDP.addEventListener('pointerleave', handlePointerLeaveDP);
}

/* ----- Rebuild / refresh ----- */
// Custom HTML legend containers
const legendPowerEl = document.getElementById('legendPower');
const legendDPEl = document.getElementById('legendDP');

// Generate HTML markup for legend items using Chart.js legend label generator
function generateLegend(chart) {
    const defaultGen = Chart.defaults && Chart.defaults.plugins && Chart.defaults.plugins.legend && Chart.defaults.plugins.legend.labels && Chart.defaults.plugins.legend.labels.generateLabels;
    const optionGen = chart.options && chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels && chart.options.plugins.legend.labels.generateLabels;
    const gen = defaultGen || optionGen;
    const items = gen ? gen(chart) : chart.data.datasets.map((ds, i) => ({
        datasetIndex: i,
        text: ds.label,
        hidden: !chart.isDatasetVisible(i),
        strokeStyle: ds.borderColor,
        fillStyle: ds.borderColor
    }));
    return items.map(item => {
        const hidden = !!item.hidden || !chart.isDatasetVisible(item.datasetIndex);
        const color = item.strokeStyle || item.fillStyle || '#999';
        const swatchStyle = `background:${color};border-color:${color};${hidden ? 'opacity:0.4;' : ''}`;
        const hiddenClass = hidden ? ' is-hidden' : '';
        const pressed = hidden ? 'false' : 'true';
        return `<button type="button" class="legend-item${hiddenClass}" data-dindex="${item.datasetIndex}" aria-pressed="${pressed}" title="${item.text}"><span class="legend-swatch" style="${swatchStyle}"></span><span class="legend-label">${item.text}</span></button>`;
    }).join('');
}

// Render and wire up the HTML legend to toggle dataset visibility
function renderHtmlLegend(chart, container) {
    if (!container) return;
    container.innerHTML = generateLegend(chart);
    container.querySelectorAll('.legend-item').forEach(btn => {
        const idx = parseInt(btn.getAttribute('data-dindex'), 10);
        btn.addEventListener('click', () => {
            const nowVisible = !chart.isDatasetVisible(idx);
            chart.setDatasetVisibility(idx, nowVisible);
            chart.update('none');
            // Synchronize corresponding checkbox
            const ds = chart.data.datasets[idx];
            if (ds && ds._isDT) {
                const input = dtBox.querySelector(`input[type="checkbox"][value="${ds._dt}"]`);
                if (input) input.checked = nowVisible;
            } else if (ds && ds._isKVS) {
                const input = kvsBox.querySelector(`input[type="checkbox"][value="${ds._kvs}"]`);
                if (input) input.checked = nowVisible;
            }
            // Re-render to reflect current visibility state
            renderHtmlLegend(chart, container);
        });
    });
}

// Synchronize chart dataset visibility from current checkbox states and refresh legends
function updateBoth() {
    try {
        if (typeof chartPower !== 'undefined' && chartPower) {
            chartPower.$labelBoxes = [];
            chartPower.update('none');
        }
        if (typeof chartDP !== 'undefined' && chartDP) {
            chartDP.$labelBoxes = [];
            chartDP.update('none');
        }
    } catch (e) {
        console.warn('updateBoth error:', e);
    }
}

function applyVisibilityFromCheckboxes() {
    if (!chartPower || !chartDP) return;
    // Power chart (ΔT)
    chartPower.data.datasets.forEach((ds, i) => {
        if (ds._isDT) {
            const input = dtBox.querySelector(`input[type="checkbox"][value="${ds._dt}"]`);
            const checked = input ? !!input.checked : true;
            chartPower.setDatasetVisibility(i, checked);
        }
    });
    // Δp chart (Kvs)
    chartDP.data.datasets.forEach((ds, i) => {
        if (ds._isKVS) {
            const input = kvsBox.querySelector(`input[type="checkbox"][value="${ds._kvs}"]`);
            const checked = input ? !!input.checked : true;
            chartDP.setDatasetVisibility(i, checked);
        }
    });
    chartPower.update('none');
    chartDP.update('none');
    renderHtmlLegend(chartPower, legendPowerEl);
    renderHtmlLegend(chartDP, legendDPEl);

    // Update empty state and guides
    const selDT = getSelected(dtBox);
    const selKVS = getSelected(kvsBox);
    const empty = selDT.length === 0 || selKVS.length === 0;
    if (emptyEl) emptyEl.hidden = !empty;
    if (empty) {
        clearGuides();
    } else {
        // Keep summary visible with placeholder values until a selection is made via click
        renderSummary();
    }
}

// Always include all datasets and then sync visibility and legends
function rebuild() {
    // Wait for initial translations to load to ensure labels are stable on first paint
    if (!globalThis.I18N || !globalThis.I18N.ready) {
        if (!globalThis.I18N) {
            // I18N not defined yet; wait for the ready event once
            window.addEventListener('i18n-ready', () => rebuild(), {
                once: true
            });
        } else if (!I18N._rebuildScheduled) {
            I18N._rebuildScheduled = true;
            I18N.readyPromise.then(() => {
                I18N._rebuildScheduled = false;
                rebuild();
            });
        }
        return;
    }
    // Preserve current visibility state by dataset label
    const prevPwrVis = new Map(chartPower.data.datasets.map((d, i) => [d.label, chartPower.isDatasetVisible(i)]));
    const prevDpVis = new Map(chartDP.data.datasets.map((d, i) => [d.label, chartDP.isDatasetVisible(i)]));

    chartPower.$labelBoxes = [];
    chartDP.$labelBoxes = [];

    // Always include all datasets; visibility is controlled via checkboxes/legend
    let newDt = dtDatasets(activeDT);
    let newKvs = kvsDatasets(activeKVS);
    // apply previous visibility if labels match
    newDt = newDt.map(ds => ({
        ...ds,
        hidden: prevPwrVis.has(ds.label) ? !prevPwrVis.get(ds.label) : false
    }));
    newKvs = newKvs.map(ds => ({
        ...ds,
        hidden: prevDpVis.has(ds.label) ? !prevDpVis.get(ds.label) : false
    }));

    chartPower.data.datasets = newDt;
    chartDP.data.datasets = newKvs;
    // ensure default draw order
    chartPower.data.datasets.forEach(ds => {
        ds.order = 0;
    });
    chartDP.data.datasets.forEach(ds => {
        ds.order = 0;
    });

    // Legend toggle from checkbox (use custom HTML legend containers)
    const showLegends = !!(showLegendsEl && showLegendsEl.checked);
    if (legendPowerEl) legendPowerEl.hidden = !showLegends;
    if (legendDPEl) legendDPEl.hidden = !showLegends;

    // Update charts, then render legends and sync visibility
    chartPower.update('none');
    chartDP.update('none');
    renderHtmlLegend(chartPower, legendPowerEl);
    renderHtmlLegend(chartDP, legendDPEl);
    applyVisibilityFromCheckboxes();
}

// Initialize datasets & legends on first load
rebuild();

/* ----- Click workflows ----- */
let guideState = null; // tracks current selection & mode
let summaryMode = 'left'; // persists which calculation type is visible

function handleLeftClick(evt) {
    summaryMode = 'left';
    const {
        x: xPix,
        y: yPix
    } = getClickOffset(evt, chartPower);
    const xScale = chartPower.scales.xP,
        yScale = chartPower.scales.yQ;
    const Pclick = xScale.getValueForPixel(xPix);

    const selDT = getSelected(dtBox);
    if (!selDT.length) {
        clearGuides();
        return;
    }

    // Pick nearest ΔT line by VERTICAL pixel distance at clicked X (Pclick)
    let best = null,
        bestDist = Infinity;
    selDT.forEach(dt => {
        const m = HEAT_FACTOR / dt; // Q = m * P
        const Qline = m * Pclick;
        if (Qline < AX.qMin || Qline > AX.qMax || Pclick < AX.pMin || Pclick > AX.pMax) return;
        const yLinePix = yScale.getPixelForValue(Qline);
        const d = Math.abs(yLinePix - yPix);
        if (d < bestDist) {
            best = {
                dt,
                Q: Qline,
                P: Pclick
            };
            bestDist = d;
        }
    });
    if (!best || bestDist > PICK_TOL_PX) {
        clearGuides();
        return;
    }

    const Qref = best.Q;
    const intersections = getSelected(kvsBox).map(kvs => {
        const dp = DP_KPA_PER_BAR * Math.pow((Qref / LPH_PER_M3H) / kvs, 2);
        return {
            kvs,
            dp
        };
    }).filter(it => it.dp >= AX.dpMin && it.dp <= AX.dpMax);

    guideState = {
        mode: 'left',
        Qref,
        dt: best.dt,
        P: best.P,
        intersections
    };
    drawGuides();
}

function handleRightClick(evt) {
    summaryMode = 'right';
    const {
        x: xPix,
        y: yPix
    } = getClickOffset(evt, chartDP);
    const xScale = chartDP.scales.xDP,
        yScale = chartDP.scales.yQ;
    const dpClick = xScale.getValueForPixel(xPix);

    const selKVS = getSelected(kvsBox);
    if (!selKVS.length) {
        clearGuides();
        return;
    }

    // Pick nearest Kvs line by VERTICAL pixel distance at clicked X (dpClick)
    let best = null,
        bestDist = Infinity;
    selKVS.forEach(kvs => {
        const Qline = LPH_PER_M3H * kvs * Math.sqrt(dpClick / DP_KPA_PER_BAR); // Q(dp)
        if (Qline < AX.qMin || Qline > AX.qMax || dpClick < AX.dpMin || dpClick > AX.dpMax) return;
        const yLinePix = yScale.getPixelForValue(Qline);
        const d = Math.abs(yLinePix - yPix);
        if (d < bestDist) {
            best = {
                kvs,
                Q: Qline,
                dp: dpClick
            };
            bestDist = d;
        }
    });
    if (!best || bestDist > PICK_TOL_PX) {
        clearGuides();
        return;
    }

    const Qref = best.Q;
    const intersections = getSelected(dtBox).map(dt => {
        const P = Qref * dt / HEAT_FACTOR;
        return {
            dt,
            P
        };
    }).filter(it => it.P >= AX.pMin && it.P <= AX.pMax);

    guideState = {
        mode: 'right',
        Qref,
        kvs: best.kvs,
        dp: best.dp,
        intersections
    };
    drawGuides();
}

/* ----- Guides via annotation plugin (with arrow heads) ----- */
function drawGuides() {
    // Reset annotations
    chartPower.options.plugins.annotation.annotations = {};
    chartDP.options.plugins.annotation.annotations = {};

    // Reset line emphasis
    chartPower.data.datasets.forEach(ds => {
        ds.borderWidth = DATASET_BORDER_WIDTH;
        ds.order = 0;
    });
    chartDP.data.datasets.forEach(ds => {
        ds.borderWidth = DATASET_BORDER_WIDTH;
        ds.order = 0;
    });

    if (!guideState) {
        updateBoth();
        return;
    }

    const Qy = guideState.Qref;

    // Shared horizontal reference at Q on both charts
    const refLine = {
        type: 'line',
        yMin: Qy,
        yMax: Qy,
        yScaleID: 'yQ',
        borderColor: REF_LINE_COLOR,
        borderDash: REF_LINE_DASH,
        borderWidth: REF_LINE_WIDTH,
        label: {
            display: true,
            backgroundColor: INTERSECTION_LABEL_BG,
            color: INTERSECTION_LABEL_FG,
            content: `Q ${fmt(Qy)} l/h`,
            position: 'start'
        }
    };
    chartPower.options.plugins.annotation.annotations.qRef = refLine;
    chartDP.options.plugins.annotation.annotations.qRef = {
        ...refLine
    };

    if (guideState.mode === 'left') {
        const {
            dt,
            P,
            intersections
        } = guideState;

        // Emphasize the selected ΔT line on power chart
        chartPower.data.datasets.forEach(ds => {
            if (ds._isDT && ds._dt === dt) {
                ds.borderWidth = DATASET_BORDER_WIDTH_HIGHLIGHT;
                ds.order = 10;
            }
        });

        // Vertical drop with arrow to the selected point on power chart
        chartPower.options.plugins.annotation.annotations.leftDrop = {
            type: 'line',
            xMin: P,
            xMax: P,
            xScaleID: 'xP',
            yScaleID: 'yQ',
            yMin: AX.qMin,
            yMax: Qy,
            borderColor: COLOR_GUIDE,
            borderWidth: ARROW_LINE_WIDTH,
            label: {
                display: true,
                backgroundColor: INTERSECTION_LABEL_BG,
                content: `P ${fmt(P,2)} kW`,
                position: 'start',
                color: INTERSECTION_LABEL_FG
            },
            arrowHeads: {
                end: {
                    display: true,
                    length: ARROW_HEAD_LENGTH,
                    width: ARROW_HEAD_WIDTH
                }
            }
        };
        chartPower.options.plugins.annotation.annotations.leftPoint = {
            type: 'point',
            xValue: P,
            yValue: Qy,
            xScaleID: 'xP',
            yScaleID: 'yQ',
            backgroundColor: COLOR_GUIDE,
            radius: GUIDE_POINT_RADIUS,
            borderWidth: 0
        };

        // Label offsets to avoid collisions on Δp panel
        const offs = verticalOffsets(chartDP, Qy, intersections.length, 18);
        // Mark intersections and down arrows on Δp chart at Qref (dp vs Q)
        intersections.forEach((it, idx) => {
            // down arrow from intersection to bottom
            chartDP.options.plugins.annotation.annotations[`down${idx}`] = {
                type: 'line',
                xMin: it.dp,
                xMax: it.dp,
                xScaleID: 'xDP',
                yScaleID: 'yQ',
                yMin: Qy,
                yMax: chartDP.scales.yQ.min,
                borderColor: COLOR_GUIDE,
                borderWidth: ARROW_LINE_WIDTH,
                arrowHeads: {
                    end: {
                        display: true,
                        length: ARROW_HEAD_LENGTH,
                        width: ARROW_HEAD_WIDTH
                    }
                }
            };
            chartDP.options.plugins.annotation.annotations[`int${idx}`] = {
                type: 'point',
                xValue: it.dp,
                yValue: Qy,
                xScaleID: 'xDP',
                yScaleID: 'yQ',
                backgroundColor: COLORS_KVS[idx % COLORS_KVS.length],
                radius: SERIES_POINT_RADIUS,
                borderWidth: 0
            };
            chartDP.options.plugins.annotation.annotations[`intLab${idx}`] = {
                type: 'label',
                xValue: it.dp,
                yValue: Qy,
                xScaleID: 'xDP',
                yScaleID: 'yQ',
                content: [`Δp ${fmt(it.dp,2)} kPa`],
                backgroundColor: '#ffffff',
                color: '#0f172a',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                borderRadius: 4,
                padding: 4,
                xAdjust: 12,
                yAdjust: (offs[idx] || 0) + 40,
                zIndex: 1000
            };
        });
    } else {
        const {
            kvs,
            dp,
            intersections
        } = guideState;
        // Right-mode: summary rendering is handled in renderSummary(); keep annotation logic below within this block.

        // Emphasize the selected Kvs line on Δp chart
        chartDP.data.datasets.forEach(ds => {
            if (ds._isKVS && ds._kvs === kvs) {
                ds.borderWidth = DATASET_BORDER_WIDTH_HIGHLIGHT;
                ds.order = 10;
            }
        });

        // Vertical drop with arrow to the selected point on Δp chart
        chartDP.options.plugins.annotation.annotations.rightDrop = {
            type: 'line',
            xMin: dp,
            xMax: dp,
            xScaleID: 'xDP',
            yScaleID: 'yQ',
            yMin: AX.qMin,
            yMax: Qy,
            borderColor: COLOR_GUIDE,
            borderWidth: ARROW_LINE_WIDTH,
            label: {
                display: true,
                backgroundColor: '#fff',
                content: `Δp ${fmt(dp,2)} kPa`,
                position: 'start',
                color: '#0f172a'
            },
            arrowHeads: {
                end: {
                    display: true,
                    length: ARROW_HEAD_LENGTH,
                    width: ARROW_HEAD_WIDTH
                }
            }
        };
        chartDP.options.plugins.annotation.annotations.rightPoint = {
            type: 'point',
            xValue: dp,
            yValue: Qy,
            xScaleID: 'xDP',
            yScaleID: 'yQ',
            backgroundColor: COLOR_GUIDE,
            radius: 3,
            borderWidth: 0
        };

        // Label offsets to avoid collisions on power panel
        const offs = verticalOffsets(chartPower, Qy, intersections.length, 18);
        // Mark intersections on power chart at Qref (P vs Q)
        intersections.forEach((it, idx) => {
            // down arrow from intersection to bottom
            chartPower.options.plugins.annotation.annotations[`down${idx}`] = {
                type: 'line',
                xMin: it.P,
                xMax: it.P,
                xScaleID: 'xP',
                yScaleID: 'yQ',
                yMin: Qy,
                yMax: chartPower.scales.yQ.min,
                borderColor: COLOR_GUIDE,
                borderWidth: ARROW_LINE_WIDTH,
                arrowHeads: {
                    end: {
                        display: true,
                        length: ARROW_HEAD_LENGTH,
                        width: ARROW_HEAD_WIDTH
                    }
                }
            };
            chartPower.options.plugins.annotation.annotations[`int${idx}`] = {
                type: 'point',
                xValue: it.P,
                yValue: Qy,
                xScaleID: 'xP',
                yScaleID: 'yQ',
                backgroundColor: COLORS_DT[idx % COLORS_DT.length],
                radius: SERIES_POINT_RADIUS,
                borderWidth: 0
            };
            chartPower.options.plugins.annotation.annotations[`intLab${idx}`] = {
                type: 'label',
                xValue: it.P,
                yValue: Qy,
                xScaleID: 'xP',
                yScaleID: 'yQ',
                content: [`P ${fmt(it.P,2)} kW`],
                backgroundColor: '#ffffff',
                color: '#0f172a',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                borderRadius: 4,
                padding: 4,
                xAdjust: 12,
                yAdjust: (offs[idx] || 0) + 40,
                zIndex: 1000
            };
        });
    }

    // Update summary panel based on current guideState
    renderSummary();
    updateBoth();
}

function clearGuides() {
    guideState = null;
    chartPower.options.plugins.annotation.annotations = {};
    chartDP.options.plugins.annotation.annotations = {};
    // reset emphasis
    chartPower.data.datasets.forEach(ds => {
        if (!ds._guide) {
            ds.borderWidth = DATASET_BORDER_WIDTH;
            ds.order = 0;
        }
    });
    chartDP.data.datasets.forEach(ds => {
        if (!ds._guide) {
            ds.borderWidth = DATASET_BORDER_WIDTH;
            ds.order = 0;
        }
    });
    // Keep summary visible with placeholder values
    renderSummary();
    updateBoth();
}

function renderSummary() {
    if (!summaryEl || !summaryContentEl) {
        return;
    }

    const hasSelection = !!guideState;
    const mode = hasSelection ? guideState.mode : summaryMode;

    // Header
    let headerHTML = '';
    if (!hasSelection) {
        headerHTML = `<div class="summary-header">${t('summary.title')}</div>`;
    } else if (mode === 'right') {
        const {
            kvs,
            dp,
            Qref: Q
        } = guideState;
        const dpMeters = dp * KPATO_MH2O;
        const base = tr('summary.right.header', {
            dp: fmt(dp, 2),
            m: fmt(dpMeters, 2),
            kvs: fmt(kvs, 2)
        });
        headerHTML = `<div class="summary-header">${base} — ${t('summary.flow')}: ${fmt(Q)} l/h</div>`;
    } else {
        const {
            dt,
            P,
            Qref: Q
        } = guideState;
        headerHTML = `<div class="summary-header">${tr('summary.left.header', { P: fmt(P, 2), dt: fmt(dt, 1), Q: fmt(Q) })}</div>`;
    }

    // Active section based on mode; placeholders when no selection
    let activeSection = '';
    if (mode === 'left') {
        // Calculated pressure drop values
        let dpItems = '';
        if (hasSelection && Array.isArray(guideState.intersections) && guideState.intersections.length) {
            dpItems = guideState.intersections.map(it => {
                const meters = it.dp * KPATO_MH2O;
                const leftLabel = tr('summary.item.kvsLabel', {
                    kvs: fmt(it.kvs, 2)
                });
                const rightVal = tr('summary.item.dpValue', {
                    dp: fmt(it.dp, 2),
                    m: fmt(meters, 2)
                });
                return `<li><span class=\"item-label\">${leftLabel}</span><span class=\"item-value\">${rightVal}</span></li>`;
            }).join('');
        } else {
            dpItems = Array.from({
                length: 4
            }, () => {
                const leftLabel = tr('summary.item.kvsLabel', {
                    kvs: '---'
                });
                const rightVal = tr('summary.item.dpValue', {
                    dp: '---',
                    m: '---'
                });
                return `<li><span class=\"item-label\">${leftLabel}</span><span class=\"item-value\">${rightVal}</span></li>`;
            }).join('');
        }
        activeSection = `
      <div class=\"summary-section\">
        <div class=\"summary-subtitle\">${t('summary.left.section')}</div>
        <ul class=\"summary-list\">${dpItems}</ul>
      </div>`;
    } else if (mode === 'right') {
        // Calculated power
        let powerItems = '';
        if (hasSelection && Array.isArray(guideState.intersections) && guideState.intersections.length) {
            powerItems = guideState.intersections.map(it => {
                const leftLabel = tr('summary.item.deltaLabel', {
                    dt: fmt(it.dt, 1)
                });
                const rightVal = tr('summary.item.powerValue', {
                    P: fmt(it.P, 2)
                });
                return `<li><span class=\"item-label\">${leftLabel}</span><span class=\"item-value\">${rightVal}</span></li>`;
            }).join('');
        } else {
            powerItems = Array.from({
                length: 4
            }, () => {
                const leftLabel = tr('summary.item.deltaLabel', {
                    dt: '---'
                });
                const rightVal = tr('summary.item.powerValue', {
                    P: '---'
                });
                return `<li><span class=\"item-label\">${leftLabel}</span><span class=\"item-value\">${rightVal}</span></li>`;
            }).join('');
        }
        activeSection = `
      <div class=\"summary-section\">
        <div class=\"summary-subtitle\">${t('summary.right.section')}</div>
        <ul class=\"summary-list\">${powerItems}</ul>
      </div>`;
    }

    summaryContentEl.innerHTML = headerHTML + activeSection;
    summaryEl.hidden = false;
}


// ... i18n loader and utilities
const I18N = {
    current: 'en',
    dict: {},
    supported: SUPPORTED_LANGS,
    ready: false,
    _resolveReady: null,
    _rebuildScheduled: false,
};
// Ensure global reference exists early so helpers like fmt/t can safely read it even before full init
globalThis.I18N = I18N;
// Create a promise that resolves when initial translations are loaded
I18N.readyPromise = new Promise((resolve) => {
    I18N._resolveReady = resolve;
});

function detectBrowserLang() {
    const nav = window.navigator;
    const langs = [nav.language, ...(nav.languages || [])].filter(Boolean);
    for (const l of langs) {
        const code = String(l).toLowerCase().slice(0, 2);
        if (I18N.supported.includes(code)) return code;
    }
    return 'en';
}

async function loadTranslations(lang) {
    const url = `i18n/${lang}.json`;
    const res = await fetch(url);
    if (!res.ok) {
        console.warn('Failed to load translations for', lang);
        return;
    }
    I18N.dict = await res.json();
}

function t(key) {
    const dict = (globalThis.I18N && globalThis.I18N.dict) ? globalThis.I18N.dict : {};
    return dict[key] ?? key;
}

function tr(key, params = {}) {
    const template = t(key);
    return template.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : ''));
}

function applyTranslations() {
    // Update all elements annotated with data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        el.innerHTML = t(key);
    });

    // Update DT/Kvs checkbox label tags with locale-aware formatting
    document.querySelectorAll('#dt-boxes .checkbox').forEach((label) => {
        const input = label.querySelector('input');
        const span = label.querySelector('.tag');
        if (input && span) span.textContent = fmt(Number(input.value), 1) + '°';
    });
    document.querySelectorAll('#kvs-boxes .checkbox').forEach((label) => {
        const input = label.querySelector('input');
        const span = label.querySelector('.tag');
        if (input && span) span.textContent = fmt(Number(input.value), 1);
    });

    // Update Axes modal placeholders and labels
    const qmin = document.getElementById('ax-qmin');
    if (qmin) qmin.setAttribute('placeholder', t('axes.placeholder.qmin'));
    const qmax = document.getElementById('ax-qmax');
    if (qmax) qmax.setAttribute('placeholder', t('axes.placeholder.qmax'));
    const pmin = document.getElementById('ax-pmin');
    if (pmin) pmin.setAttribute('placeholder', t('axes.placeholder.pmin'));
    const pmax = document.getElementById('ax-pmax');
    if (pmax) pmax.setAttribute('placeholder', t('axes.placeholder.pmax'));
    const dpmin = document.getElementById('ax-dpmin');
    if (dpmin) dpmin.setAttribute('placeholder', t('axes.placeholder.dpmin'));
    const dpmax = document.getElementById('ax-dpmax');
    if (dpmax) dpmax.setAttribute('placeholder', t('axes.placeholder.dpmax'));
    const axClose = document.getElementById('axes-close');
    if (axClose) axClose.setAttribute('aria-label', t('axes.close'));
    document.querySelectorAll('.btn.ax-btn').forEach((btn) => {
        btn.title = t('axes.button');
        btn.setAttribute('aria-label', t('axes.button'));
    });

    try {
        if (typeof chartPower !== 'undefined' && chartPower?.options?.scales?.xP?.title) {
            chartPower.options.scales.xP.title.text = t('charts.power.axisX');
        }
        if (typeof chartPower !== 'undefined' && chartPower?.options?.scales?.yQ?.title) {
            chartPower.options.scales.yQ.title.text = t('charts.power.axisY');
        }
        if (typeof chartDP !== 'undefined' && chartDP?.options?.scales?.xDP?.title) {
            chartDP.options.scales.xDP.title.text = t('charts.dp.axisX');
        }
        if (typeof chartDP !== 'undefined' && chartDP?.options?.scales?.yQ?.title) {
            chartDP.options.scales.yQ.title.text = t('charts.dp.axisY');
        }
        // Also update dataset labels (used by datalabels and legends) with locale-aware formatting
        chartPower?.data?.datasets?.forEach(ds => {
            if (ds._isDT) ds.label = `${t('tooltip.power.dt')} ${fmt(ds._dt, 1)}°C`;
        });
        chartDP?.data?.datasets?.forEach(ds => {
            if (ds._isKVS) ds.label = `${t('charts.dp.axisNote')} ${fmt(ds._kvs, 1)}`;
        });

        // Update charts to re-render tick callbacks with new locale
        chartPower?.update();
        chartDP?.update();
    } catch (err) {
        console.warn('applyTranslations chart update error', err);
    }

    document.documentElement.lang = I18N.current;

    // Ensure summary content reflects current language and remains visible
    try {
        renderSummary();
    } catch (_) {}

    // Recreate or ensure Axes UI is present after language changes
    try {
        initAxesUI();
    } catch (_) {}
}

async function initI18n() {
    // Determine initial language (persisted value takes precedence)
    const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('app.lang') : null;
    const candidate = (stored && I18N.supported.includes(stored)) ? stored : detectBrowserLang();
    const initial = I18N.supported.includes(candidate) ? candidate : 'en';
    I18N.current = initial;
    const select = document.getElementById('lang-select');
    if (select) select.value = initial;

    await loadTranslations(initial);
    console.log(I18N);
    applyTranslations();
    I18N.ready = true;
    if (I18N._resolveReady) I18N._resolveReady();
    try {
        window.dispatchEvent(new Event('i18n-ready'));
    } catch (_) {}

    // Wire up dropdown change
    if (select) {
        select.addEventListener('change', async (e) => {
            const lang = e.target.value;
            if (!I18N.supported.includes(lang)) return;
            I18N.current = lang;
            try {
                localStorage.setItem('app.lang', lang);
            } catch (_) {}
            await loadTranslations(lang);
            applyTranslations();
        });
    }
}

// Initialize i18n on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n, {
        once: true
    });
} else {
    initI18n();
}

// Migrated from index.html#L223-318: language dropdown UI behavior
(function() {
    const select = document.getElementById('lang-select');
    const toggle = document.getElementById('lang-dd-toggle');
    const list = document.getElementById('lang-dd-list');
    const label = toggle ? toggle.querySelector('.lang-dd-label') : null;

    function langToFlagClass(lang) {
        switch (lang) {
            case 'en':
                return 'fi-gb';
            case 'de':
                return 'fi-de';
            case 'pl':
                return 'fi-pl';
            case 'zh':
                return 'fi-cn';
            default:
                return 'fi-gb';
        }
    }

    function setUIFromValue(val) {
        if (!toggle || !list) return;
        // Update button label and flag
        const flagSpan = toggle.querySelector('.fi');
        if (flagSpan) {
            flagSpan.className = 'fi ' + langToFlagClass(val);
        }
        const activeItem = list.querySelector('.lang-dd-item[aria-selected="true"]');
        activeItem && activeItem.setAttribute('aria-selected', 'false');
        const newItem = list.querySelector(`.lang-dd-item[data-value="${val}"]`);
        if (newItem) {
            newItem.setAttribute('aria-selected', 'true');
            const text = newItem.querySelector('span:last-child');
            if (label && text) label.textContent = text.textContent;
        }
    }

    function open() {
        if (!toggle || !list) return;
        list.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
    }

    function close() {
        if (!toggle || !list) return;
        list.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
    }

    function toggleOpen() {
        if (!list) return;
        list.hidden ? open() : close();
    }

    function onItemClick(e) {
        const li = e.target.closest('.lang-dd-item');
        if (!li || !select) return;
        const val = li.getAttribute('data-value');
        if (!val) return;
        select.value = val;
        // Dispatch change so existing i18n logic runs
        select.dispatchEvent(new Event('change', {
            bubbles: true
        }));
        setUIFromValue(val);
        close();
    }

    function onDocClick(e) {
        if (!toggle || !list) return;
        if (toggle.contains(e.target) || list.contains(e.target)) return;
        close();
    }

    function onKey(e) {
        if (list.hidden) return;
        const items = [...list.querySelectorAll('.lang-dd-item')];
        const idx = items.findIndex(li => li.getAttribute('aria-selected') === 'true');
        if (e.key === 'Escape') {
            close();
            toggle && toggle.focus();
        }
        if (e.key === 'ArrowDown') {
            const next = items[(idx + 1) % items.length];
            next && next.focus && next.focus();
            e.preventDefault();
        }
        if (e.key === 'ArrowUp') {
            const prev = items[(idx - 1 + items.length) % items.length];
            prev && prev.focus && prev.focus();
            e.preventDefault();
        }
        if (e.key === 'Enter') {
            const focused = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.lang-dd-item') : items[idx];
            if (focused) {
                focused.click();
            }
        }
    }

    function init() {
        if (!select || !toggle || !list) return;
        // Initialize from current select value (set by i18n on load)
        const applyInitial = () => setUIFromValue(select.value || 'en');
        window.addEventListener('i18n-ready', applyInitial, {
            once: true
        });
        // Fallback if event missed
        if (document.readyState !== 'loading') setTimeout(applyInitial, 0);

        toggle.addEventListener('click', toggleOpen);
        list.addEventListener('click', onItemClick);
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onKey);
        // Keep UI in sync if select changes from elsewhere
        select.addEventListener('change', (e) => setUIFromValue(e.target.value));
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, {
            once: true
        });
    } else {
        init();
    }
})();