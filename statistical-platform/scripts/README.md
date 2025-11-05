# Scripts Directory

**통계 플랫폼 유틸리티 스크립트 모음**

이 디렉터리는 개발, 테스트, 빌드 자동화를 위한 스크립트를 포함합니다.

---

## 📋 목차

- [통계 페이지 검증](#통계-페이지-검증)
- [RAG 시스템](#rag-시스템)
- [빌드 유틸리티](#빌드-유틸리티)
- [개발 도구](#개발-도구)

---

## 🔍 통계 페이지 검증

### 1. `validate-statistics.js`
**용도**: 통계 페이지 UI 렌더링 검증 (L1-L3 테스트)

**실행 조건**: 개발 서버 실행 필요 (`npm run dev`)

**사용법**:
```bash
# 터미널 1: 개발 서버 실행
npm run dev

# 터미널 2: 검증 실행
node scripts/validate-statistics.js
```

**검증 항목**:
- L1: 페이지 렌더링 (HTTP 200)
- L2: 필수 UI 요소 존재 여부
- L3: 데이터 업로드 + 분석 실행

**출력**: `VALIDATION_REPORT.json`

---

### 2. `test-statistics-pages.js`
**용도**: TypeScript 타입 검증 + 버그 패턴 감지

**실행 조건**: 서버 불필요 (정적 분석)

**사용법**:
```bash
node scripts/test-statistics-pages.js
```

**검증 항목**:
- `any` 타입 사용 여부
- `useCallback` 누락
- `actions.completeAnalysis()` 사용 여부
- `useState` 직접 사용 금지

**장점**: CI/CD 통합 가능

---

### 3. `analyze-statistics-metadata.sh`
**용도**: 통계 페이지 메타데이터 분석

**실행 조건**: bash, grep, find, awk 필요

**사용법**:
```bash
bash scripts/analyze-statistics-metadata.sh
```

**분석 항목**:
- VariableSelector 사용 현황
- Steps 구현 현황
- 옵션 카드 구현 현황
- methodId 목록

**출력**: 콘솔 (표 형식)

---

### 4. `analyze-step-patterns.js`
**용도**: Step 패턴 추출 및 분류 (Phase 3 설계용)

**사용법**:
```bash
node scripts/analyze-step-patterns.js
```

**출력**: 통계별 Step 패턴 카테고리화

---

## 🤖 RAG 시스템

### 1. `generate-vector-store-metadata.js`
**용도**: 벡터스토어 메타데이터 자동 생성

**실행 시점**: 빌드 시 자동 (`npm run build`)

**사용법**:
```bash
node scripts/generate-vector-store-metadata.js
```

**동작**:
- `public/rag-data/vector-*.db` 스캔
- `public/rag-data/vector-stores.json` 생성

**의존성**: `better-sqlite3`

---

### 2. `verify-vector-stores.js`
**용도**: 벡터스토어 DB 무결성 검증

**사용법**:
```bash
node scripts/verify-vector-stores.js
```

**검증 항목**:
- DB 파일 존재 여부
- 테이블 스키마 확인
- 데이터 개수 확인

---

### 3. `copy-rag-db.js`
**용도**: RAG DB 파일 복사 (빌드 전처리)

**사용법**:
```bash
node scripts/copy-rag-db.js
```

**동작**:
- `rag-system/data/rag.db` → `public/rag-data/rag.db`

**권장**: `package.json`에 `prebuild` 스크립트로 추가

---

## 🛠️ 빌드 유틸리티

### 1. `download-sql-wasm.js`
**용도**: sql.js WASM 파일 다운로드 (Node.js)

**실행 시점**: 프로젝트 초기 설정

**사용법**:
```bash
node scripts/download-sql-wasm.js
```

**다운로드 파일**:
- `public/sql-wasm.wasm`
- `public/sql-wasm.js`

**크로스플랫폼**: Windows, macOS, Linux

---

### 2. `download-sql-wasm.sh` (Linux/Mac)
**용도**: download-sql-wasm.js의 bash 버전

**사용법**:
```bash
bash scripts/download-sql-wasm.sh
```

---

### 3. `download-sql-wasm.ps1` (Windows)
**용도**: download-sql-wasm.js의 PowerShell 버전

**사용법**:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/download-sql-wasm.ps1
```

---

### 4. `generate-icons.js`
**용도**: PWA 아이콘 생성 (SVG → PNG)

**의존성**: `sharp` ⚠️ **선택 설치**
```bash
npm install --save-dev sharp
```

**사용법**:
```bash
node scripts/generate-icons.js
```

**생성 파일**:
- `public/icon-192x192.png`
- `public/icon-512x512.png`

**참고**: PWA 아이콘이 이미 생성되어 있으면 실행 불필요

---

## 📦 아카이브된 스크립트

더 이상 사용되지 않는 스크립트는 `archive/` 디렉터리로 이동되었습니다:

- `validate-statistics.sh` - validate-statistics.js와 중복
- `test-helper-refactoring.ts` - 용도 불명확

자세한 내용: [archive/README.md](archive/README.md)

---

## 📦 package.json 스크립트

권장 추가 스크립트:

```json
{
  "scripts": {
    "validate:statistics": "node scripts/validate-statistics.js",
    "test:pages": "node scripts/test-statistics-pages.js",
    "analyze:metadata": "bash scripts/analyze-statistics-metadata.sh",
    "analyze:steps": "node scripts/analyze-step-patterns.js",
    "verify:rag": "node scripts/verify-vector-stores.js",
    "prebuild": "node scripts/copy-rag-db.js && node scripts/generate-vector-store-metadata.js",
    "setup:sql-wasm": "node scripts/download-sql-wasm.js"
  }
}
```

---

## 🚨 중요 참고사항

### 의존성 확인

일부 스크립트는 추가 의존성이 필요합니다:

```bash
# better-sqlite3 (RAG 관련)
npm install better-sqlite3

# sharp (아이콘 생성)
npm install sharp
```

### Git Bash 사용 시 주의

- `bc` 명령어 없음 → `awk`로 대체 완료 ✅
- `grep -P` (Perl regex) 미지원 가능성 → 테스트 필요

### 서버 실행 필요 여부

| 스크립트 | 서버 필요 | 용도 |
|---------|----------|------|
| validate-statistics.js | ✅ | UI 테스트 |
| test-statistics-pages.js | ❌ | 정적 분석 |
| analyze-statistics-metadata.sh | ❌ | 정적 분석 |
| analyze-step-patterns.js | ❌ | 정적 분석 |

---

## 📝 개선 제안

### 단기 (High Priority)

1. **test-helper-refactoring.ts 정리**
   - 용도 문서화 또는 삭제

2. **validate-statistics.sh 아카이브**
   - validate-statistics.js와 중복

3. **copy-rag-db.js 자동화**
   - package.json `prebuild`에 추가

### 장기 (Medium Priority)

4. **스크립트 디렉터리 재구성**
   ```
   scripts/
   ├── statistics/     # 통계 검증
   ├── rag/            # RAG 시스템
   ├── build/          # 빌드 도구
   └── archive/        # 미사용
   ```

5. **통합 CLI 도구**
   ```bash
   node scripts/cli.js validate --ui
   node scripts/cli.js validate --types
   node scripts/cli.js validate --metadata
   ```

---

## 📚 관련 문서

- [AI-CODING-RULES.md](../docs/AI-CODING-RULES.md) - TypeScript 코딩 규칙
- [STATISTICS_PAGE_CODING_STANDARDS.md](../docs/STATISTICS_PAGE_CODING_STANDARDS.md) - 통계 페이지 표준
- [TESTING_MASTER_PLAN.md](../docs/development/TESTING_MASTER_PLAN.md) - 테스트 전략

---

**최종 업데이트**: 2025-11-05
**유지보수**: 스크립트 추가/수정 시 이 문서도 함께 업데이트 필요