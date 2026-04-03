# Design System Document: Precision Editorial (Axiom Slate)

> Source: Google Stitch Project "통계분석 단계별 진행 UI" (ID: 17078689033562070096)
> Design System: Axiom Slate
> Generated: 2026-04-03

## 1. Overview & Creative North Star: "The Data Architect"
This design system moves away from the cluttered, line-heavy aesthetic of traditional statistical tools and toward a "Data Architect" philosophy. The North Star is **Architectural Clarity**: treating data as a physical structure where hierarchy is defined by light, depth, and volume rather than boxes and borders.

By utilizing intentional asymmetry—such as offset headers and varied column widths—we break the "template" look. This system favors a high-end editorial feel where the density of information does not compromise the breathing room required for deep analytical focus.

---

## 2. Colors & Surface Logic
The palette is rooted in deep slate and obsidian tones, balanced by a range of clinical whites and atmospheric blues.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined solely through background color shifts or subtle tonal transitions.
- Use `surface` (#f7f9fb) for the global canvas.
- Use `surface_container_low` (#f2f4f6) for sidebar regions.
- Use `surface_container_lowest` (#ffffff) for primary content cards to create a natural "pop" against the background.

### Surface Hierarchy & Nesting
Treat the UI as stacked sheets of fine vellum.
- **L1 (Canvas):** `surface` (#f7f9fb)
- **L2 (Section):** `surface_container` (#eceef0)
- **L3 (Focus Area):** `surface_container_highest` (#e0e3e5)
Each level of nesting should move one step up or down the container scale to signify a change in functional context.

### Named Colors
| Token | Hex | Usage |
|-------|-----|-------|
| primary | #0F172A | Primary actions, dark text emphasis |
| primary_container | #131b2e | Gradient endpoint for primary actions |
| secondary | #515f74 | Secondary text, subdued elements |
| secondary_container | #d5e3fc | Chip/badge backgrounds |
| tertiary_container | #001d31 | Dark accent areas |
| on_tertiary_container | #188ace | Success states, positive trends, active indicators |
| on_surface | #191c1e | Body text (NOT pure black) |
| on_surface_variant | #45464d | Subdued labels, descriptions |
| outline | #76777d | Subtle borders when needed |
| outline_variant | #c6c6cd | Ghost borders (15% opacity) |
| error | #ba1a1a | Error states |
| surface | #f7f9fb | Global canvas |
| surface_container_low | #f2f4f6 | Sidebar, secondary areas |
| surface_container | #eceef0 | Section backgrounds |
| surface_container_high | #e6e8ea | Info panels |
| surface_container_highest | #e0e3e5 | Focus areas |
| surface_container_lowest | #ffffff | Primary content cards |

### The "Glass & Gradient" Rule
For floating modals or high-level filters, use Glassmorphism. Set the background to a semi-transparent `surface_container_lowest` (e.g., 80% opacity) with a `20px` backdrop-blur.
- **Signature Texture:** Apply a subtle linear gradient to primary action areas, transitioning from `primary` (#000000) to `primary_container` (#131b2e).

---

## 3. Typography: The Analytical Voice
We use **Pretendard** (Korean-optimized, Inter-compatible) for body and **Inter** metrics for sizing.

- **Display (Large/Mid):** 2.75rem, tight letter-spacing (-0.02em). For data summaries.
- **Headline (Sm/Mid):** 1.5rem. Page titles.
- **Title (Sm/Mid):** 1rem, medium weight, `on_surface_variant` color. Card headers.
- **Body & Labels:** 0.75rem. Data tables use `tabular-nums` for aligned numbers.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, not structural scaffolding.

- **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background.
- **Ambient Shadows:** `0px 12px 32px rgba(25, 28, 30, 0.06)` for elevated elements only.
- **The "Ghost Border" Fallback:** `outline_variant` (#c6c6cd) at **15% opacity**.

---

## 5. Components

### Data Tables (The Core)
* **No Dividers:** Remove all horizontal and vertical rules. Use alternating row shifts between `surface_container_lowest` and `surface_container_low`.
* **Typography:** Use tabular lining figures (monospaced numbers) for all statistical values.

### Buttons & Actions
* **Primary:** Solid `primary` (#000000) with `on_primary` text. Radius: `md` (0.375rem).
* **Secondary:** No background. `surface_variant` background only on hover.

### Steppers
* **Visual Style:** Progress Bar approach — thin 2px line of `outline_variant` with active segment in `on_tertiary_container` (#188ace).
* Avoid circles-and-lines pattern.

### File Upload Areas
* Large `surface_container_low` dashed-border area (using `outline` at 40% opacity).
* `display-sm` icon in `primary` to anchor center.

### Chips
* `secondary_container` (#d5e3fc) with `on_secondary_container` (#57657a) text. Shape: pill.

---

## 6. Do's and Don'ts

### Do:
* Use extreme whitespace (32px+) between major functional blocks.
* Align data types (Right-align numbers, Left-align text).
* Use `on_tertiary_container` (#188ace) for success states — not bright green.

### Don't:
* Use 100% black text. Always use `on_surface` (#191c1e).
* Use drop shadows on cards. Use tonal shifts.
* Use standard 12-column grids for everything. Try 80/20 splits.

---

## 7. Roundness Scale
* **Default:** `0.25rem` (Buttons, Inputs)
* **Large (lg):** `0.5rem` (Cards, Modals)
* **Sharp (none):** `0px` (Sidebars bleeding to edge)

---

## 8. BioHub Adaptations

### Font
- Body: Pretendard Variable (Korean-optimized, Inter metrics)
- Monospace: JetBrains Mono (code, tabular data)
- Note: Inter is NOT used directly — Pretendard provides equivalent metrics with full Korean support.

### Icons
- Lucide React (NOT Material Symbols)
- Map Material Symbols → Lucide equivalents

### Color System
- All hex colors converted to OKLCH for perceptual uniformity
- Statistical significance colors preserved (green/gray/deep green)
- Chart colors preserved (10-color palette)

### Component Library
- shadcn/ui (new-york style) — map Stitch HTML to shadcn components
- Tailwind v4 with CSS variable architecture
