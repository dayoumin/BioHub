# Vercel Deployment Troubleshooting Log

> **Last Updated**: 2025-11-28
> **Purpose**: Track deployment issues and solutions for future reference

---

## Quick Reference

| Issue | Solution | Status |
|-------|----------|--------|
| `lightningcss.linux-x64-gnu.node` not found | Commit `package-lock.json` | ✅ Solved |
| `@tailwindcss/oxide-wasm32-wasi` EBADPLATFORM | Remove optionalDependencies | ✅ Solved |
| 404 NOT_FOUND after successful build | Use static export + `outputDirectory: out` | 🔄 In Progress |
| API routes incompatible with static export | Remove or disable API routes | 🔄 In Progress |

---

## Issue #1: lightningcss Native Binary Not Found

**Date**: 2025-11-28

**Error**:
```
Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
```

**Root Cause**:
- Tailwind CSS v4 uses `lightningcss` for CSS processing
- `lightningcss` requires platform-specific native binaries
- Without `package-lock.json`, npm installs different versions each time
- Windows development → Linux build = different binaries needed

**What Didn't Work**:
| Attempt | Why It Failed |
|---------|---------------|
| `rm -rf node_modules` in installCommand | Doesn't affect binary selection |
| `CSS_TRANSFORMER_WASM=1` env var | Not a real environment variable |
| Install `lightningcss-linux-x64-gnu` explicitly | Caused oxide error |
| Add `@tailwindcss/oxide-linux-x64-gnu` to optionalDependencies | Caused wasm32 platform error |
| Clear Vercel build cache (Redeploy without cache) | Cache wasn't the issue |

**Solution**: ✅ Commit `package-lock.json`
```bash
git add statistical-platform/package-lock.json
git commit -m "fix: commit package-lock.json for consistent builds"
git push
```

**Why It Works**:
- `package-lock.json` pins exact dependency versions
- npm reads lock file and installs correct platform binaries automatically
- Ensures reproducible builds across different environments

---

## Issue #2: EBADPLATFORM for oxide-wasm32-wasi

**Date**: 2025-11-28

**Error**:
```
npm error code EBADPLATFORM
npm error notsup Unsupported platform for @tailwindcss/oxide-wasm32-wasi
```

**Root Cause**:
- Added Linux-specific packages to `optionalDependencies`
- npm tried to install wasm32-wasi package which isn't compatible

**Solution**: ✅ Remove optionalDependencies from package.json

---

## Issue #3: 404 NOT_FOUND After Successful Build

**Date**: 2025-11-28

**Symptoms**:
- Build completes successfully (76 pages generated)
- Site shows 404 NOT_FOUND error
- All routes return 404

**Root Cause Analysis**:
- `next.config.ts` had `!process.env.VERCEL` condition
- This disabled static export on Vercel, enabling server mode
- Server mode generates `.next/` folder
- But monorepo structure + custom `outputDirectory` confused Vercel

**Attempted Solutions**:

| Attempt | Result |
|---------|--------|
| `outputDirectory: "statistical-platform/.next"` | Still 404 |
| Add `framework: "nextjs"` | "No Next.js version detected" error |
| Remove `framework`, keep `.next` output | Still 404 |
| Enable static export on Vercel + `outputDirectory: out` | API routes error |

**Current Status**: 🔄 Need to handle API routes

---

## Issue #4: API Routes Incompatible with Static Export

**Date**: 2025-11-28

**Error**:
```
Error: export const dynamic = "force-static"/export const revalidate not configured
on route "/api/feedback" with "output: export"
```

**Root Cause**:
- Static export (`output: 'export'`) doesn't support dynamic API routes
- Project has 5 API routes that need server-side processing

**Affected Files**:
```
app/api/feedback/route.ts
app/api/feedback/admin/route.ts
app/api/rag/parse-file/route.ts
app/api/rag/stream/route.ts
app/api/rag/supported-formats/route.ts
```

**Options**:
1. **Remove API routes** - Simple but loses functionality
2. **Use `force-static`** - Only for routes that can be static
3. **Use server mode** - Requires fixing monorepo detection
4. **Move to separate API service** - More complex architecture

**Current Status**: 🔄 Pending decision

---

## Successful Build Configuration

**Last Known Working Config** (Commit: `e776525`):

**vercel.json**:
```json
{
  "version": 2,
  "installCommand": "cd statistical-platform && npm install --legacy-peer-deps",
  "buildCommand": "cd statistical-platform && npm run build",
  "outputDirectory": "statistical-platform/out"
}
```

**next.config.ts** (relevant part):
```typescript
// Static export enabled (no VERCEL condition)
...(process.env.NODE_ENV === 'production' && {
  output: 'export',
  trailingSlash: true,
}),
```

**Requirements**:
- ✅ `package-lock.json` must be committed
- ✅ No optionalDependencies for platform-specific packages
- ⚠️ API routes must be removed or made static

---

## Key Learnings

### 1. Native Binaries in Cross-Platform Builds
Packages like `lightningcss`, `@tailwindcss/oxide`, `esbuild`, `swc` use platform-specific compiled code:
- Windows: `.win32-x64-msvc.node`
- Linux: `.linux-x64-gnu.node`
- macOS: `.darwin-x64.node`

**Always commit `package-lock.json`** to ensure correct binaries are installed.

### 2. package.json vs package-lock.json

| File | Purpose | Version Format |
|------|---------|---------------|
| `package.json` | Declares dependencies | Ranges (`^4.0.0`, `~1.2.0`) |
| `package-lock.json` | Locks exact versions | Exact (`4.0.15`) |

Without lock file:
- `^4.0.0` could install `4.0.15` today, `4.1.0` tomorrow
- Different platforms may get different sub-dependencies

### 3. Static Export vs Server Mode

| Feature | Static Export | Server Mode |
|---------|--------------|-------------|
| Output folder | `out/` | `.next/` |
| API routes | ❌ Not supported | ✅ Supported |
| Dynamic routes | Limited | Full support |
| Hosting | Any static host | Node.js required |

### 4. Monorepo Considerations
When Next.js is in a subdirectory:
- `framework: "nextjs"` looks for Next.js in root (fails)
- Must use custom `buildCommand` with `cd subdirectory`
- `outputDirectory` must include subdirectory path

---

## Commit History

| Commit | Change | Result |
|--------|--------|--------|
| `6f9bcb2` | Added `framework: "nextjs"` | ❌ "No Next.js version detected" |
| `f7fe1d6` | Removed `framework` field | ❌ 404 |
| `34c4b70` | Static export + `out` directory | ❌ API routes error |
| (next) | TBD: Handle API routes | 🔄 Pending |

---

## TODO

- [ ] Decide API routes strategy
- [ ] Test build locally before push
- [ ] Verify deployment works
- [ ] Update DEPLOYMENT_SCENARIOS.md with final solution
