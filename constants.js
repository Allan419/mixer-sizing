// Centralized constants for the Valve / Mixing Valve Selector app
// Exported as ES module constants

// Supported languages
export const SUPPORTED_LANGS = ['en', 'de', 'pl', 'zh'];

export const DT_VALUES = [5, 7.5, 10, 15, 20, 30];
export const DT_DT_VALUES_MIN = 5;
export const DT_DT_VALUES_MAX = 40;
export const KVS_VALUES = [2, 4, 7, 10, 15, 25, 40];
export const KVS_VALUES_MIN = 1;
export const KVS_VALUES_MAX = 50;

// Axis bounds
export const QMIN = 200;
export const QMAX = 10000; // Flow [l/h]
export const PMIN = 5;
export const PMAX = 500;   // Power [kW]
export const DPMIN = 1;
export const DPMAX = 200;  // Δp [kPa]

// Interaction
export const PICK_TOL_PX = 14; // click tolerance in pixels

// Colors
export const COLOR_GUIDE = '#ff7b7b';
export const COLORS_DT = ['#0ea47a', '#7c3aed', '#f59e0b', '#3b82f6', '#ef4444', '#6b7280'];
export const COLORS_KVS = ['#16a34a', '#0891b2', '#a855f7', '#dc2626', '#0ea5e9', '#f59e0b', '#22c55e', '#2563eb'];

// Chart styling
export const lightGrid = '#e5e7eb';
export const lightTick = '#334155';
export const CHART_PADDING_TOP = 20;
export const DATASET_BORDER_WIDTH = 2;
export const DATASET_BORDER_WIDTH_HIGHLIGHT = 4;
export const GUIDE_POINT_RADIUS = 3;
export const SERIES_POINT_RADIUS = 0;

// Legend label styling
export const LEGEND_LABEL_PADDING = 6;
export const LEGEND_BOX_WIDTH = 10;
export const LEGEND_BOX_HEIGHT = 8;

// Reference line styling
export const REF_LINE_COLOR = '#94a3b8';
export const REF_LINE_DASH = [5, 4];
export const REF_LINE_WIDTH = 1.5;

// Arrow head sizing
export const ARROW_HEAD_LENGTH = 8;
export const ARROW_HEAD_WIDTH = 6;
export const ARROW_LINE_WIDTH = 4;

// Labeling for intersections
export const INTERSECTION_LABEL_BG = '#ffffff';
export const INTERSECTION_LABEL_FG = '#0f172a';

// Inline datalabels styling
export const DATALABEL_BG = '#ffffff';
export const DATALABEL_COLOR = '#0f172a';
export const DATALABEL_BORDER = '#e5e7eb';
export const DATALABEL_BORDER_WIDTH = 1;
export const DATALABEL_BORDER_RADIUS = 6;
export const DATALABEL_OFFSET = 8;
export const DATALABEL_PADDING = { top: 2, right: 6, bottom: 2, left: 6 };
// Responsive font sizing for datalabels
export const DATALABEL_FONT_MIN = 10;
export const DATALABEL_FONT_MAX = 13;

// Label vertical distribution
export const LABEL_SPACING_DEFAULT = 16;

// Physics/engineering constants
export const HEAT_FACTOR = 860;      // Q[l/h] = HEAT_FACTOR * P[kW] / ΔT[°C]
export const LPH_PER_M3H = 1000;     // 1 m³/h = 1000 l/h
export const DP_KPA_PER_BAR = 100;   // 1 bar = 100 kPa
export const KPATO_MH2O = 0.102;     // 1 kPa ≈ 0.102 m H2O