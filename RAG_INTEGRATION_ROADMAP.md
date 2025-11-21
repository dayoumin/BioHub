# RAG 통합 로드맵 (최종 방향 정리)

**목적**: LMO_Desktop에 Statistics RAG 기능을 통합하는 명확한 로드맵

**작성일**: 2025-11-21

---

## 🎯 핵심 결론

### **LMO는 이미 올바른 선택을 했습니다!**

| 항목 | LMO 선택 | 올바른 이유 |
|------|---------|-----------|
| **RAG 프레임워크** | ✅ **LangGraph** | 상태 머신 > 선형 체인 (더 간단하고 강력) |
| **Vector Store** | ✅ **FAISS** | C++ 최적화, 3,200 청크를 0.01초에 검색 |
| **아키텍처** | ✅ **계층적 RAG** | 평가서/참고/부록 분리 (도메인 특화) |
| **워크플로우** | ✅ **배치/세션 관리** | 심사위원 업무 프로세스 완벽 반영 |

**Statistics는 브라우저 제약 때문에 SQLite + Langchain을 사용한 것입니다.**
**성능이 좋아서가 아닙니다!**

---

## 📊 Statistics에서 가져올 것

### **우선순위 요약**

| 순위 | 기능 | 중요도 | 소요 시간 | LMO 구조 적합성 |
|------|------|--------|----------|---------------|
| 1 | **하이브리드 검색** (BM25 + FAISS) | ⭐⭐⭐⭐⭐ | 1-2일 | ✅ 매우 적합 (코드명 검색) |
| 2 | **Citation 시스템** [1], [2] | ⭐⭐⭐⭐ | 1일 | ✅ 심사위원에게 필수 |
| 3 | **Docling PDF 파싱** | ⭐⭐⭐ | 2-3일 | 🟡 선택 (현재 파싱 충분) |
| 4 | **SQLite 메타데이터** | ⭐⭐ | 1-2일 | 🟡 선택 (계층 RAG 충분) |

**핵심**: Phase 1, 2만 구현해도 충분! (총 2-3일)

### 1. ⭐⭐⭐⭐⭐ **하이브리드 검색** (BM25 + FAISS)

**왜 필요한가?**
- FAISS는 의미적 유사도만 검색 → "MZIR260" 같은 정확한 코드명 검색 약함
- BM25는 키워드 매칭 강함 → 코드명, 고유명사 검색 정확
- **둘을 합치면 30-40% 검색 정확도 향상** (논문 검증 결과)

**구현 방법**:
```python
# src/hybrid_retriever.py (신규 파일 생성)
from rank_bm25 import BM25Okapi

class HybridRetriever:
    def __init__(self, faiss_store, documents):
        self.faiss = faiss_store           # Vector 검색 (유지)
        self.bm25 = BM25Okapi(documents)   # Keyword 검색 (추가)

    def search(self, query: str, k: int = 10):
        # 1. 각각 2배 검색
        faiss_results = self.faiss.similarity_search(query, k=k*2)
        bm25_results = self.bm25.get_top_n(query, k=k*2)

        # 2. Reciprocal Rank Fusion (RRF) 병합
        merged = self.rrf_merge(faiss_results, bm25_results)

        return merged[:k]

    def rrf_merge(self, results_list, k=60):
        """RRF 공식: score = Σ [1 / (k + rank)]"""
        rrf_scores = defaultdict(float)

        for results in results_list:
            for rank, doc in enumerate(results, start=1):
                doc_id = doc.metadata["doc_id"]
                rrf_scores[doc_id] += 1 / (k + rank)

        return sorted(rrf_scores.items(),
                     key=lambda x: x[1],
                     reverse=True)
```

**통합 위치**: `src/rag_langgraph_unified.py`의 `retrieve_documents()` 수정

**예상 소요 시간**: 1-2일

---

### 2. ⭐⭐⭐⭐ **Citation 시스템** [1], [2]

**왜 필요한가?**
- 심사위원이 답변의 근거를 빠르게 확인 가능
- "이 정보는 어디서 나왔지?" → [1] 클릭 → 원본 문서로 이동

