# Web Worker 환경 검증 가이드

**목적**: Phase 5-3 Worker Pool 구현 전 환경 블로커 조기 발견

**작성일**: 2025-10-29

---

## 📋 개요

AdaptiveWorkerPool 구현을 시작하기 전에 개발/QA/프로덕션 환경에서 Web Worker를 정상적으로 사용할 수 있는지 검증합니다.

### 검증 항목

| 항목 | 필수 여부 | 설명 | 영향 |
|------|----------|------|------|
| **Web Worker API** | 필수 | Worker constructor 사용 가능 여부 | 없으면 구현 불가 |
| **SharedArrayBuffer** | 선택 | Pyodide 멀티스레드 지원 | 성능 최적화 (2-3배) |
| **Worker Modules** | 선택 | ES Modules in Workers | 코드 구조화 |
| **IndexedDB** | 선택 | Pyodide 패키지 캐싱 | 초기 로딩 속도 |
| **Memory Limits** | 선택 | Heap 크기 제한 | 대용량 데이터 처리 |

---

## 🚀 사용 방법

### Option 1: 브라우저 검증 (권장)

**가장 정확한 방법** - 실제 브라우저 환경에서 검증

```bash
# 1. 개발 서버 실행
npm run dev

# 2. 브라우저에서 검증 페이지 열기
# http://localhost:3000/verify-worker.html

# 3. "검증 시작" 버튼 클릭
```

**검증 결과 해석**:
- ✅ **모두 통과**: Worker Pool 최적 환경, 모든 기능 사용 가능
- ⚠️ **경고 있음**: Worker Pool 구현 가능하나 성능 제한 (권장사항 검토)
- ❌ **블로커 발견**: 필수 기능 미지원, 환경 문제 해결 필요

### Option 2: npm 스크립트 (안내)

```bash
npm run verify:worker
# → "http://localhost:3000/verify-worker.html 페이지를 브라우저에서 열어서 실행하세요."
```

---

## 📊 검증 항목 상세

### 1. Web Worker API (필수)

**확인 사항**:
```javascript
typeof Worker !== 'undefined'
```

**블로커 발견 시**:
- ❌ **문제**: Worker constructor를 찾을 수 없음
- **원인**: 매우 오래된 브라우저 (IE 10 이하, Safari 4 이하)
- **해결**: 브라우저 업데이트 또는 모던 브라우저 사용
- **영향**: Worker Pool 구현 불가

**지원 브라우저**:
- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge (모든 버전)

---

### 2. SharedArrayBuffer (선택, 성능 최적화)

**확인 사항**:
```javascript
typeof SharedArrayBuffer !== 'undefined'
```

**경고 발견 시**:
- ⚠️ **문제**: SharedArrayBuffer 미지원
- **원인**: COOP/COEP 헤더 미설정
- **영향**: Pyodide가 단일 스레드로 작동 (성능 2-3배 느림)

**해결 방법** (Next.js):

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          }
        ]
      }
    ]
  }
}

export default nextConfig
```

**주의사항**:
- COEP 헤더는 외부 리소스(CDN, 이미지 등)에 `crossorigin` 속성 필요
- 타사 스크립트/이미지가 많으면 호환성 문제 발생 가능
- 개발 환경에서는 `next dev` 재시작 필요

**테스트**:
```bash
# 헤더 설정 후 확인
curl -I http://localhost:3000 | grep Cross-Origin
```

---

### 3. Worker Modules (선택, ES Modules)

**확인 사항**:
```javascript
const worker = new Worker('worker.js', { type: 'module' })
```

**경고 발견 시**:
- ⚠️ **문제**: Worker Module 미지원
- **영향**: Classic Worker 스크립트 사용 필요 (ES5 문법)
- **해결**: 최신 브라우저로 업데이트 또는 Webpack/Rollup으로 번들링

**지원 브라우저**:
- Chrome 80+ (2020년 2월)
- Firefox 114+ (2023년 6월)
- Safari 15+ (2021년 9월)

---

### 4. IndexedDB (선택, 캐싱)

**확인 사항**:
```javascript
typeof indexedDB !== 'undefined'
```

**경고 발견 시**:
- ⚠️ **문제**: IndexedDB 미지원
- **영향**: Pyodide 패키지를 매번 네트워크에서 다운로드
- **초기 로딩**: 3-5초 → 10-15초 (느림)

**해결**: 최신 브라우저 사용 (모든 모던 브라우저 지원)

---

### 5. Memory Limits (선택, 대용량 데이터)

**확인 사항** (Chrome 전용):
```javascript
performance.memory.jsHeapSizeLimit
```

**경고 발견 시**:
- ⚠️ **문제**: Heap 제한 < 2GB
- **영향**: 대용량 데이터셋(10,000+ 행) 처리 제한
- **예**: 100MB CSV 파일 업로드 시 메모리 부족 에러

**권장 최소값**:
- 개발: 2GB+
- 프로덕션: 4GB+ (Chrome 64-bit)

**해결**:
- Chrome 64-bit 버전 사용
- `--max-old-space-size=4096` 플래그 (Node.js)

---

## 🔧 문제 해결 가이드

### 블로커 1: Web Worker 미지원

**증상**:
```
❌ Web Worker API [필수]
✗ Worker constructor를 찾을 수 없습니다
```

**해결**:
1. 브라우저 버전 확인: `navigator.userAgent`
2. Chrome/Firefox/Safari 최신 버전으로 업데이트
3. 또는 Polyfill 사용 (성능 저하):
   ```bash
   npm install webworker-threads
   ```

---

### 경고 1: SharedArrayBuffer 미지원

**증상**:
```
⚠️ SharedArrayBuffer [선택]
✗ COOP/COEP 헤더 설정 필요 (단일 스레드 제한)
```

**해결** (Next.js 15):

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          }
        ]
      }
    ]
  }
}

export default nextConfig
```

