# Scripts Audit Report

**작성일**: 2025-11-05  
**목적**: scripts/ 디렉터리의 모든 스크립트 점검 및 정리

---

## 📊 현황 요약

| 항목 | 수량 |
|------|------|
| 전체 스크립트 | 13개 |
| JavaScript | 8개 |
| Shell Script | 3개 |
| TypeScript | 1개 |
| PowerShell | 1개 |

---

## 📋 스크립트 목록 및 분석

### 1. 통계 페이지 검증 (4개)

#### 1.1 `validate-statistics.js` (299줄)
- **용도**: UI 렌더링 L1-L3 검증 (localhost:3000 필요)
- **상태**: ✅ 활성 사용
- **의존성**: fetch, http
- **문제점**: 서버 실행 필요 (자동화 제한)

#### 1.2 `validate-statistics.sh` (180줄)
- **용도**: validate-statistics.js의 bash 버전
- **상태**: ⚠️ 중복 (validate-statistics.js와 동일 기능)
- **권장**: 삭제 또는 아카이브

#### 1.3 `test-statistics-pages.js` (430줄)
- **용도**: TypeScript 타입 검증 + 버그 패턴 감지
- **상태**: ✅ 활성 사용
- **의존성**: 없음 (정적 분석)
- **장점**: 서버 없이 실행 가능

#### 1.4 `analyze-statistics-metadata.sh` (75줄) ⭐ 신규
- **용도**: VariableSelector, Steps, Options 메타데이터 분석
- **상태**: ✅ 금일 생성 (2025-11-05)
- **의존성**: grep, find
- **문제점**: bc 명령어 없어서 퍼센트 계산 실패

---

### 2. 단계 패턴 분석 (1개)

#### 2.1 `analyze-step-patterns.js` (219줄)
- **용도**: 통계 페이지 Step 패턴 추출 및 분류
- **상태**: ✅ Phase 3용 (createStandardSteps 설계)
- **의존성**: fs, path
- **장점**: 정적 분석, 서버 불필요

---

### 3. RAG 시스템 (3개)

#### 3.1 `generate-vector-store-metadata.js` (202줄)
- **용도**: public/rag-data/ 스캔 → vector-stores.json 생성
- **상태**: ✅ 빌드 시 실행 (package.json)
- **의존성**: fs, better-sqlite3
- **권장**: 유지

#### 3.2 `verify-vector-stores.js` (150줄)
- **용도**: Vector Store DB 무결성 검증
- **상태**: ✅ 개발/QA용
- **의존성**: better-sqlite3
- **권장**: 유지

#### 3.3 `copy-rag-db.js` (38줄)
- **용도**: rag-system/data/rag.db → public/rag-data/rag.db 복사
- **상태**: ⚠️ 사용 여부 불명 (package.json에 없음)
- **권장**: package.json 스크립트 추가 또는 삭제

---

### 4. 빌드 유틸리티 (3개)

#### 4.1 `download-sql-wasm.js` (103줄)
- **용도**: sql.js WASM 파일 다운로드 (Node.js)
- **상태**: ✅ 활성 사용
- **의존성**: https, fs
- **권장**: 유지

#### 4.2 `download-sql-wasm.sh` (55줄)
- **용도**: download-sql-wasm.js의 bash 버전
- **상태**: ⚠️ 중복 (Linux/Mac용)
- **권장**: 유지 (크로스플랫폼 호환성)

#### 4.3 `download-sql-wasm.ps1` (PowerShell)
- **용도**: download-sql-wasm.js의 Windows 버전
- **상태**: ⚠️ 중복 (Windows용)
- **권장**: 유지 (크로스플랫폼 호환성)

#### 4.4 `generate-icons.js` (43줄)
- **용도**: SVG → PNG 아이콘 생성 (PWA)
- **상태**: ⚠️ 사용 여부 불명
- **의존성**: sharp (설치 필요?)
- **권장**: 테스트 후 결정

---

### 5. 테스트 헬퍼 (1개)

#### 5.1 `test-helper-refactoring.ts` (110줄)
- **용도**: 테스트 헬퍼 함수 리팩토링 (용도 불명)
- **상태**: ❌ 불명확
- **문제점**: 실행 방법 없음, 주석 부족
- **권장**: 삭제 또는 문서화

---

## 🚨 발견된 문제점

