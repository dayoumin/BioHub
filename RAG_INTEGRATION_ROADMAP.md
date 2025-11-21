# RAG 통합 로드맵 (LMO 버전)

**작성일**: 2025-11-21  
**목적**: Statistics RAG 모듈에서 검증된 개선점을 LMO_Desktop에 흡수하되, 기존 강점을 절대 훼손하지 않는 통합 경로 제시

---

## 핵심 결론
- **LMO는 이미 LangGraph + FAISS라는 정답을 선택했다.** 상태 머신 기반 LangGraph와 C++ FAISS 인덱스는 심사 업무의 복잡한 분기와 대규모 벡터 처리를 동시에 만족한다.
- Statistics에서 가져올 것은 **검색·출처 보강(하이브리드, Citation, Docling)**뿐이며, 핵심 아키텍처를 바꿀 이유는 없다.
- 규제 대응 속도와 정확도를 동시에 높이기 위해 아래 3단계 로드맵을 따른다.

### 승부표 (필수 비교)

| 항목 | LMO 선택 | 승자 | 이유 |
|------|----------|------|------|
| RAG 프레임워크 | LangGraph ⭐⭐⭐ | LMO | 상태 머신 > 선형 체인, 조건 분기/세션 관리 단순 |
| Vector Store | FAISS ⭐⭐⭐ | LMO | C++ 최적화, 3,200 청크를 0.01초에 검색 (GPU, IVF, PQ) |
| 검색 방식 | Vector Only | Statistics | 하이브리드(BM25 + Vector)가 30~40% 정확도 ↑ |

---

## LMO에 추가할 3가지 기능 (우선순위순)
1. **⭐⭐⭐⭐⭐ 하이브리드 검색 (BM25 + FAISS)**  
   - 효과: 정확도 30~40% 상승, 코드/용어 질문 누락 제거  
   - 구현: `HybridRetriever` 추가 → LangGraph `retrieve_documents` 교체, Reciprocal Rank Fusion 도입  
   - 의존성: 기존 문서 메타데이터 로드, `rank_bm25` 또는 자체 BM25 구현
2. **⭐⭐⭐⭐ Citation 시스템 [1], [2]**  
   - 효과: 심사위원이 출처를 즉시 검증, 답변 신뢰도 비약적 개선  
   - 구현: `CitationGenerator` 추가 → LangGraph `generate_answer` 단계에서 [n] 삽입, Flutter UI에 인용 클릭 이벤트 연결  
   - 의존성: 문서 스니펫/페이지 ID 유지
3. **⭐⭐⭐ Docling (선택)**  
   - 효과: 다단 컬럼, 수식, 표가 많은 학술 논문 파싱 품질 향상  
   - 구현: Docling Docker 서비스 배포 → `hybrid_pdf_loader.py`에 옵션 추가 → 대용량 PDF 파이프라인 벤치마크  
   - 트레이드오프: 속도 2~3배 느려짐, GPU 없는 환경에서는 Batch 처리 필요

---

## 절대 바꾸면 안 되는 것

| 변경 | 결과 |
|------|------|
| ❌ FAISS → SQLite | 검색 속도 50배 저하, 10개 품목 확장 불가 |
| ❌ LangGraph → LangChain | if-else 지옥, 세션·배치 조건 분기 소스 폭증 |
| ❌ 3개 FAISS → 1개 DB | 계층형 RAG 붕괴, 문헌/참고/가이드 가중치 적용 불가 |
| ❌ 품목별 분리 해제 | 심사 기록 혼선, 메타데이터 필터로도 대체 불가 |

---

## 단계별 구현 일정 (Phase 1-3)

### Phase 1: 하이브리드 검색 (1~2일, 최우선)
- 목표: BM25 + FAISS 하이브리드 검색을 LangGraph에 기본 Retriever로 통합
- 산출물  
  - `hybrid_retriever.py` + 테스트  
  - LangGraph 상태 그래프에 `hybrid_search` 노드 추가  
  - 리그레션: 기존 질문 세트(규제용 20문항)로 정확도/속도 비교표
- 체크리스트  
  - [ ] BM25 토크나이저/IDF 계산 완료  
  - [ ] Reciprocal Rank Fusion 스코어 검증  
  - [ ] 벡터 재생성 없이 기존 FAISS 인덱스 재사용 확인  
  - [ ] 성능 로그(Top-K, 지연, 정확도) 기록

### Phase 2: Citation 시스템 (1일)
- 목표: 답변 본문에 [n] 표기 + 클릭 시 해당 문서 스니펫 오픈
- 산출물  
  - `citation_generator.py` + 단위 테스트  
  - Flutter 위젯(모바일·데스크톱 공용)  
  - 심사위원 피드백 양식
- 체크리스트  
  - [ ] 문장 단위 인용 삽입 규칙 정의  
  - [ ] 중복 인용 번호 제거  
  - [ ] UI에서 [n] 클릭 → 문서 미리보기 연결  
  - [ ] 로그에 인용된 문서 ID 저장

### Phase 3: Docling + PDF 파이프라인 (2~3일, 선택)
- 목표: 고품질 PDF 파싱 파이프라인을 옵션으로 제공
- 산출물  
  - Docling Docker Compose + 헬스체크  
  - `hybrid_pdf_loader.py` 옵션 (`method = pymupdf | docling`)  
  - 품목별 대용량 PDF 벤치마크 리포트
- 체크리스트  
  - [ ] Docling 서버 리소스(메모리/CPU) 모니터링  
  - [ ] 새 Chunk 길이/오버랩 파라미터 조정  
  - [ ] 속도 대비 품질 비교표 공유  
  - [ ] 최종 의사결정(항상 On / 필요 시 On)

---

## 🎯 최종 방향 정리
- **LMO는 이미 올바른 선택을 했다.** LangGraph + FAISS + 계층형 인덱스는 유지가 핵심이다.
- **단기간 목표**는 검색 정확도와 근거 제시력 강화이며, 이는 하이브리드 검색과 Citation으로 완성된다.
- **중장기 선택지**는 Docling·SQLite 메타데이터로 메타 필터링을 도입하되, 현행 구조를 침범하지 않는 독립 모듈로 유지한다.

---

## 📚 참고 문서
- `RAG_SYSTEM_COMPARISON.md` – LMO vs Statistics 시스템 비교 분석
- `RAG_EXTRACTION_GUIDE.md` – Statistics RAG 모듈 이식 가이드
- `RAG_CURRENT_STATE_AND_IMPROVEMENTS.md` – LMO 현행 RAG 상태 진단
- `RAG_IMPROVEMENT_PLAN_2025.md` – 장기 확장 계획
