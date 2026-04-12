# External Dependency Risk Registry

BioHub는 여러 오픈소스 라이브러리와 오픈 API를 통합하는 플랫폼이다.
각 의존성의 정책 변경·서비스 중단 리스크를 추적하고, 방어 전략을 점검한다.

> **점검 주기**: 분기별 1회 (1월·4월·7월·10월) 또는 주요 API 장애 발생 시

---

## 1. 리스크 분류

| 구분 | 설명 | 리스크 수준 |
|------|------|-------------|
| **로컬 라이브러리** | Pyodide로 브라우저 실행 (SciPy, statsmodels 등) | **낮음** — 라이선스만 준수하면 정책 변경 영향 없음 |
| **오픈 API (정부/학술)** | NCBI, PubMed, UniProt 등 | **중간** — 유료화 가능성 낮지만 rate limit·인증 변경 있음 |
| **오픈 API (비영리/커뮤니티)** | OpenAlex, Crossref, Semantic Scholar | **중간~높음** — 정책 변경 이력 있음 |
| **상용 API** | Cloudflare, Vercel 등 인프라 | **중간** — 가격 변경 리스크 |

## 2. 의존성 목록 및 현황

### 2-A. 로컬 라이브러리 (Pyodide)

| 라이브러리 | 용도 | 라이선스 | 대체재 | 비고 |
|-----------|------|---------|--------|------|
| SciPy | 통계 검정 | BSD-3 | — | 핵심, 대체 불가 |
| statsmodels | 회귀/시계열 | BSD-3 | — | 핵심 |
| pingouin | 효과 크기/베이지안 | GPL-3 | 직접 구현 | GPL 주의 |
| NumPy | 수치 계산 | BSD-3 | — | SciPy 의존 |
| pandas | 데이터 조작 | BSD-3 | — | 사실상 필수 |
| scikit-learn | ML/클러스터링 | BSD-3 | — | 일부 분석에 사용 |
| BioPython | 서열 분석 | Biopython License (BSD-like) | — | 유전학 도구 |

**리스크**: 거의 없음. 버전 업그레이드 시 breaking change만 주의.
**점검 항목**: Pyodide 새 버전에서 패키지 호환성 확인.

### 2-B. 오픈 API

| API | 용도 | 리스크 | 정책 변경 이력 | 대체재 | 방어 전략 |
|-----|------|--------|---------------|--------|-----------|
| **NCBI BLAST** | 서열 식별 | 중간 | API key 권장화 추세 | 로컬 BLAST+ (Tauri) | 캐싱 + 로컬 대체 계획 |
| **NCBI E-utilities** | GenBank 조회 | 중간 | API key 필수 (기존) | — | API key 등록 |
| **OpenAlex** | 논문 메타데이터 | **높음** | 2026-02 API key 필수화 | Crossref, S2 | 3중 소스 |
| **Crossref** | 논문 DOI/메타 | **높음** | 2025-12 rate limit 50→3 | OpenAlex, S2 | 3중 소스 |
| **Semantic Scholar** | 논문 검색/인용 | **높음** | 429 에러 빈번 | OpenAlex, Crossref | 3중 소스 |
| **UniProt** | 단백질 DB | 낮음 | 안정적 | — | 캐싱 |
| **GBIF** | 생물 분포 | 낮음 | 안정적 | — | 캐싱 |
| **WoRMS** | 해양 학명 | 낮음 | GBIF Backbone | 이중 소스 |
| **FishBase** | 어류 정보 | 중간 | 간헐적 다운타임 | — | 캐싱 필수 |

### 2-C. 인프라

| 서비스 | 용도 | 리스크 | 대체재 |
|--------|------|--------|--------|
| Cloudflare Pages | 정적 호스팅 | 낮음 | Vercel, Netlify |
| Cloudflare Workers | 서버리스 | 중간 (가격 변경) | AWS Lambda |
| Cloudflare D1 | DB | 중간 (beta) | Turso, PlanetScale |
| Cloudflare R2 | 파일 저장 | 낮음 (egress 무료) | S3 |

## 3. 방어 전략 체크리스트

### 전략 A: 추상화 레이어
- [ ] 논문 검색: 3개 API 통합 인터페이스 (`search-all.py`) — 구현 완료
- [ ] 학명 검증: WoRMS + GBIF 이중 소스 — 구현 예정
- [ ] BLAST: NCBI API + 로컬 BLAST+ 전환 가능 — Tauri 계획

### 전략 B: 캐싱
- [ ] API 응답 로컬 캐싱 (IndexedDB/R2)
- [ ] 자주 쓰는 학명 DB 로컬 사본
- [ ] 논문 메타데이터 캐싱

### 전략 C: 로컬 우선 (Pyodide)
- [x] 43개 통계 분석 — 완전 로컬
- [x] Bio-Tools 16개 — 완전 로컬
- [ ] 서열 분석 기본 기능 — BioPython 로컬

### 전략 D: Graceful Degradation
- [ ] API 실패 시 사용자 안내 메시지
- [ ] 수동 데이터 입력 폴백
- [ ] 오프라인 모드 (Tauri 데스크탑)

## 4. 분기별 점검 절차

```
1. 각 API 엔드포인트 health check (rate limit, 인증 방식 변경 여부)
2. 오픈소스 라이브러리 주요 버전 릴리스 확인
3. Pyodide 호환성 확인 (새 버전 릴리스 시)
4. 이 문서의 "정책 변경 이력" 컬럼 업데이트
5. 대체재 필요 여부 판단 → 필요 시 ROADMAP.md에 등록
```

## 5. 정책 변경 로그

| 날짜 | API | 변경 내용 | 영향 | 대응 |
|------|-----|----------|------|------|
| 2025-12 | Crossref | rate limit 50→3 req/sec | 높음 | 3중 소스 전략 채택 |
| 2026-02 | OpenAlex | API key 필수화 | 낮음 | key 등록 완료 |
| 2026-02 | Semantic Scholar | 429 에러 빈번 | 중간 | 3중 소스로 분산 |

---

> **핵심 원칙**: 계산은 로컬(Pyodide), 데이터는 다중 소스+캐싱, 단일 장애점 제거.