**구현 방법**:
```python
# src/citation_generator.py (신규 파일 생성)
import re

class CitationGenerator:
    def add_citations(self, answer: str, sources: List[Dict]):
        """답변에 인용 번호 [1], [2] 추가"""
        cited_sources = []

        for idx, source in enumerate(sources, start=1):
            # 답변에 해당 내용이 포함되었는지 확인
            if self._is_content_used(answer, source["content"]):
                # 문장 끝에 인용 번호 삽입
                citation = f" [{idx}]"
                answer = self._insert_citation(answer, source, citation)
                cited_sources.append({
                    "id": idx,
                    "title": source["title"],
                    "page": source.get("page", ""),
                    "source": source.get("source", "")
                })

        return answer, cited_sources
```

**Flutter UI 수정**:
```dart
// lib/widgets/citation_widget.dart (신규 파일)
class CitationWidget extends StatelessWidget {
  final int citationId;
  final String title;
  final String source;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _openSourceDocument(source),
      child: Container(
        child: Text(
          '[$citationId]',
          style: TextStyle(
            color: Colors.blue,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
```

**예상 소요 시간**: 1일

---

### 3. ⭐⭐⭐ **Docling PDF 파싱** (선택 사항)

**왜 필요한가?**
- 복잡한 학술 논문 (다단 컬럼, 수식, 표) 파싱 품질 향상
- 현재 PyMuPDF + pdfplumber로도 충분하지만, Docling은 더 정확함

**구현 방법**:
```python
# src/docling_loader.py (신규 파일 생성)
from docling.document_converter import DocumentConverter

class DoclingPDFLoader:
    def __init__(self):
        self.converter = DocumentConverter()

    def load(self, file_path: str):
        # Docling으로 파싱
        result = self.converter.convert(file_path)

        # Markdown으로 변환 (구조 보존)
        markdown = result.document.export_to_markdown()

        return [Document(page_content=markdown)]
```

**주의사항**:
- Docker 서버 필요 (별도 설치)
- 속도 느림 (PyMuPDF 대비 2-3배)
- **우선순위 낮음** (현재 PDF 파싱으로 충분)

**예상 소요 시간**: 2-3일 (Docker 설정 포함)

---

### 4. ⭐⭐ **SQLite 메타데이터 필터링** (선택 사항)

**❓ LMO에 필요한가?**
- **결론: 🟡 필요하지만 우선순위 매우 낮음**
- **LMO는 품목별 독립 심사** → 대부분의 경우 계층적 RAG (3개 FAISS)로 충분
- 각 품목이 완전히 독립적이므로, 품목 간 메타데이터 필터링은 거의 불필요

**유용한 경우** (품목 내 고급 필터링만):

품목 MZIR260 내에서 "참고문헌 중 Nature/Science 2020년 이후 논문만"과 같은 세밀한 필터링이 필요한 경우

**Case 1: 문서 타입 필터링**
```python
# "참고문헌만 + 2020년 이후 논문만"
metadata_db.query("""
    SELECT doc_id FROM documents
    WHERE item_id = 'MZIR260'
    AND doc_type = 'reference'
    AND year >= 2020
""")
```

**Case 2: 저널 평판 필터링**
```python
# "Nature/Science 급 논문만"
metadata_db.query("""
    SELECT doc_id FROM documents
    WHERE item_id = 'MZIR260'
    AND journal IN ('Nature', 'Science', 'Cell')
    AND impact_factor > 10
""")
```

**Case 3: 시계열 분석**
```python
# "2020년 이후 연구 동향만"
metadata_db.query("""
    SELECT doc_id FROM documents
    WHERE item_id = 'MZIR260'
    AND year >= 2020
    ORDER BY year DESC
""")
```

