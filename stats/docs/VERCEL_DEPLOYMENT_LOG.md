# Vercel 배포 가이드

> **마지막 업데이트**: 2025-11-28
> **상태**: 배포 성공

---

## 목차

1. [핵심 개념](#핵심-개념)
2. [배포 전 체크리스트](#배포-전-체크리스트)
3. [자주 발생하는 에러](#자주-발생하는-에러)
4. [현재 프로젝트 설정](#현재-프로젝트-설정)

---

## 핵심 개념

### 1. 네이티브 바이너리란?

**한 줄 요약**: 운영체제와 CPU에 따라 다르게 컴파일된 실행 파일

JavaScript는 어디서든 실행되지만, 일부 패키지는 성능을 위해 C/C++이나 Rust로 작성됩니다.
이런 코드는 플랫폼(운영체제 + CPU)별로 다르게 컴파일해야 합니다.

**예시 - lightningcss 패키지의 파일들**:
```
lightningcss.win32-x64-msvc.node    → Windows용
lightningcss.linux-x64-gnu.node     → Linux용
lightningcss.darwin-x64.node        → macOS용
```

**왜 문제가 되나요?**
- 내 컴퓨터: Windows → Windows용 바이너리 설치됨
- Vercel 서버: Linux → Linux용 바이너리가 필요함
- `package-lock.json`이 없으면 버전이 달라져서 잘못된 바이너리가 설치될 수 있음

**해당 패키지 예시**:
- `lightningcss` (Tailwind CSS v4)
- `@tailwindcss/oxide` (Tailwind CSS v4)
- `esbuild` (번들러)
- `swc` (컴파일러)

---

### 2. package.json vs package-lock.json

**한 줄 요약**: package.json은 "대충 이 버전", lock 파일은 "정확히 이 버전"

| 구분 | package.json | package-lock.json |
|------|--------------|-------------------|
| 역할 | 의존성 범위 선언 | 정확한 버전 고정 |
| 예시 | `"tailwindcss": "^4.0.0"` | `"tailwindcss": "4.0.15"` |
| 의미 | 4.0.0 이상이면 아무거나 OK | 무조건 4.0.15만 설치 |

**왜 lock 파일이 필요한가요?**

```
오늘 npm install
→ tailwindcss 4.0.15 설치
→ lightningcss 1.25.0 설치 (4.0.15와 호환)

내일 npm install (lock 파일 없이)
→ tailwindcss 4.1.0 설치 (새 버전 나옴)
→ lightningcss 1.26.0 설치
→ 바이너리 불일치 발생!
```

**핵심 규칙**:
- `package-lock.json`은 **반드시 Git에 커밋**해야 함
- CI/CD에서는 `npm ci` 사용 (lock 파일 기준으로 설치)

---

### 3. Static Export vs Server Mode

**한 줄 요약**: HTML 파일만 만들 것인가, 서버도 돌릴 것인가

| 구분 | Static Export | Server Mode |
|------|---------------|-------------|
| 설정 | `output: 'export'` | 기본값 |
| 결과물 | `out/` 폴더 | `.next/` 폴더 |
| API Routes | 사용 불가 | 사용 가능 |
| 호스팅 | 아무 웹서버 OK | Node.js 필요 |
| 용도 | 정적 사이트, 문서 | 동적 웹앱 |

**이 프로젝트는 왜 Static Export인가요?**
- Pyodide(Python)가 **클라이언트(브라우저)**에서 실행됨
- 서버가 필요 없음
- 어떤 웹서버에서든 호스팅 가능

**주의**: Static Export에서는 API Routes(`/api/*`)를 사용할 수 없습니다.

---

### 4. Monorepo 구조

**한 줄 요약**: Next.js가 루트가 아닌 하위 폴더에 있음

```
Statistics/                    ← Git 루트
├── vercel.json               ← Vercel 설정 (여기!)
├── stats/      ← Next.js 앱 (여기서 빌드)
│   ├── app/
│   ├── package.json
│   ├── package-lock.json     ← 반드시 커밋!
│   └── next.config.ts
├── rag-system/               ← Python 시스템
└── docs/
```

**Vercel 설정의 핵심**:
- `framework: "nextjs"` 사용하면 안 됨 (루트에서 Next.js 찾으려고 함)
- `buildCommand`로 직접 지정: `cd stats && npm run build`
- `outputDirectory`는 루트 기준: `stats/out`

---

## 배포 전 체크리스트

배포하기 전에 반드시 확인하세요:

- [ ] **package-lock.json이 Git에 커밋되어 있는가?** (필수!)
- [ ] **로컬에서 `npm run build` 성공하는가?** (필수!)
- [ ] **vercel.json의 outputDirectory가 올바른가?** (필수!)
- [ ] API Routes를 사용한다면 Static Export가 아닌지 확인

---

## 자주 발생하는 에러

### 에러 1: 네이티브 바이너리 누락

```
Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
```

**원인**: package-lock.json이 없어서 버전 불일치 발생

**해결**:
```bash
git add stats/package-lock.json
git commit -m "fix: commit package-lock.json"
git push
```

---

### 에러 2: 404 NOT_FOUND

```
404: NOT_FOUND
```

**원인**: outputDirectory 설정이 잘못됨

**해결**: vercel.json 확인
- Static Export: `outputDirectory: "stats/out"`
- Server Mode: `outputDirectory: "stats/.next"`

---

### 에러 3: Next.js 버전 감지 실패

```
No Next.js version detected
```

**원인**: Monorepo에서 `framework: "nextjs"` 사용

**해결**: framework 필드 제거하고 buildCommand로 직접 지정

---

### 에러 4: API Routes와 Static Export 충돌

```
export const dynamic = "force-static" not configured on route "/api/..."
```

**원인**: Static Export에서는 API Routes 사용 불가

**해결**:
- API Routes 삭제, 또는
- Server Mode로 전환 (`output: 'export'` 제거)

---

## 현재 프로젝트 설정

### vercel.json

```json
{
  "version": 2,
  "installCommand": "cd stats && npm install --legacy-peer-deps",
  "buildCommand": "cd stats && npm run build",
  "outputDirectory": "stats/out"
}
```

### next.config.ts (핵심 부분)

```typescript
// Static Export 활성화 (프로덕션에서만)
...(process.env.NODE_ENV === 'production' && {
  output: 'export',
  trailingSlash: true,
}),
```

### 배포 요구사항

| 항목 | 상태 |
|------|------|
| package-lock.json 커밋 | 필수 |
| Static Export 활성화 | 완료 |
| API Routes 제거 | 완료 |
| outputDirectory 설정 | 완료 |

---

## 문제 해결 히스토리 (2025-11-28)

| 시도 | 결과 |
|------|------|
| rm -rf node_modules 추가 | 실패 |
| CSS_TRANSFORMER_WASM=1 환경변수 | 실패 |
| lightningcss-linux-x64-gnu 설치 | 실패 |
| optionalDependencies 추가 | 실패 |
| Vercel 캐시 삭제 | 실패 |
| **package-lock.json 커밋** | **성공!** |
| framework: nextjs 추가 | 실패 (Next.js 감지 안됨) |
| Static Export + out 디렉토리 | API Routes 에러 |
| **API Routes 제거** | **최종 성공!** |

---

**관련 문서**:
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Vercel Monorepo 설정](https://vercel.com/docs/monorepos)
