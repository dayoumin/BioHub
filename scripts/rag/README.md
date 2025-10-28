# RAG 문서 수집 시스템

통계 분석 및 실험설계 관련 신뢰성 있는 문서를 자동으로 수집하는 시스템입니다.

## 🎯 목적

- **권위 있는 문서**: SciPy, statsmodels, pingouin, R 등 신뢰성 있는 소스에서 문서 수집
- **자동화**: crawl4ai 기반 자동 수집 및 메타데이터 관리
- **품질 관리**: 체크섬 검증 및 수집 상태 추적
- **RAG 준비**: Vector DB 인덱싱을 위한 구조화된 문서

## 📁 디렉토리 구조

```
docs/rag-sources/
├── registry/
│   └── document-registry.json      # 문서 소스 메타데이터 (8개 소스)
├── raw/                           # 원본 파일 (HTML/PDF)
│   ├── scipy-stats_*.html
│   ├── statsmodels-docs_*.html
│   └── ... (6개 더)
├── processed/                     # Docling 파싱 결과 (Markdown)
│   ├── scipy-stats_*.md
│   └── ... (7개 더)
├── indexed/                       # Vector DB용 청크 (향후)
│   └── embeddings.json
└── reports/
    └── collection-report_*.json   # 수집 결과 보고서

scripts/rag/
├── initialize-registry.py         # 레지스트리 초기화
├── collect-statistical-docs.py    # 문서 수집 (crawl4ai)
└── README.md                      # 이 파일
```

## 📚 레지스트리 구조

`document-registry.json`은 다음 정보를 포함합니다:

### 소스 메타데이터 예시
```json
{
  "id": "scipy-stats",
  "name": "SciPy Statistics Documentation",
  "url": "https://docs.scipy.org/doc/scipy/reference/stats.html",
  "authority_level": "primary",
  "category": "core_statistics",
  "priority": 1,
  "status": "pending",
  "checksum": null,
  "last_collected": null,
  "collection_attempts": 0
}
```

### 필드 설명

| 필드 | 설명 | 가능한 값 |
|------|------|----------|
| `id` | 소스 고유 ID | "scipy-stats", "statsmodels-docs", ... |
| `name` | 소스 이름 | 문자열 |
| `url` | 수집 대상 URL | URL |
| `authority_level` | 권위도 | "primary" (권위 있음), "secondary" (교육용) |
| `category` | 분류 | "core_statistics", "regression_advanced", ... |
| `priority` | 수집 우선순위 | 1-8 (낮을수록 높음) |
| `status` | 수집 상태 | "pending", "collecting", "collected", "failed" |
| `checksum` | SHA-256 체크섬 | 16진수 문자열 또는 null |
| `last_collected` | 마지막 수집 시간 | ISO 8601 형식 또는 null |
| `collection_attempts` | 수집 시도 횟수 | 정수 |

## 🚀 실행 방법

### 1단계: 레지스트리 초기화

```bash
cd /path/to/project
python scripts/rag/initialize-registry.py
```

**출력 예시:**
```
🚀 RAG 문서 레지스트리 초기화 시작

[1] 레지스트리 로드...
✓ 레지스트리 로드 성공

[2] 레지스트리 검증...
✓ 레지스트리 구조 검증 성공

[3] 디렉토리 생성...
✓ 디렉토리 생성/확인: docs/rag-sources/raw
✓ 디렉토리 생성/확인: docs/rag-sources/processed
...

======================================
📊 RAG 문서 레지스트리 초기화 완료
======================================
총 소스 수: 8
  - Primary (권위 있는): 5
  - Secondary (교육용): 2

카테고리 수: 6
  - 핵심 통계: 2개
  - 회귀분석 및 고급 분석: 1개
  - ...

우선순위별 수집 순서:
  1. SciPy Statistics Documentation
  2. Statsmodels Documentation
  3. Pingouin Documentation

저장 위치:
  - raw: docs/rag-sources/raw
  - processed: docs/rag-sources/processed
  - indexed: docs/rag-sources/indexed
  - reports: docs/rag-sources/reports

다음 단계:
  1. python scripts/rag/collect-statistical-docs.py
  2. 문서 수집 및 처리 (Docling 파싱)
  3. Vector DB에 인덱싱
======================================
```

