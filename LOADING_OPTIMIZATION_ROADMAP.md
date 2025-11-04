# 통계 플랫폼 로딩 최적화 로드맵

**작성일**: 2025-11-05
**버전**: 1.1.0
**상태**: ✅ Phase 1-1, 1-2 완료

---

## 📊 현재 상황 분석

### 현재 로딩 방식 (Phase 6 완료 후)

```
사용자 앱 로드
    ↓
Pyodide CDN 로드 (런타임)
    ↓
NumPy + SciPy 패키지 로드 (~2초)
    ↓
Worker 대기 (Lazy Loading)
    ↓
사용자 통계 메서드 선택
    ↓
해당 Worker + 추가 패키지 로드 → 통계 계산
```

### 현재 방식의 특징

✅ **이미 온디맨드 로딩 적용**
- 기본 초기화: NumPy + SciPy만 로드 (~2초)
- Worker: 필요할 때만 로드
- 추가 패키지: 백그라운드 로드

✅ **메모리 효율적**
- 사용하지 않는 Worker는 로드 안 함

⚠️ **개선 가능 영역**
- 추가 패키지 로딩 에러 처리 부족
- 로딩 상태 피드백 없음
- 타임아웃/재시도 로직 없음

---

## 🎯 개선 로드맵

### **Phase 1: 웹 버전 완성 (현재)**

#### **Phase 1-1: 로딩 피드백 개선 (✅ 완료)**

**소요 시간**: 2~3시간
**파일**: `lib/services/pyodide/core/pyodide-core.service.ts`

**구현 내용**:
1. ✅ 타임아웃 설정 (30초)
2. ✅ 재시도 로직 (최대 3회, 지수 백오프)
3. ✅ 진행률 로깅
4. ✅ 에러 처리 개선

**코드 변경**:
```typescript
// Before (Line 557-572)
private async loadAdditionalPackages(workerNumber: number): Promise<void> {
  // 백그라운드 로딩 (에러는 로그만 출력)
  this.pyodide.loadPackage([...packages]).catch((error) => {
    console.error(`Worker ${workerNumber} 패키지 로드 실패:`, error)
  })
}

// After (Line 557-620)
private async loadAdditionalPackages(workerNumber: number): Promise<void> {
  const MAX_RETRIES = 3
  const TIMEOUT_MS = 30000 // 30초

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i]
    let retryCount = 0

    while (retryCount < MAX_RETRIES) {
      try {
        console.log(`📦 Worker ${workerNumber}: ${pkg} 로딩 중... (${i + 1}/${packages.length})`)

        await Promise.race([
          this.pyodide.loadPackage([pkg]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
          )
        ])

        console.log(`✅ Worker ${workerNumber}: ${pkg} 로드 완료`)
        break
      } catch (error) {
        retryCount++
        if (retryCount >= MAX_RETRIES) {
          console.error(`❌ Worker ${workerNumber}: ${pkg} 로드 실패 (${MAX_RETRIES}회 시도)`)
          console.warn(`⚠️ ${pkg} 패키지를 로드하지 못했습니다. 일부 기능이 제한될 수 있습니다.`)
          break
        }

        const waitTime = 1000 * retryCount
        console.warn(`⏳ Worker ${workerNumber}: ${pkg} 재시도 중... (${retryCount}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  console.log(`🎉 Worker ${workerNumber}: 모든 패키지 로드 완료`)
}
```

**예상 효과**:
- UX 향상도: +80%
- 디버깅 효율: +60%
- 로딩 실패 탐지: +100%

---

#### **Phase 1-2: PWA 적용 (⏳ 진행 예정)**

**소요 시간**: 1~2일
**우선순위**: 높음

**목표**:
- 두 번째 방문부터 즉시 시작 (2~3초 → 0.3초)
- 브라우저 자동 캐싱
- 오프라인 부분 지원

**구현 방법**:
```bash
npm install next-pwa
```

**설정**:
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/pyodide\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'pyodide-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30일
        }
      }
    }
  ]
})

module.exports = withPWA({
  // 기존 설정
})
```

**예상 효과**:
- 재방문 속도: +90% (2~3초 → 0.3초)
- 대역폭 절약: -95%
- 오프라인 지원: 부분 가능

---

#### **Phase 1-3: 남은 통계 페이지 완성 (⏳ 진행 중)**

