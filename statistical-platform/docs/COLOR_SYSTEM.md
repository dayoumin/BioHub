# Color System Documentation

> **Design Philosophy**: Muted, professional colors that harmonize with the monochrome design system while providing clear semantic meaning.

## Overview

This color system uses **low-saturation (muted) colors** to maintain a sophisticated, professional appearance while still conveying semantic meaning through color.

### Key Principles

1. **Subtle, not jarring** - Colors don't compete for attention
2. **Semantic clarity** - Each color has a clear meaning
3. **Dark mode compatible** - Full support for light/dark themes
4. **Harmonious** - Works with existing monochrome design

---

## Semantic Colors

| Status | Color Name | Hue | Use Case |
|--------|-----------|-----|----------|
| **Success** | Muted Sage | 155° | Validation passed, assumptions met, positive outcomes |
| **Error** | Muted Rose | 15° | Errors, statistical significance, failures |
| **Warning** | Muted Amber | 75° | Warnings, cautions, attention needed |
| **Info** | Muted Slate | 250° | Information, help, tips |
| **Neutral** | Gray | 0° | Disabled, inactive, secondary |

---

## Usage Guide

### 1. CSS Classes (Recommended)

Use Tailwind classes for styling:

```tsx
// Text colors
<span className="text-success">Valid</span>
<span className="text-error">Invalid</span>
<span className="text-warning">Warning</span>
<span className="text-info">Info</span>

// Background colors
<div className="bg-success-bg">Success background</div>
<div className="bg-error-bg">Error background</div>

// Border colors
<div className="border border-success-border">Success border</div>
<div className="border border-error-border">Error border</div>

// Muted variants (darker/softer)
<span className="text-success-muted">Muted success</span>
```

### 2. Status Components (Preferred)

Use pre-built components for consistency:

```tsx
import { StatusBadge, SuccessBadge, ErrorBadge } from '@/components/ui/status-badge'
import { StatusIcon, SuccessIcon, ErrorIcon } from '@/components/ui/status-icon'
import { StatusText, SuccessText, ErrorText } from '@/components/ui/status-text'
import { SignificanceIndicator, PValueDisplay } from '@/components/ui/significance-indicator'

// Badges
<StatusBadge variant="success">Valid</StatusBadge>
<SuccessBadge>Passed</SuccessBadge>
<ErrorBadge>Failed</ErrorBadge>

// Icons
<StatusIcon status="success" />
<SuccessIcon className="h-5 w-5" />
<ErrorIcon filled />

// Text
<StatusText status="success">All checks passed</StatusText>
<SuccessText>Valid data</SuccessText>

// Statistical significance
<SignificanceIndicator pValue={0.023} alpha={0.05} />
<PValueDisplay value={0.001} />
```

### 3. CSS Variables (Advanced)

Access colors directly via CSS variables:

```css
.custom-element {
  color: var(--success);
  background-color: var(--success-bg);
  border-color: var(--success-border);
}
```

---

## Statistical Significance Colors

For statistical analysis results:

| Condition | CSS Class | Color |
|-----------|-----------|-------|
| p < 0.01 | `text-stat-highly-significant` | Deeper Muted Rose |
| p < 0.05 | `text-stat-significant` | Muted Rose |
| p >= 0.05 | `text-stat-non-significant` | Muted Sage |

```tsx
// Using SignificanceIndicator
<SignificanceIndicator pValue={0.003} />  // Highly Significant
<SignificanceIndicator pValue={0.045} />  // Significant
<SignificanceIndicator pValue={0.123} />  // Not Significant

// Using PValueDisplay
<PValueDisplay value={0.0001} />  // "< 0.001 **"
<PValueDisplay value={0.023} />   // "0.0230 *"
<PValueDisplay value={0.234} />   // "0.2340"
```

---

## Color Values (OKLCH)

### Light Mode

| Token | OKLCH Value | Description |
|-------|-------------|-------------|
| `--success` | `oklch(0.55 0.08 155)` | Main text/icon |
| `--success-bg` | `oklch(0.96 0.02 155)` | Subtle background |
| `--success-border` | `oklch(0.85 0.04 155)` | Border |
| `--success-muted` | `oklch(0.45 0.06 155)` | Darker variant |
| `--error` | `oklch(0.55 0.10 15)` | Main text/icon |
| `--error-bg` | `oklch(0.96 0.02 15)` | Subtle background |
| `--warning` | `oklch(0.55 0.08 75)` | Main text/icon |
| `--info` | `oklch(0.50 0.06 250)` | Main text/icon |

### Dark Mode

| Token | OKLCH Value |
|-------|-------------|
| `--success` | `oklch(0.70 0.08 155)` |
| `--success-bg` | `oklch(0.22 0.03 155)` |
| `--error` | `oklch(0.70 0.10 15)` |
| `--warning` | `oklch(0.70 0.08 75)` |
| `--info` | `oklch(0.68 0.06 250)` |

---

## Migration Guide

### Before (Direct Tailwind colors)

```tsx
// Old approach - hard to maintain, inconsistent
<CheckCircle className="text-green-600" />
<span className="bg-green-50 text-green-700 border-green-200">Valid</span>
<span className="text-red-500">Error</span>
```

### After (Semantic colors)

```tsx
// New approach - centralized, consistent, maintainable
<SuccessIcon />
<SuccessBadge>Valid</SuccessBadge>
<ErrorText>Error</ErrorText>
```

### Gradual Migration

You don't need to migrate all at once. The old Tailwind colors still work.
Prioritize:
1. Common components (DataValidationStep, etc.)
2. High-frequency patterns
3. Individual pages

---

## File Structure

```
lib/styles/
├── colors.ts          # Color constants and utilities
└── index.ts           # Module exports

components/ui/
├── status-badge.tsx          # Badge component
├── status-icon.tsx           # Icon component
├── status-text.tsx           # Text component
└── significance-indicator.tsx # Statistical significance

app/
└── globals.css        # CSS variables definition
```

---

## Best Practices

### DO

- Use semantic components (`StatusBadge`, `StatusIcon`)
- Use CSS classes (`text-success`, `bg-error-bg`)
- Maintain consistency across pages
- Consider color-blind accessibility

### DON'T

- Mix old Tailwind colors with new semantic colors in same component
- Create new color variables without updating this doc
- Use colors for non-semantic purposes (decoration)

---

## Accessibility

The muted palette maintains sufficient contrast ratios:
- **WCAG AA**: All colors pass 4.5:1 ratio
- **Color blindness**: Distinguishable patterns, not just colors

For critical information, always combine color with:
- Icons (✓ / ✗)
- Text labels
- Patterns or shapes

---

## Future Improvements

1. **Component library expansion** - More semantic components
2. **Chart color palette** - Consistent muted colors for visualizations
3. **Animation tokens** - Consistent transitions
4. **Automatic migration tool** - Script to convert old colors

---

**Last Updated**: 2025-11-19
**Version**: 1.0.0
