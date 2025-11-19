/**
 * Muted Color System for Statistical Platform
 *
 * Design Principles:
 * - Low saturation for subtle, professional look
 * - Harmonious with monochrome base
 * - Clear semantic meaning without being jarring
 *
 * Color Format: OKLCH (Oklab Lightness, Chroma, Hue)
 * - L: 0-1 (lightness)
 * - C: 0-0.4 (chroma/saturation - lower = more muted)
 * - H: 0-360 (hue)
 */

// =============================================================================
// SEMANTIC COLOR TOKENS
// =============================================================================

export const semanticColors = {
  // Success - Muted Sage Green
  // Used for: validation passed, assumptions met, positive outcomes
  success: {
    light: {
      DEFAULT: 'oklch(0.55 0.08 155)',      // Main text/icon
      foreground: 'oklch(0.98 0 0)',         // Text on solid bg
      background: 'oklch(0.96 0.02 155)',    // Subtle bg
      border: 'oklch(0.85 0.04 155)',        // Border
      muted: 'oklch(0.45 0.06 155)',         // Darker variant
    },
    dark: {
      DEFAULT: 'oklch(0.70 0.08 155)',
      foreground: 'oklch(0.15 0 0)',
      background: 'oklch(0.22 0.03 155)',
      border: 'oklch(0.35 0.04 155)',
      muted: 'oklch(0.60 0.06 155)',
    },
  },

  // Error - Muted Rose
  // Used for: errors, statistical significance, failures
  error: {
    light: {
      DEFAULT: 'oklch(0.55 0.10 15)',
      foreground: 'oklch(0.98 0 0)',
      background: 'oklch(0.96 0.02 15)',
      border: 'oklch(0.85 0.05 15)',
      muted: 'oklch(0.45 0.08 15)',
    },
    dark: {
      DEFAULT: 'oklch(0.70 0.10 15)',
      foreground: 'oklch(0.15 0 0)',
      background: 'oklch(0.22 0.03 15)',
      border: 'oklch(0.35 0.05 15)',
      muted: 'oklch(0.60 0.08 15)',
    },
  },

  // Warning - Muted Amber
  // Used for: warnings, cautions, attention needed
  warning: {
    light: {
      DEFAULT: 'oklch(0.55 0.08 75)',
      foreground: 'oklch(0.98 0 0)',
      background: 'oklch(0.96 0.02 75)',
      border: 'oklch(0.85 0.04 75)',
      muted: 'oklch(0.45 0.06 75)',
    },
    dark: {
      DEFAULT: 'oklch(0.70 0.08 75)',
      foreground: 'oklch(0.15 0 0)',
      background: 'oklch(0.22 0.03 75)',
      border: 'oklch(0.35 0.04 75)',
      muted: 'oklch(0.60 0.06 75)',
    },
  },

  // Info - Muted Slate Blue
  // Used for: information, help, tips
  info: {
    light: {
      DEFAULT: 'oklch(0.50 0.06 250)',
      foreground: 'oklch(0.98 0 0)',
      background: 'oklch(0.96 0.015 250)',
      border: 'oklch(0.85 0.03 250)',
      muted: 'oklch(0.40 0.05 250)',
    },
    dark: {
      DEFAULT: 'oklch(0.68 0.06 250)',
      foreground: 'oklch(0.15 0 0)',
      background: 'oklch(0.22 0.02 250)',
      border: 'oklch(0.35 0.03 250)',
      muted: 'oklch(0.58 0.05 250)',
    },
  },

  // Neutral - Pure Gray (existing monochrome)
  // Used for: disabled, inactive, secondary
  neutral: {
    light: {
      DEFAULT: 'oklch(0.55 0 0)',
      foreground: 'oklch(0.98 0 0)',
      background: 'oklch(0.96 0 0)',
      border: 'oklch(0.85 0 0)',
      muted: 'oklch(0.45 0 0)',
    },
    dark: {
      DEFAULT: 'oklch(0.65 0 0)',
      foreground: 'oklch(0.15 0 0)',
      background: 'oklch(0.22 0 0)',
      border: 'oklch(0.35 0 0)',
      muted: 'oklch(0.55 0 0)',
    },
  },
} as const

// =============================================================================
// STATISTICAL SIGNIFICANCE COLORS
// =============================================================================

export const statisticalColors = {
  // Highly significant (p < 0.01)
  highlySignificant: {
    light: 'oklch(0.50 0.10 15)',
    dark: 'oklch(0.72 0.10 15)',
  },
  // Significant (p < 0.05)
  significant: {
    light: 'oklch(0.55 0.08 15)',
    dark: 'oklch(0.70 0.08 15)',
  },
  // Not significant (p >= 0.05)
  notSignificant: {
    light: 'oklch(0.55 0.08 155)',
    dark: 'oklch(0.70 0.08 155)',
  },
} as const

// =============================================================================
// CHART COLORS (Muted palette for data visualization)
// =============================================================================

export const chartColors = {
  light: [
    'oklch(0.55 0.08 250)',  // Muted blue
    'oklch(0.55 0.08 155)',  // Muted green
    'oklch(0.55 0.08 75)',   // Muted amber
    'oklch(0.55 0.10 15)',   // Muted rose
    'oklch(0.55 0.08 300)',  // Muted purple
  ],
  dark: [
    'oklch(0.70 0.08 250)',
    'oklch(0.70 0.08 155)',
    'oklch(0.70 0.08 75)',
    'oklch(0.70 0.10 15)',
    'oklch(0.70 0.08 300)',
  ],
} as const

// =============================================================================
// CSS VARIABLE NAMES (for use in globals.css)
// =============================================================================

export const cssVariableNames = {
  success: '--color-success',
  successForeground: '--color-success-foreground',
  successBackground: '--color-success-bg',
  successBorder: '--color-success-border',
  successMuted: '--color-success-muted',

  error: '--color-error',
  errorForeground: '--color-error-foreground',
  errorBackground: '--color-error-bg',
  errorBorder: '--color-error-border',
  errorMuted: '--color-error-muted',

  warning: '--color-warning',
  warningForeground: '--color-warning-foreground',
  warningBackground: '--color-warning-bg',
  warningBorder: '--color-warning-border',
  warningMuted: '--color-warning-muted',

  info: '--color-info',
  infoForeground: '--color-info-foreground',
  infoBackground: '--color-info-bg',
  infoBorder: '--color-info-border',
  infoMuted: '--color-info-muted',
} as const

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type SemanticColorName = keyof typeof semanticColors
export type ColorVariant = 'DEFAULT' | 'foreground' | 'background' | 'border' | 'muted'
export type ColorMode = 'light' | 'dark'

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get semantic color value
 */
export function getSemanticColor(
  name: SemanticColorName,
  variant: ColorVariant = 'DEFAULT',
  mode: ColorMode = 'light'
): string {
  return semanticColors[name][mode][variant]
}

/**
 * Get CSS variable reference
 */
export function cssVar(name: string): string {
  return `var(${name})`
}