/**
 * Status color tokens and phase accent helpers.
 * All --status-* hex values are defined here and nowhere else.
 */

export const STATUS_COLORS = {
  "--status-ok": "#7FC9B8",
  "--status-info": "#5BB8D4",
  "--status-waiting": "#A78BCA",
  "--status-complete": "#6BAF8A",
  "--status-warning": "#E8B84B",
  "--status-error": "#E85B5B",
};

// Maps phase number to token name.
// Ranges: 1-3 → waiting, 4-6 → info, 7+ → complete, unknown → ok
const PHASE_TOKEN_RANGES = [
  { min: 1, max: 3, token: "--status-waiting" },
  { min: 4, max: 6, token: "--status-info" },
  { min: 7, max: Infinity, token: "--status-complete" },
];

export const PHASE_ACCENT = PHASE_TOKEN_RANGES;

/**
 * Inject all STATUS_COLORS as CSS custom properties on :root.
 */
export function injectStatusTokens() {
  const root = document.documentElement;
  for (const [token, value] of Object.entries(STATUS_COLORS)) {
    root.style.setProperty(token, value);
  }
}

/**
 * Parse the phase number from a phase string (e.g. "Phase 4: Slice Design")
 * and return the resolved hex color for the corresponding token.
 * Returns STATUS_COLORS["--status-ok"] for null, empty, or unrecognized input.
 */
export function phaseAccentColor(phaseString) {
  if (!phaseString) return STATUS_COLORS["--status-ok"];
  const match = phaseString.match(/\d+/);
  if (!match) return STATUS_COLORS["--status-ok"];
  const num = parseInt(match[0], 10);
  for (const { min, max, token } of PHASE_TOKEN_RANGES) {
    if (num >= min && num <= max) return STATUS_COLORS[token];
  }
  return STATUS_COLORS["--status-ok"];
}
