# Scripts Directory

**통계 플랫폼 유틸리티 스크립트 모음**

이 디렉터리는 카테고리별로 정리된 개발, 테스트, 빌드 자동화 스크립트를 포함합니다.

---

## 📋 디렉터리 구조

```
scripts/
├── statistics/           # 통계 페이지 검증 및 분석
├── rag/                  # RAG 시스템 관리
├── build/                # 빌드 유틸리티
├── archive/              # 더 이상 사용되지 않는 스크립트
├── README.md             # 이 파일
└── audit-scripts.md      # 스크립트 감사 리포트
```

---

## 🔍 통계 페이지 검증 (`statistics/`)

### `validate-ui.js`
**용도**: UI 렌더링 검증 (L1-L3)  
**실행**: `npm run validate:statistics`  
**조건**: 개발 서버 필요 (`npm run dev`)

### `validate-types.js`
**용도**: TypeScript 타입 + 버그 패턴 감지  
**실행**: `npm run validate:types`  
**조건**: 서버 불필요 (정적 분석)

### `analyze-metadata.sh`
**용도**: 메타데이터 분석 (VariableSelector, Steps, Options)  
**실행**: `npm run analyze:metadata`  
**조건**: bash, grep, find, awk 필요

### `analyze-step-patterns.js`
**용도**: Step 패턴 추출 및 분류  
**실행**: `npm run analyze:steps`

---

## 🤖 RAG 시스템 (`rag/`)

### `generate-metadata.js`
**용도**: 벡터스토어 메타데이터 생성  
**실행**: `npm run generate:vector-stores` (빌드 시 자동)  
**의존성**: better-sqlite3

### `verify-stores.js`
**용도**: 벡터스토어 DB 무결성 검증  
**실행**: `npm run verify:rag`

### `copy-db.js`
**용도**: RAG DB 파일 복사 (빌드 전처리)  
**실행**: `npm run prebuild` 시 자동

---

## 🛠️ 빌드 유틸리티 (`build/`)

### `download-sql-wasm.js` (Node.js)
**용도**: sql.js WASM 파일 다운로드  
**실행**: `npm run setup:sql-wasm`  
**플랫폼**: 크로스플랫폼 (Windows, macOS, Linux)

### `download-sql-wasm.sh` (Linux/Mac)
**용도**: download-sql-wasm.js의 bash 버전  
**실행**: `bash scripts/build/download-sql-wasm.sh`

### `download-sql-wasm.ps1` (Windows)
**용도**: download-sql-wasm.js의 PowerShell 버전  
**실행**: `powershell -ExecutionPolicy Bypass -File scripts/build/download-sql-wasm.ps1`

### `generate-icons.js`
**용도**: PWA 아이콘 생성 (SVG → PNG)  
**의존성**: sharp (선택 설치)  
**실행**: `node scripts/build/generate-icons.js`

---

## 📦 아카이브 (`archive/`)

더 이상 사용되지 않는 스크립트:
- `validate-statistics.sh` - validate-ui.js와 중복
- `test-helper-refactoring.ts` - 용도 불명

자세한 내용: [archive/README.md](archive/README.md)

---

## 🚀 빠른 실행 가이드

### 통계 페이지 검증
```bash
# TypeScript 타입 검증 (서버 불필요)
npm run validate:types

# 메타데이터 분석
npm run analyze:metadata

# Step 패턴 분석
npm run analyze:steps

# UI 렌더링 검증 (서버 필요)
npm run dev  # 별도 터미널
npm run validate:statistics
```

### RAG 시스템
```bash
# 벡터스토어 검증
npm run verify:rag

# 메타데이터 생성
npm run generate:vector-stores
```

### 빌드 유틸리티
```bash
# sql.js WASM 다운로드 (프로젝트 초기 설정 시 1회)
npm run setup:sql-wasm
```

---

## 📚 관련 문서

- [audit-scripts.md](audit-scripts.md) - 스크립트 감사 리포트
- [archive/README.md](archive/README.md) - 아카이브 정책
- [../docs/AI-CODING-RULES.md](../docs/AI-CODING-RULES.md) - TypeScript 코딩 규칙
- [../docs/STATISTICS_PAGE_CODING_STANDARDS.md](../docs/STATISTICS_PAGE_CODING_STANDARDS.md) - 통계 페이지 표준

---

**최종 업데이트**: 2025-11-05 (Phase 3 완료)  
**유지보수**: 스크립트 추가/수정 시 이 문서도 함께 업데이트 필요