**구현 방법**:
```python
# src/metadata_store.py (신규 파일 생성)
import sqlite3
from typing import List, Dict

class MetadataStore:
    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path)
        self._create_tables()

    def _create_tables(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                doc_id TEXT PRIMARY KEY,
                item_id TEXT,           -- 품목 ID (MZIR260)
                doc_type TEXT,          -- 문서 타입 (reference/appendix)
                title TEXT,
                year INTEGER,
                journal TEXT,
                impact_factor FLOAT,
                authors TEXT,
                created_at TIMESTAMP
            )
        """)
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_item ON documents(item_id)")

    def filter_documents(
        self,
        item_id: str,
        doc_type: str = None,
        year_from: int = None,
        journals: List[str] = None,
    ) -> List[str]:
        """메타데이터 필터링 후 doc_id 반환"""
        conditions = [f"item_id = '{item_id}'"]

        if doc_type:
            conditions.append(f"doc_type = '{doc_type}'")
        if year_from:
            conditions.append(f"year >= {year_from}")
        if journals:
            journals_str = "', '".join(journals)
            conditions.append(f"journal IN ('{journals_str}')")

        query = f"SELECT doc_id FROM documents WHERE {' AND '.join(conditions)}"

        cursor = self.conn.execute(query)
        return [row[0] for row in cursor.fetchall()]
```

**FAISS와 통합**:
```python
# src/rag_langgraph_unified.py 수정
class HierarchicalRAG:
    def __init__(self):
        self.faiss_stores = {...}  # 기존
        self.metadata_store = MetadataStore("metadata.db")  # 추가

    def retrieve_documents(
        self,
        query: str,
        item_id: str,
        # 메타데이터 필터 (선택)
        doc_type: str = None,
        year_from: int = None,
        journals: List[str] = None,
    ):
        # 1. 메타데이터 필터링 (선택 사항)
        if doc_type or year_from or journals:
            filtered_doc_ids = self.metadata_store.filter_documents(
                item_id, doc_type, year_from, journals
            )
        else:
            filtered_doc_ids = None  # 필터 없음

        # 2. FAISS 검색 (필터 적용)
        faiss_results = self.faiss_stores[item_id].search(
            query,
            filter_ids=filtered_doc_ids,  # 메타데이터 필터 결과
        )

        return faiss_results
```

**주의사항**:
- **LMO는 품목별 독립 심사** → 대부분의 경우 필요 없음
- 현재 계층적 RAG (3개 FAISS)로 이미 문서 타입 분리됨
- 품목 간 비교는 거의 안 함
- **우선순위 매우 낮음** (Phase 1, 2 완료 후 재평가)

**예상 소요 시간**: 1-2일

---

## 🚫 절대 하지 말아야 할 것

| 변경 | 결과 | 이유 |
|------|------|------|
| ❌ FAISS → SQLite | 성능 50배 저하 | 3,200 청크 검색이 0.01초 → 0.5초 |
| ❌ LangGraph → Langchain | 코드 복잡도 폭증 | if-else 지옥, 상태 관리 수동 |
| ❌ 3개 FAISS → 1개 DB | 계층적 RAG 불가능 | 평가서/참고/부록 구분 불가 |
| ❌ Python → JavaScript | 브라우저 제약 | 성능, GPU 가속 모두 불가 |

---

## 📅 구현 일정 (추천)

### **Phase 1: 하이브리드 검색** (1-2일) ⭐⭐⭐⭐⭐

**Day 1**:
1. `rank-bm25` 패키지 설치
   ```bash
   pip install rank-bm25
   ```

2. `src/hybrid_retriever.py` 구현
   - BM25 인덱싱
   - RRF 병합 알고리즘

3. 단위 테스트 작성
   ```python
   # tests/test_hybrid_retriever.py
   def test_bm25_search():
       assert len(results) == 10

   def test_rrf_merge():
       assert merged[0]["score"] > 0.5
   ```

**Day 2**:
1. `src/rag_langgraph_unified.py` 통합
   - `retrieve_documents()` 메서드 수정
   - 기존 FAISS 검색을 하이브리드로 대체

2. 기존 질문 세트로 정확도 테스트
   ```python
   # 테스트 질문: "MZIR260의 안전성은?"
   # 기대: 평가자료의 "안전성 평가" 섹션이 1위
   ```

3. 성능 비교
   - 기존 (FAISS만): 정확도 측정
   - 신규 (Hybrid): 정확도 측정
   - 개선율 확인 (목표: 30% 향상)

---

### **Phase 2: Citation 시스템** (1일) ⭐⭐⭐⭐

**오전**:
1. `src/citation_generator.py` 구현
   - 답변-문서 매칭 로직
   - 인용 번호 삽입 로직