### 2단계: 문서 수집

```bash
python scripts/rag/collect-statistical-docs.py
```

**출력 예시:**
```
🚀 통계 문서 수집 시작

🔄 8개 문서 수집 시작

✓ SciPy Statistics Documentation (scipy-stats)
  └─ 경로: docs/rag-sources/raw/scipy-stats_20251028_143022.html
  └─ 체크섬: a1b2c3d4e5f6g7h8...

✓ Statsmodels Documentation (statsmodels-docs)
  ...

✓ 레지스트리 업데이트 완료

✓ 수집 보고서 생성: docs/rag-sources/reports/collection-report_20251028_143122.json

============================================================
📋 수집 결과 요약
============================================================
총 소스: 8
성공: 8 (100.0%)
실패: 0
총 크기: 45823 bytes
총 시간: 3.24초
평균 시간: 0.405초/소스

카테고리별 수집:
  - core_statistics: 2
  - regression_advanced: 1
  - statistical_functions: 1
  - experimental_design: 1
  - educational: 1
  - data_processing: 2

권위도별 수집:
  - primary: 5
  - secondary: 2
============================================================

✓ 문서 수집 완료
```

### 3단계: 수집 보고서 확인

```bash
cat docs/rag-sources/reports/collection-report_*.json
```

**보고서 구조:**
```json
{
  "metadata": {
    "report_date": "2025-10-28T14:31:22.123456",
    "report_type": "collection_summary"
  },
  "summary": {
    "total_sources": 8,
    "successful": 8,
    "failed": 0,
    "success_rate": "100.0%",
    "total_size_bytes": 45823,
    "total_collection_time_seconds": 3.24,
    "average_time_per_source": 0.405
  },
  "by_category": {
    "core_statistics": 2,
    "regression_advanced": 1,
    ...
  },
  "by_authority_level": {
    "primary": 5,
    "secondary": 2
  },
  "results": [
    {
      "source_id": "scipy-stats",
      "source_name": "SciPy Statistics Documentation",
      "url": "https://docs.scipy.org/doc/scipy/reference/stats.html",
      "success": true,
      "file_path": "docs/rag-sources/raw/scipy-stats_20251028_143022.html",
      "checksum": "a1b2c3d4e5f6g7h8...",
      "file_size": 5234,
      "collected_at": "2025-10-28T14:31:20.123456",
      "collection_time_seconds": 0.234
    },
    ...
  ]
}
```

## 🔄 워크플로우 상세 설명

### Phase 1: 레지스트리 초기화

1. **검증**: JSON 구조 및 필드 확인
2. **디렉토리 생성**: 저장소 폴더 자동 생성
3. **상태 초기화**: 모든 소스를 "pending"으로 설정

### Phase 2: 문서 수집 (crawl4ai)

현재 상태: **프로토타입** (메타데이터만)
실제 구현 시:

```python
from crawl4ai import AsyncWebCrawler

async with AsyncWebCrawler() as crawler:
    result = await crawler.arun(
        url="https://docs.scipy.org/doc/scipy/reference/stats.html",
        timeout=30
    )
    content = result.html  # 또는 result.markdown
```

**수집 특징:**
- **비동기 처리**: 최대 3개 동시 수집
- **재시도**: 최대 3회 재시도 (실패 시)
- **체크섬**: SHA-256으로 무결성 검증
- **메타데이터**: 수집 시간, 파일 크기 등 자동 기록

### Phase 3: 문서 처리 (향후)

```bash
# Docling으로 HTML → Markdown 변환 (향후 스크립트)
python scripts/rag/process-documents.py

# 결과: docs/rag-sources/processed/*.md
```

