# 완전 오프라인 배포 가이드

내부망(인터넷 차단 환경)에서 통계 플랫폼을 완전히 오프라인으로 배포하는 방법입니다.

## 목차
1. [Pyodide 다운로드](#1-pyodide-다운로드)
2. [프로젝트에 Pyodide 복사](#2-프로젝트에-pyodide-복사)
3. [코드 수정 (CDN → 로컬)](#3-코드-수정-cdn--로컬)
4. [빌드 및 배포](#4-빌드-및-배포)
5. [사용자 배포](#5-사용자-배포)

---

## 1. Pyodide 다운로드

### 1-1. Pyodide 릴리스 다운로드 (인터넷 연결된 PC에서)

```bash
# 다운로드 폴더로 이동
cd ~/Downloads

# Pyodide v0.28.3 다운로드
wget https://github.com/pyodide/pyodide/releases/download/0.28.3/pyodide-0.28.3.tar.bz2

# 또는 브라우저에서 직접 다운로드:
# https://github.com/pyodide/pyodide/releases/download/0.28.3/pyodide-0.28.3.tar.bz2
```

### 1-2. 압축 해제

```bash
# tar.bz2 압축 해제
tar -xjf pyodide-0.28.3.tar.bz2

# 폴더 구조 확인
ls -lh pyodide/
```

**생성된 파일들** (약 200 MB):
```
pyodide/
├── pyodide.js              # 진입점 (필수)
├── pyodide.asm.js          # WebAssembly fallback
├── pyodide.asm.wasm        # Python 런타임 (50 MB)
├── python_stdlib.zip       # Python 표준 라이브러리
├── packages.json           # 패키지 메타데이터
└── packages/               # Python 패키지들
    ├── numpy.js
    ├── numpy.data          # NumPy 데이터 (15 MB)
    ├── scipy.js
    ├── scipy.data          # SciPy 데이터 (30 MB)
    ├── pandas.js
    ├── pandas.data         # Pandas 데이터 (20 MB)
    ├── statsmodels.js
    ├── statsmodels.data    # statsmodels 데이터 (10 MB)
    └── ... (100+ 패키지)
```

---

## 2. 프로젝트에 Pyodide 복사

### 2-1. public 폴더에 복사

```bash
# 프로젝트 루트로 이동
cd d:/Projects/Statics/statistical-platform

# public/pyodide 폴더 생성
mkdir -p public/pyodide

# Pyodide 파일 복사
cp -r ~/Downloads/pyodide/* public/pyodide/

# 복사 확인
ls -lh public/pyodide/
```

### 2-2. 폴더 구조 확인

```
statistical-platform/
├── public/
│   ├── pyodide/                 # ← 새로 추가됨
│   │   ├── pyodide.js
│   │   ├── pyodide.asm.wasm
│   │   └── packages/
│   └── workers/
│       └── python/
├── app/
├── lib/
└── package.json
```

---

## 3. 코드 수정 (CDN → 로컬)

### 3-1. 환경 변수 파일 생성

파일 생성: `.env.local`

```bash
# 오프라인 모드 활성화
NEXT_PUBLIC_PYODIDE_USE_LOCAL=true

# 로컬 경로 지정 (public/pyodide/ → /pyodide/)
NEXT_PUBLIC_PYODIDE_LOCAL_PATH=/pyodide/
```

**설명:**
- `NEXT_PUBLIC_PYODIDE_USE_LOCAL=true`: 로컬 모드 활성화
- `/pyodide/`: 빌드 후 `out/pyodide/` 경로로 변환됨

---

### 3-2. `lib/constants.ts` 수정

파일: `statistical-platform/lib/constants.ts`

**기존 코드** (63-72번 줄):
```typescript
export function getPyodideCDNUrls() {
  const version = PYODIDE.OVERRIDE_VERSION || PYODIDE.VERSION
  const baseUrl = `https://cdn.jsdelivr.net/pyodide/${version}/full`

  return {
    version,
    indexURL: `${baseUrl}/`,
    scriptURL: `${baseUrl}/pyodide.js`
  } as const
}
```

**수정 후 코드**:
```typescript
export function getPyodideCDNUrls() {
  // 오프라인 모드 체크 (환경 변수로 설정)
  const useLocal = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PYODIDE_USE_LOCAL === 'true'

  if (useLocal) {
    // 로컬 경로 사용 (오프라인 배포)
    const localPath = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PYODIDE_LOCAL_PATH) || '/pyodide/'

    console.log('[Pyodide CDN] 오프라인 모드 활성화:', localPath)

    return {
      version: 'local',
      indexURL: localPath,
      scriptURL: `${localPath}pyodide.js`,
      isLocal: true
    } as const
  }

  // 온라인 모드: CDN 사용
  const version = PYODIDE.OVERRIDE_VERSION || PYODIDE.VERSION
  const baseUrl = `https://cdn.jsdelivr.net/pyodide/${version}/full`

  return {
    version,
    indexURL: `${baseUrl}/`,
    scriptURL: `${baseUrl}/pyodide.js`,
    isLocal: false
  } as const
}
```

---

### 3-3. 주석 업데이트

파일: `statistical-platform/lib/constants.ts`

**기존 주석** (57-62번 줄):
```typescript
/**
 * Pyodide CDN URL을 동적으로 생성합니다
 * 환경 변수(OVERRIDE_VERSION)가 있으면 우선 사용
 *
 * @returns 현재 사용 중인 Pyodide CDN URL 객체
 */
```

**수정 후 주석**:
```typescript
/**
 * Pyodide CDN URL을 동적으로 생성합니다
 * 환경 변수(OVERRIDE_VERSION)가 있으면 우선 사용
 *
 * 오프라인 모드:
 * - NEXT_PUBLIC_PYODIDE_USE_LOCAL=true 설정 시
 * - 로컬 경로(/pyodide/)에서 Pyodide 로드
 * - CDN 의존성 제거 (내부망 배포용)
 *
 * @returns 현재 사용 중인 Pyodide CDN URL 객체
 */
```

---

## 4. 빌드 및 배포

### 4-1. TypeScript 컴파일 체크

```bash
cd statistical-platform

# 타입 에러 확인
npx tsc --noEmit
```

**기대 결과**: `0 errors`

---

### 4-2. 빌드

```bash
# 오프라인 모드 빌드
npm run build
```

**빌드 결과**:
```
out/
├── index.html
├── statistics/
├── pyodide/                    # ← public/pyodide/가 복사됨
│   ├── pyodide.js
│   ├── pyodide.asm.wasm
│   └── packages/
├── _next/
│   └── static/
└── favicon.ico

총 크기: ~250 MB (Pyodide 포함)
```

---

### 4-3. 로컬 테스트

```bash
# 정적 파일 서버 실행
cd out
npx serve .

# 브라우저에서 열기
# http://localhost:3000
```

**테스트 체크리스트:**
- [ ] 페이지 로드 정상
- [ ] Pyodide 로컬 로드 확인 (브라우저 콘솔)
- [ ] CSV 업로드 정상
- [ ] 통계 분석 실행 정상
- [ ] 인터넷 연결 끊고 테스트 (완전 오프라인)

**브라우저 콘솔 확인:**
```
[Pyodide CDN] 오프라인 모드 활성화: /pyodide/
[Pyodide Loader] 로컬에서 Pyodide 스크립트 로딩 중...
[Pyodide Loader] Pyodide 초기화 완료 (local)
```

---

## 5. 사용자 배포

### 5-1. ZIP 압축

```bash
# out/ 폴더 압축
cd d:/Projects/Statics/statistical-platform
zip -r statistics-offline.zip out/

# 또는 Windows에서:
# out/ 폴더 우클릭 → "압축 파일로 보내기"
```

**압축 파일 크기**: ~100 MB (압축 후)

---

### 5-2. 사용자에게 전달

**전달 방법:**
1. **USB 메모리**: 가장 안전 (내부망)
2. **이메일**: 파일 크기 제한 주의 (100 MB)
3. **내부 공유 폴더**: `\\server\shared\statistics-offline.zip`
4. **클라우드 (일시적)**: Google Drive → 다운로드 후 삭제

---

### 5-3. 사용자 실행 방법

**압축 해제:**
```
statistics-offline.zip 우클릭 → "압축 풀기"
→ statistics-offline/ 폴더 생성
```

**실행:**
```
statistics-offline/
└── out/
    └── index.html  ← 더블 클릭!
```

**브라우저가 자동으로 실행됨:**
```
file:///C:/Users/연구원1/Desktop/statistics-offline/out/index.html
```

---

## 6. 트러블슈팅

### 문제 1: Pyodide 로드 실패

**증상:**
```
Error: Failed to load pyodide.js from /pyodide/pyodide.js
```

**해결:**
1. `out/pyodide/` 폴더 확인
2. `pyodide.js` 파일 존재 확인
3. 브라우저 콘솔에서 경로 확인

---

### 문제 2: 패키지 로드 실패

**증상:**
```
Error: Could not load package 'numpy'
```

**해결:**
1. `out/pyodide/packages/` 폴더 확인
2. `numpy.js`, `numpy.data` 파일 존재 확인
3. `packages.json` 파일 확인

---

### 문제 3: 파일 크기 너무 큼

**해결: 필요한 패키지만 포함**

```bash
# 1. Pyodide 전체 다운로드
tar -xjf pyodide-0.28.3.tar.bz2

# 2. 필요한 패키지만 복사
mkdir -p public/pyodide/packages
cp pyodide/pyodide.js public/pyodide/
cp pyodide/pyodide.asm.wasm public/pyodide/
cp pyodide/python_stdlib.zip public/pyodide/
cp pyodide/packages.json public/pyodide/

# 3. 통계 패키지만 복사
cp pyodide/packages/numpy.* public/pyodide/packages/
cp pyodide/packages/scipy.* public/pyodide/packages/
cp pyodide/packages/pandas.* public/pyodide/packages/
cp pyodide/packages/statsmodels.* public/pyodide/packages/

# 결과: ~150 MB (전체 200 MB → 150 MB)
```

---

### 문제 4: 브라우저 CORS 에러

**증상:**
```
Access to script at 'file:///pyodide/pyodide.js' from origin 'null' has been blocked by CORS policy
```

**해결: 로컬 웹 서버 사용**

```bash
# 1. out/ 폴더에서 정적 서버 실행
cd out
npx serve .

# 2. 브라우저에서 접속
http://localhost:3000

# 또는 Python 서버
python -m http.server 3000
```

**사용자에게 전달할 실행 스크립트** (`run.bat`):
```bat
@echo off
echo 통계 플랫폼 서버 시작 중...
cd out
npx serve .
pause
```

---

## 7. 빌드 모드 비교

| 항목 | 온라인 모드 (CDN) | 오프라인 모드 (로컬) |
|------|------------------|---------------------|
| **환경 변수** | 설정 안 함 | `NEXT_PUBLIC_PYODIDE_USE_LOCAL=true` |
| **Pyodide 위치** | CDN (jsdelivr) | `out/pyodide/` |
| **파일 크기** | ~5 MB | ~250 MB |
| **인터넷** | 필수 (초기 로딩) | 불필요 |
| **로딩 속도** | 빠름 (CDN) | 중간 (로컬 디스크) |
| **데이터 보안** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **사용 환경** | 인터넷 가능 | 내부망 (인터넷 차단) |

---

## 8. 배포 체크리스트

### 개발자 (빌드 전)
- [ ] Pyodide 다운로드 및 압축 해제
- [ ] `public/pyodide/` 폴더에 복사
- [ ] `.env.local` 파일 생성 (`NEXT_PUBLIC_PYODIDE_USE_LOCAL=true`)
- [ ] `lib/constants.ts` 수정 (로컬 경로 지원)
- [ ] TypeScript 컴파일 체크 (`npx tsc --noEmit`)

### 개발자 (빌드 후)
- [ ] `npm run build` 성공
- [ ] `out/pyodide/` 폴더 존재 확인
- [ ] 로컬 테스트 (`npx serve out`)
- [ ] 인터넷 연결 끊고 테스트 (완전 오프라인)
- [ ] ZIP 압축 (`statistics-offline.zip`)

### 사용자 (배포 후)
- [ ] ZIP 압축 해제
- [ ] `index.html` 더블 클릭 또는 로컬 서버 실행
- [ ] Pyodide 로드 확인 (브라우저 콘솔)
- [ ] CSV 업로드 테스트
- [ ] 통계 분석 실행 테스트

---

## 9. 참고 문서

- [Pyodide 공식 문서](https://pyodide.org/en/stable/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [CLAUDE.md - 배포 방식](../CLAUDE.md#-배포-방식-critical---데이터-프라이버시)

---

## 10. 자주 묻는 질문 (FAQ)

### Q1. Pyodide 버전을 업데이트하려면?

**A**: 새 버전 다운로드 후 `public/pyodide/` 덮어쓰기

```bash
# 새 버전 다운로드 (예: v0.29.0)
wget https://github.com/pyodide/pyodide/releases/download/0.29.0/pyodide-0.29.0.tar.bz2
tar -xjf pyodide-0.29.0.tar.bz2

# 기존 폴더 백업
mv public/pyodide public/pyodide.backup

# 새 버전 복사
cp -r pyodide public/pyodide

# 테스트 후 빌드
npm run build
```

---

### Q2. 일부 패키지만 포함 가능한가요?

**A**: 가능합니다. `packages/` 폴더에서 필요한 것만 복사

**필수 패키지** (통계 플랫폼):
- `numpy.*` (15 MB) - 수치 계산
- `scipy.*` (30 MB) - 통계 함수
- `pandas.*` (20 MB) - 데이터 처리
- `statsmodels.*` (10 MB) - 고급 통계

**선택 패키지** (필요 시):
- `matplotlib.*` (10 MB) - 차트 (현재 미사용)
- `scikit-learn.*` (20 MB) - 머신러닝 (현재 미사용)

**최소 구성** (~75 MB):
```bash
# 필수 파일만 복사
cp pyodide/pyodide.js public/pyodide/
cp pyodide/pyodide.asm.wasm public/pyodide/
cp pyodide/python_stdlib.zip public/pyodide/
cp pyodide/packages.json public/pyodide/
mkdir -p public/pyodide/packages

# 필수 패키지만 복사
for pkg in numpy scipy pandas statsmodels; do
  cp pyodide/packages/${pkg}.* public/pyodide/packages/
done
```

---

### Q3. 업데이트를 사용자에게 어떻게 전달하나요?

**A**: 새로 빌드 후 전체 ZIP 재전달

```bash
# 1. 코드 수정
# 2. 빌드
npm run build

# 3. 버전 표시 (선택)
echo "v1.1.0 - 2025-11-01" > out/VERSION.txt

# 4. ZIP 압축
zip -r statistics-offline-v1.1.0.zip out/

# 5. 사용자에게 전달
# 기존 폴더 삭제 → 새 ZIP 압축 해제
```

**자동 업데이트 불가** (오프라인 환경 특성)

---

**문서 작성일**: 2025-10-31
**버전**: 1.0
**작성자**: Claude Code