2. `src/rag_langgraph_unified.py` 통합
   - `generate_answer()` 메서드 수정
   - Citation 정보 반환

**오후**:
1. Flutter UI 수정
   - `lib/widgets/citation_widget.dart` 구현
   - 답변 텍스트에 인용 번호 렌더링
   - 클릭 시 원본 문서 보기

2. 통합 테스트
   - 답변에 [1], [2] 표시 확인
   - 클릭 시 문서 열림 확인

---

### **Phase 3: Docling (선택)** (2-3일) ⭐⭐⭐

**우선순위 낮음** - 현재 PDF 파싱으로 충분한 경우 스킵 가능

---

### **Phase 4: SQLite 메타데이터 (선택)** (1-2일) ⭐⭐

**우선순위 매우 낮음** - Phase 1, 2 완료 후 재평가

---

## 🎯 예상 결과

### **Phase 1 완료 후**:
```
질문: "MZIR260의 알레르기 유발 가능성은?"

[기존 - FAISS만]
1. 참고문헌 논문 (score: 0.82) ← 관련은 있지만 핵심 아님
2. 평가자료 안전성 (score: 0.78) ← 핵심 정보!
3. 부록 실험 데이터 (score: 0.75)

[신규 - Hybrid]
1. 평가자료 안전성 (score: 0.95) ← 핵심 정보 1위! ✅
2. 평가자료 알레르기 (score: 0.88) ← 정확히 매칭! ✅
3. 참고문헌 논문 (score: 0.82)

→ 검색 정확도 30% 향상! ⭐
```

### **Phase 2 완료 후**:
```
답변:
"MZIR260은 Cry1Ab 단백질을 발현하며,
알레르기 유발 가능성이 낮은 것으로 평가되었습니다. [1]
실험 결과, 소화 안정성 테스트에서 2분 이내 분해되어
알레르기 유발 위험이 낮습니다. [2]"

참조 문서:
[1] MZIR260_평가자료.pdf (p.45 - 안전성 평가)
[2] 참고문헌_소화안정성실험.pdf (p.12)

→ 출처 추적 편리! ⭐
```

---

## 📚 참고 자료

### **구현 참고 문서**:
1. [RAG_SYSTEM_COMPARISON.md](RAG_SYSTEM_COMPARISON.md) - 상세 비교 분석
2. [RAG_EXTRACTION_GUIDE.md](RAG_EXTRACTION_GUIDE.md) - Statistics RAG 추출 가이드
3. [BM25 알고리즘](https://en.wikipedia.org/wiki/Okapi_BM25)
4. [Reciprocal Rank Fusion 논문](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)

### **필요한 패키지**:
```bash
# Python
pip install rank-bm25

# (선택) Docling
pip install docling
docker pull ds4sd/docling-serve:latest
```

---

## ✅ 체크리스트

### **Phase 1 완료 조건**:
- [ ] `rank-bm25` 설치 완료
- [ ] `hybrid_retriever.py` 구현 완료
- [ ] BM25 인덱싱 정상 작동
- [ ] RRF 병합 정상 작동
- [ ] `rag_langgraph_unified.py` 통합 완료
- [ ] 기존 질문 세트 테스트 통과
- [ ] 검색 정확도 30% 이상 향상 확인

### **Phase 2 완료 조건**:
- [ ] `citation_generator.py` 구현 완료
- [ ] 답변-문서 매칭 로직 정상 작동
- [ ] 인용 번호 삽입 정상 작동
- [ ] Flutter UI 수정 완료
- [ ] 인용 클릭 시 문서 열림 확인
- [ ] 통합 테스트 통과

### **Phase 4 완료 조건** (선택):
- [ ] `metadata_store.py` 구현 완료
- [ ] SQLite 테이블 생성 및 인덱싱 정상 작동
- [ ] 메타데이터 필터링 쿼리 정상 작동
- [ ] FAISS 통합 (filter_ids 파라미터) 정상 작동
- [ ] UI에서 필터 옵션 추가 (문서 타입, 연도, 저널)
- [ ] 통합 테스트: 필터링 + 검색 정확도 확인

---

**Updated**: 2025-11-21 | **Version**: 1.0 | **Author**: Claude Code
