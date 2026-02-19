# 🗺️ Product Roadmap

**Project**: Statistical Analysis Platform
**Last Updated**: 2026-02-19

---

## 🚀 Priority 1: Export Functionality Improvements (Current Focus)

Based on the [Critical Review of Export Features], the following improvements are prioritized to enhance the user experience and feature completeness.

### 1. 📊 Chart & Graph Export (Critical)
**Status**: ❌ Missing
**Priority**: High
**Description**:
The current export (Word/HTML) only includes text and tables. The "Include Charts" option in the UI is non-functional.
**Action Items**:
- [ ] Implement chart image capture mechanism (e.g., `html2canvas` or Recharts `toDataURL`).
- [ ] Pass captured image data to `ExportService` context.
- [ ] **Word**: Insert images into the `.docx` document using `docx` ImageRun.
- [ ] **HTML**: Embed images as Base64 encoded strings in the HTML report.

### 2. 📝 Missing Content Options
**Status**: ⚠️ Partial
**Priority**: Medium
**Description**:
`export-data-builder.ts` supports Methodology/References generation, and `ResultsActionStep` export dialog now passes these toggles. Other export entry points still use fixed defaults.
**Action Items**:
- [x] **Methodology**: Add baseline static methodology mapping by method family.
- [x] **References**: Add baseline reference mapping by method family.
- [x] Connect active export UI (`ResultsActionStep`) to pass `includeMethodology` / `includeReferences`.
- [ ] Align all remaining export surfaces with the same option controls.

### 3. 🧹 Data Filtering Logic
**Status**: ⚠️ Partial
**Priority**: Low
**Description**:
`ExportContext` supports `includeRawData` and `rawDataRows`; builder creates capped preview rows. `ResultsActionStep` export dialog now controls this option.
**Action Items**:
- [x] Verify `export-data-builder.ts` checks the `includeRawData` flag.
- [x] Ensure large datasets are truncated in preview mode.
- [x] Connect active export UI (`ResultsActionStep`) to pass `includeRawData`.
- [ ] Align all remaining export surfaces with the same option controls.

---

## 🔮 Future Improvements

### 1. Smart Flow Enhancements
- [ ] **Advanced Variable Selectors**: Support for complex designs (Mixed Models, Repeated Measures).
- [ ] **EDA Reports**: Dedicated export format for Exploratory Data Analysis (distribution plots, correlation matrices).

### 2. Performance & infrastructure
- [ ] **Large Data Handling**: Optimize export for datasets > 10,000 rows.
- [ ] **Server-Side Generation**: Consider moving PDF/Word generation to a server action for heavy reports.