**검증**:
```bash
# 1. 개발 서버 재시작
npm run dev

# 2. 헤더 확인
curl -I http://localhost:3000

# 3. 브라우저 콘솔에서 확인
typeof SharedArrayBuffer // 'function'이어야 함
```

**주의사항**:
- Pyodide CDN은 `crossorigin="anonymous"` 속성 자동 처리
- 외부 이미지는 `<img crossorigin="anonymous">`
- 타사 스크립트는 CORS 지원 확인 필요

---

### 경고 2: IndexedDB 미지원

**증상**:
```
⚠️ IndexedDB [선택]
✗ 패키지를 매번 네트워크에서 다운로드
```

**영향**:
- Pyodide 초기 로딩: 3초 → 10초+
- 매 페이지 새로고침마다 패키지 다운로드

**해결**:
- 최신 브라우저 사용 (모든 모던 브라우저 지원)
- 또는 Service Worker 캐싱 사용

---

## 📈 환경별 권장사항

### 개발 환경 (localhost)

**필수**:
- ✅ Web Worker API
- ✅ Chrome/Firefox DevTools

**권장**:
- ⚠️ SharedArrayBuffer (COOP/COEP 헤더 설정)
- ⚠️ IndexedDB (빠른 재로딩)

**설정**:
```bash
# next.config.ts에 COOP/COEP 헤더 추가
npm run dev
```

---

### QA/Staging 환경

**필수**:
- ✅ Web Worker API
- ✅ HTTPS (SharedArrayBuffer 요구사항)

**권장**:
- ✅ SharedArrayBuffer (성능 테스트)
- ✅ IndexedDB (로딩 속도 테스트)

**설정**:
```bash
# Vercel/Netlify 배포 시 자동 HTTPS
# COOP/COEP 헤더는 next.config.ts에서 설정
```

---

### 프로덕션 환경

**필수**:
- ✅ Web Worker API
- ✅ HTTPS
- ✅ SharedArrayBuffer (성능)
- ✅ IndexedDB (사용자 경험)

**설정**:
```typescript
// next.config.ts (프로덕션)
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // SharedArrayBuffer 활성화
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },

          // 보안 헤더
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      }
    ]
  }
}
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 로컬 개발

```bash
# 1. 검증
npm run dev
# http://localhost:3000/verify-worker.html

# 2. 예상 결과
# ✅ Web Worker API [필수]
# ⚠️ SharedArrayBuffer [선택] - COOP/COEP 미설정
# ✅ IndexedDB [선택]

# 3. COOP/COEP 설정
# next.config.ts 수정

# 4. 재검증
# ✅ 모든 항목 통과
```

---

### 시나리오 2: Vercel 배포

```bash
# 1. 배포
vercel --prod

# 2. 검증
# https://your-app.vercel.app/verify-worker.html

# 3. 예상 결과
# ✅ 모든 항목 통과 (HTTPS + COOP/COEP)
```

---

## 📚 참고 자료

### 공식 문서
- [MDN: Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [MDN: SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
- [Pyodide: Loading Packages](https://pyodide.org/en/stable/usage/loading-packages.html)

### Next.js 설정
- [Next.js: Custom Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [Next.js: Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)

### 브라우저 호환성
- [Can I Use: Web Workers](https://caniuse.com/webworkers)
- [Can I Use: SharedArrayBuffer](https://caniuse.com/sharedarraybuffer)

---

## ✅ 체크리스트

Phase 5-3 시작 전 확인:

- [ ] 로컬 환경에서 `verify-worker.html` 실행
- [ ] Web Worker API 지원 확인 (필수)
- [ ] SharedArrayBuffer 지원 확인 (권장)
  - [ ] COOP/COEP 헤더 설정
  - [ ] 브라우저 재시작 후 재검증
- [ ] IndexedDB 지원 확인 (권장)
- [ ] QA/Staging 환경에서 재검증
- [ ] 프로덕션 배포 후 최종 검증

---

**작성**: Claude Code (AI)
**최종 업데이트**: 2025-10-29
**관련 Phase**: Phase 5-3 사전 준비