### Phase 4: Vector DB 인덱싱 (향후)

```bash
# 청크 분할 및 임베딩 (향후 스크립트)
python scripts/rag/create-vector-db.py

# 결과: docs/rag-sources/indexed/
```

## 📊 수집 소스 분석

### 8개 신뢰성 있는 소스

| # | 소스 | 권위도 | 카테고리 | 우선순위 |
|---|------|--------|----------|----------|
| 1 | **SciPy** | Primary | 핵심 통계 | 1 |
| 2 | **Statsmodels** | Primary | 회귀분석 | 2 |
| 3 | **Pingouin** | Primary | 통계 함수 | 3 |
| 4 | **R Base Stats** | Primary | 핵심 통계 | 4 |
| 5 | **OpenIntro Stats** | Secondary | 교육용 | 5 |
| 6 | **FAO Guide** | Secondary | 실험설계 | 6 |
| 7 | **NumPy** | Primary | 데이터 처리 | 7 |
| 8 | **Pandas** | Primary | 데이터 처리 | 8 |

### 카테고리 분류

**핵심 통계 (2개)**
- SciPy: 기본 통계 함수, 배포, 가설검정
- R: 비교 기준, 비모수 검정

**고급 분석 (1개)**
- Statsmodels: 회귀분석, GLM, 시계열

**통계 함수 (1개)**
- Pingouin: 효과 크기, 사후검정

**실험설계 (1개)**
- FAO: 농업 실험설계 (수산학 유사)

**교육용 (1개)**
- OpenIntro: 통계학 기초

**데이터 처리 (2개)**
- NumPy: 행렬 연산
- Pandas: 데이터 정제

## ⚙️ 기술 스택

### 필수 의존성

```bash
pip install aiohttp         # 비동기 HTTP 요청
pip install docling         # HTML/PDF 파싱 → Markdown
pip install pydantic        # 데이터 검증
```

### 향후 의존성

```bash
pip install crawl4ai        # 고급 웹 크롤링
pip install langchain       # Vector DB 통합
pip install chromadb        # Vector DB
```

## 📋 체크리스트

### 현재 완료

- [x] 레지스트리 JSON 구조 설계 (8개 소스)
- [x] 초기화 스크립트 구현
- [x] 수집 스크립트 프로토타입
- [x] 보고서 생성 시스템

### 다음 단계

- [ ] crawl4ai 통합 (프로토타입 → 실제 수집)
- [ ] Docling HTML → Markdown 변환
- [ ] 청크 분할 및 메타데이터 추출
- [ ] Vector DB 인덱싱 (ChromaDB/Weaviate)
- [ ] RAG 쿼리 시스템 연결
- [ ] 문서 업데이트 감지 및 자동 재수집

## 🔍 문제 해결

### 레지스트리 검증 오류

```
✗ 레지스트리 검증 실패:
  - 소스 0 (scipy-stats)에 name 필드 누락
```

**해결**: `document-registry.json`에서 누락된 필드 추가

### 디렉토리 생성 실패

```
✗ 디렉토리 생성 오류: Permission denied
```

**해결**: `docs/rag-sources/` 폴더에 쓰기 권한 확인

```bash
chmod 755 docs/rag-sources/
```

### 수집 타임아웃

```
✗ Statsmodels Documentation (statsmodels-docs): Timeout
```

**해결**: 타임아웃 값 증가 (`initialize-registry.py`의 `timeout_seconds` 수정)

## 📖 참고 자료

- [crawl4ai Documentation](https://github.com/unclecode/crawl4ai)
- [Docling Documentation](https://ds4sd.github.io/docling/)
- [ChromaDB Documentation](https://docs.trychroma.com/)

## 📝 라이선스

이 스크립트는 MIT 라이선스를 따릅니다.

---

**최종 업데이트**: 2025-10-28
**버전**: 1.0 (프로토타입)
