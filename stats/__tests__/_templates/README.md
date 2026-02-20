# Test Templates for AI Code Generation

## Purpose

This directory contains **test templates** (not actual tests) to help AI generate up-to-date tests matching current API.

**Why templates instead of tests?**
- ✅ **Always current**: AI generates tests matching latest API
- ✅ **No maintenance**: No broken tests to fix after refactoring
- ✅ **Context efficient**: AI reads small templates, not large test files
- ✅ **Consistent patterns**: All tests follow same structure

## How to Use

### Generate a New Test

**Prompt**:
```
Generate a test for [page-name] page following _templates/statistics-page-test.md
```

**Example**:
```
Generate a test for friedman page following _templates/statistics-page-test.md
```

AI will:
1. Read the template
2. Read the current page implementation
3. Generate a test matching current API
4. Save to `__tests__/pages/friedman.test.tsx`

### Update Existing Test

**Prompt**:
```
Update __tests__/pages/friedman.test.tsx to match current API using _templates/statistics-page-test.md
```

---

## Template Files

| File | Purpose | Use When |
|------|---------|----------|
| `statistics-page-test.md` | Test single statistics page | Adding/modifying page |
| `integration-test.md` | Test multi-page workflow | Testing user flows |
| `hook-test.md` | Test custom hooks | Adding/modifying hooks |

---

## Philosophy: Tests as Documentation

Traditional approach:
```
Code changes → Fix broken tests (4-6 hours)
```

AI-first approach:
```
Code changes → Delete old tests → Regenerate from template (30 min)
```

**Benefits**:
- 10x faster than fixing
- Always matches current API
- No "test debt" accumulation

---

## Maintenance

**When to update templates**:
- ✅ New coding standards added
- ✅ New test patterns discovered
- ✅ API paradigm shift (e.g., useState → useStatisticsPage)

**When NOT to update templates**:
- ❌ Individual page changes
- ❌ Bug fixes
- ❌ Minor API tweaks

Templates are **stable patterns**, not specific implementations.
