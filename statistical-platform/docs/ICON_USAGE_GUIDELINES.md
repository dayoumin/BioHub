# Icon Usage Guidelines

This document defines the standard icon usage across the statistics platform.

## Icon Library

- **Primary**: [Lucide React](https://lucide.dev/icons/) (v0.400+)
- **DO NOT** use Unicode emojis in UI components
- **DO NOT** mix icon libraries (no Font Awesome, Heroicons, etc.)

---

## Status Icons (CRITICAL)

Use consistent icons for status indicators across all pages.

| Status | Icon | Color Class | Usage |
|--------|------|-------------|-------|
| Success/Complete | `CheckCircle2` | `text-success` | Task completed, validation passed |
| Error/Failed | `XCircle` | `text-destructive` | Errors, failures, invalid data |
| Warning | `AlertTriangle` | `text-warning` | Warnings, cautions |
| Info | `Info` | `text-info` | Information, hints |
| Loading | `Loader2` | `text-primary animate-spin` | Loading states |

### Deprecated Status Icons (DO NOT USE)

| Icon | Replacement | Reason |
|------|-------------|--------|
| `CheckCircle` | `CheckCircle2` | Standardization |
| `AlertCircle` | `AlertTriangle` (warning) or `XCircle` (error) | Ambiguous meaning |
| `Check` (without circle) | `CheckCircle2` | Visual consistency |

---

## Chart/Visualization Icons

| Chart Type | Icon | Notes |
|------------|------|-------|
| Histogram | `BarChart3` | Vertical bars |
| Box Plot | `GitCommitHorizontal` | Horizontal line with points |
| Scatter Plot | `ChartScatter` | Dots pattern |
| Line Chart | `TrendingUp` | Trend line |
| Correlation/Heatmap | `Grid3X3` | Grid pattern |
| Distribution | `Activity` | Wave pattern |

---

## Navigation Icons

| Action | Icon | Notes |
|--------|------|-------|
| Next Step | `ArrowRight` | Wizard/step navigation |
| Previous Step | `ArrowLeft` | Back navigation |
| Expand/Collapse | `ChevronDown` / `ChevronUp` | Accordion, dropdown |
| Menu Item | `ChevronRight` | Submenu indicator |
| External Link | `ExternalLink` | Opens new window |
| Close/Remove | `X` | Close dialog, remove item |

---

## Action Icons

| Action | Icon | Notes |
|--------|------|-------|
| Add/Create | `Plus` | Add new item |
| Delete | `Trash2` | Delete item |
| Edit | `Pencil` | Edit mode |
| Save | `Save` | Save action |
| Download | `Download` | Export/download |
| Upload | `Upload` | Import/upload |
| Copy | `Copy` | Copy to clipboard |
| Refresh | `RefreshCw` | Reload data |
| Settings | `Settings` | Configuration |
| Search | `Search` | Search functionality |

---

## Data/Content Icons

| Content | Icon | Notes |
|---------|------|-------|
| File | `FileText` | Document/file |
| Folder | `Folder` | Directory |
| Database | `Database` | Data storage |
| Table | `Table` | Tabular data |
| Variable | `Variable` | Statistical variable |
| Formula | `Calculator` | Calculations |

---

## AI/Special Icons

| Feature | Icon | Notes |
|---------|------|-------|
| AI Analysis | `Sparkles` | AI-powered features |
| Brain/ML | `Brain` | Machine learning |
| Automation | `Zap` | Automated process |
| Help/Guide | `HelpCircle` | Help tooltip |

---

## Size Standards

| Context | Size Class | Usage |
|---------|------------|-------|
| Inline/Badge | `w-3 h-3` | Inside badges, small indicators |
| Default | `w-4 h-4` | Buttons, list items, tabs |
| Header | `w-5 h-5` | Card headers, section titles |
| Large | `w-6 h-6` | Hero sections, empty states |

### Example

```tsx
// Default button icon
<Button>
  <CheckCircle2 className="w-4 h-4 mr-2" />
  Complete
</Button>

// Header icon
<CardTitle className="flex items-center gap-2">
  <BarChart3 className="w-5 h-5" />
  Data Distribution
</CardTitle>

// Inline badge icon
<Badge>
  <AlertTriangle className="w-3 h-3 mr-1" />
  Warning
</Badge>
```

---

## Color Standards

| Semantic | Tailwind Class | Hex (Light) |
|----------|----------------|-------------|
| Success | `text-success` | Green |
| Destructive | `text-destructive` | Red |
| Warning | `text-warning` | Yellow/Amber |
| Info | `text-info` | Blue |
| Primary | `text-primary` | Brand color |
| Muted | `text-muted-foreground` | Gray |

### DO NOT USE

- Arbitrary colors like `text-yellow-600`, `text-red-500`
- Use semantic classes above instead

---

## Migration Checklist

When updating existing components:

1. [ ] Replace `CheckCircle` with `CheckCircle2`
2. [ ] Replace `AlertCircle` with appropriate icon (`AlertTriangle` or `XCircle`)
3. [ ] Standardize sizes to `w-4 h-4` (default)
4. [ ] Replace arbitrary colors with semantic classes
5. [ ] Verify imports from `lucide-react`

---

## StatusIcon Component

For status indicators, use the `StatusIcon` component:

```tsx
import { StatusIcon } from '@/components/common/StatusIcon'

// Usage
<StatusIcon status="success" />
<StatusIcon status="error" size="lg" />
<StatusIcon status="warning" className="mr-2" />
```

See: `components/common/StatusIcon.tsx`

---

**Last Updated**: 2025-11-26
**Version**: 1.0.0