### Critical (즉시 수정 필요)

1. **analyze-statistics-metadata.sh**: bc 명령어 의존성
   - 문제: Git Bash에 bc 없음 → 퍼센트 계산 실패
   - 해결: awk 또는 JavaScript로 대체

2. **중복 스크립트 혼란**
   - validate-statistics.js vs validate-statistics.sh (기능 동일)
   - download-sql-wasm.{js,sh,ps1} (플랫폼별)

### High (개선 권장)

3. **copy-rag-db.js**: package.json에 미등록
   - 문제: 언제 실행해야 하는지 불명확
   - 해결: prebuild 스크립트 추가 또는 삭제

4. **generate-icons.js**: sharp 의존성 미확인
   - 문제: sharp 설치 안 되어 있을 가능성
   - 해결: package.json devDependencies 확인

5. **test-helper-refactoring.ts**: 용도 불명
   - 문제: README 없음, 실행 방법 없음
   - 해결: 삭제 또는 상세 주석 추가

### Medium (선택 사항)

6. **validate-statistics.sh 중복**
   - validate-statistics.js가 더 완성도 높음
   - 권장: 아카이브 또는 삭제

---

## ✅ 권장 조치

### 즉시 (Critical)

1. **analyze-statistics-metadata.sh 수정**
   ```bash
   # bc 대신 awk 사용
   echo "scale=0; $WITH_VAR * 100 / $TOTAL" | bc
   # →
   awk "BEGIN {printf \"%.0f\", $WITH_VAR * 100 / $TOTAL}"
   ```

2. **스크립트 README 작성**
   - scripts/README.md 생성
   - 각 스크립트 용도, 실행 방법 문서화

### 단기 (High)

3. **package.json 정리**
   ```json
   "scripts": {
     "validate:statistics": "node scripts/validate-statistics.js",
     "test:pages": "node scripts/test-statistics-pages.js",
     "analyze:metadata": "bash scripts/analyze-statistics-metadata.sh",
     "prebuild": "node scripts/copy-rag-db.js && node scripts/generate-vector-store-metadata.js"
   }
   ```

4. **미사용 스크립트 정리**
   - test-helper-refactoring.ts → 삭제 또는 문서화
   - validate-statistics.sh → 아카이브

### 장기 (Medium)

5. **스크립트 통합**
   - 통계 검증 스크립트 3개 → 1개로 통합
   - CLI 플래그로 모드 선택 (--ui, --types, --metadata)

---

## 📂 제안: 디렉터리 구조 개선

```
scripts/
├── README.md                         # 신규 - 전체 스크립트 가이드
├── statistics/                       # 신규 - 통계 페이지 관련
│   ├── validate-ui.js               # 기존: validate-statistics.js
│   ├── validate-types.js            # 기존: test-statistics-pages.js
│   ├── analyze-metadata.sh          # 기존: analyze-statistics-metadata.sh
│   └── analyze-step-patterns.js     # 유지
├── rag/                             # 신규 - RAG 시스템 관련
│   ├── generate-metadata.js         # 기존: generate-vector-store-metadata.js
│   ├── verify-stores.js             # 기존: verify-vector-stores.js
│   └── copy-db.js                   # 기존: copy-rag-db.js
├── build/                           # 신규 - 빌드 유틸
│   ├── download-sql-wasm.js         # 유지
│   ├── download-sql-wasm.sh         # 유지
│   ├── download-sql-wasm.ps1        # 유지
│   └── generate-icons.js            # 유지
└── archive/                         # 신규 - 미사용 스크립트
    ├── validate-statistics.sh       # 이동: 중복
    └── test-helper-refactoring.ts   # 이동: 용도 불명
```

---

## 🎯 실행 계획

### Phase 1: 긴급 수정 (30분)
- [ ] analyze-statistics-metadata.sh bc → awk 수정
- [ ] scripts/README.md 작성

### Phase 2: 정리 (1시간)
- [ ] package.json 스크립트 추가
- [ ] 미사용 스크립트 아카이브
- [ ] sharp 의존성 확인

### Phase 3: 구조 개선 (2시간, 선택)
- [ ] 디렉터리 재구성
- [ ] 통계 검증 스크립트 통합
- [ ] 자동화 CI/CD 추가

---

**다음 작업**: Phase 1 실행 (긴급 수정)