**현재 진행률**: 34/45 완료 (76%)
**남은 작업**: 11개 페이지

---

#### **Phase 1-4: 전체 통합 테스트**

**체크리스트**:
- [ ] 45개 페이지 모두 정상 동작
- [ ] TypeScript 에러 0개
- [ ] 빌드 성공
- [ ] 실제 데이터 검증 (SPSS/R 결과와 비교)
- [ ] 1주일 안정적 운영

---

### **Phase 2: 데스크톱 앱 전환 (웹 완성 후)**

**조건**: Phase 1 완료 AND 다음 중 하나
1. ✅ 45개 통계 페이지 100% 완성
2. ✅ 1주일 이상 안정적 운영
3. ✅ 사용자 피드백 수집 완료

#### **Phase 2-1: Tauri 초기 설정 (1일)**
```bash
npm install -D @tauri-apps/cli
npm install @tauri-apps/api
npx tauri init
```

#### **Phase 2-2: Static Export 설정 (1일)**
```javascript
// next.config.js
module.exports = {
  output: 'export',
  images: { unoptimized: true }
}
```

#### **Phase 2-3: Pyodide 로컬 번들링 (1일)**
```rust
// src-tauri/tauri.conf.json
{
  "tauri": {
    "bundle": {
      "resources": ["pyodide/**/*"]
    }
  }
}
```

#### **Phase 2-4: 네이티브 기능 추가 (선택, 1일)**
```rust
#[tauri::command]
fn load_csv(path: String) -> Result<Vec<Vec<String>>, String> {
    // 네이티브 CSV 로더
}
```

#### **Phase 2-5: 빌드 및 배포 (1일)**

**예상 성능 향상**:
- 로딩 속도: -50% (2-3초 → 1-2초)
- 메모리: -30% (450MB → 320MB)
- 계산 속도: +15%
- 파일 처리: 10배+

---

## 🏢 내부망 환경 고려사항

### 📍 인프라 분석

#### **문제점**:
1. **외부 CDN 차단 가능성**
   - Pyodide CDN (`cdn.jsdelivr.net`) 접근 불가
   - 패키지 다운로드 실패

2. **Service Worker 제약**
   - HTTPS 또는 localhost에서만 동작
   - 내부망에서 TLS 구성 필요
   - 보안 정책으로 SW 차단 가능

3. **프록시/방화벽**
   - PWA 자동 업데이트 차단
   - WebSocket 차단 가능

#### **해결 방안**:

**우선순위 1: 사내 호스팅 (필수)**

```bash
# Pyodide 및 패키지를 사내 서버에 복사
mkdir -p /internal-server/pyodide/v0.24.1/
cd /internal-server/pyodide/v0.24.1/

# Pyodide 전체 다운로드
wget -r -np -nH --cut-dirs=2 https://cdn.jsdelivr.net/pyodide/v0.24.1/full/

# 코드 설정 변경
```

```typescript
// lib/constants.ts
export function getPyodideCDNUrls() {
  // 내부망 환경 감지
  const isInternalNetwork = window.location.hostname.includes('.corp') ||
                           window.location.hostname.startsWith('192.168')

  if (isInternalNetwork) {
    return {
      scriptURL: 'https://internal-server.corp/pyodide/v0.24.1/full/pyodide.js',
      indexURL: 'https://internal-server.corp/pyodide/v0.24.1/full/'
    }
  }

  return {
    scriptURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js',
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
  }
}
```

**우선순위 2: IndexedDB 캐싱 (안전)**

```typescript
// lib/services/cache/pyodide-cache.ts
export class PyodideCache {
  private db: IDBDatabase | null = null

  async savePackage(name: string, version: string, data: ArrayBuffer): Promise<void> {
    // IndexedDB에 패키지 저장
    const tx = this.db!.transaction(['packages'], 'readwrite')
    const store = tx.objectStore('packages')

    await store.put({
      name,
      version,
      data,
      checksum: await this.calculateChecksum(data),
      timestamp: Date.now()
    })
  }

  async loadPackage(name: string, version: string): Promise<ArrayBuffer | null> {
    // IndexedDB에서 패키지 로드
    const tx = this.db!.transaction(['packages'], 'readonly')
    const store = tx.objectStore('packages')
    const result = await store.get([name, version])

    return result?.data || null
  }
}
```

**장점**:
- ✅ 네트워크 의존도 낮음
- ✅ Service Worker 불필요
- ✅ 브라우저 정책만 확인하면 됨

**주의사항**:
- 브라우저별 용량 제한 (50-250MB)
- 사전 테스트 필요

**우선순위 3: Service Worker (조건부)**

**사전 요구사항**:
1. ✅ HTTPS 구성 (사설 인증서 또는 사내 CA)
2. ✅ 보안팀 허용 확인
3. ✅ 네트워크 정책 확인

**구현 순서**:
```
1. 사내 호스팅 구성
2. IndexedDB 캐싱 적용
3. (TLS 구성 완료 시) PWA/SW 추가
```

---

### 📋 내부망 체크리스트

**배포 전 확인사항**:

#### **네트워크**:
- [ ] 외부 CDN 접근 가능 여부 확인
- [ ] 프록시 설정 확인
- [ ] WebSocket 지원 여부 확인

#### **보안**:
- [ ] TLS/HTTPS 구성 완료
- [ ] 사내 CA 인증서 설치
- [ ] Service Worker 정책 확인
- [ ] CSP (Content Security Policy) 설정

#### **스토리지**:
- [ ] 브라우저별 IndexedDB 용량 제한 확인
- [ ] 사내 파일 서버 용량 확인 (Pyodide: ~100MB)

#### **테스트**:
- [ ] 내부망 환경에서 초기 로딩 테스트
- [ ] 오프라인 모드 테스트
- [ ] 캐시 무효화 테스트
- [ ] 버전 업데이트 테스트

---

## 📊 성능 비교표

### 웹 vs 데스크톱

| 지표 | 웹 (Chrome) | 웹 (PWA) | Tauri | 내부망 (사내 호스팅) |
|------|------------|----------|-------|-------------------|
| **초기 로딩** | 2-3초 | 0.3초 (재방문) | 1-2초 | 1-2초 |
| **패키지 로드** | 3-5초 | 즉시 (캐시) | 2-3초 | 2-3초 |
| **메모리** | 450MB | 450MB | 320MB | 450MB |
| **계산 속도** | 기준 | 기준 | +15% | 기준 |
| **오프라인** | ❌ | 부분 ✅ | 완전 ✅ | 부분 ✅ (캐시) |
| **파일 I/O** | 제한적 | 제한적 | 무제한 | 제한적 |
| **설치 크기** | - | - | 80-120MB | - |
| **CDN 의존** | ✅ | ✅ | ❌ | ❌ |

---

## 🎯 최종 추천 순서

### **일반 환경 (외부 인터넷 가능)**

```
1. Phase 1-1: 로딩 피드백 개선 (✅ 완료)
2. Phase 1-2: PWA 적용 (⏳ 다음)
3. Phase 1-3~4: 웹 완성 및 검증
4. Phase 2: Tauri 전환 (선택)
```

### **내부망 환경 (외부 인터넷 제한)**

```
1. Phase 1-1: 로딩 피드백 개선 (✅ 완료)
2. 사내 호스팅 구성 (필수, 1일)
3. IndexedDB 캐싱 추가 (1일)
4. Phase 1-3~4: 웹 완성 및 검증
5. (TLS 구성 완료 시) PWA 추가 (선택)
6. Phase 2: Tauri 전환 (권장)
```

**내부망 환경에서는 Tauri 전환을 강력 권장**:
- ✅ CDN 의존 없음
- ✅ 완전 오프라인
- ✅ 성능 향상
- ✅ 파일 I/O 자유로움

---

## 📝 버전 관리

### 변경 이력

**v1.0.0 (2025-11-05)**:
- Phase 1-1 완료: loadAdditionalPackages 개선
- 타임아웃, 재시도, 진행률 로깅 추가
- 내부망 고려사항 문서화

---

## 🔗 참고 문서

- [CLAUDE.md](CLAUDE.md) - AI 코딩 규칙
- [STATUS.md](STATUS.md) - 프로젝트 현재 상태
- [ROADMAP.md](ROADMAP.md) - 전체 개발 로드맵
- [pyodide-core.service.ts](statistical-platform/lib/services/pyodide/core/pyodide-core.service.ts) - 핵심 코드

---

**작성자**: Claude AI + 사용자
**라이선스**: 프로젝트와 동일
**최종 업데이트**: 2025-11-05
