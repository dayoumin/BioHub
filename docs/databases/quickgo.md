# QuickGO

**운영**: EMBL-EBI GOA  
**용도**: GO term 정의, 동의어, 상위/하위 term, 경로(path) 조회  
**BioHub 상태**: 2026-04-10 기준 `/genetics/protein`에서 UniProt GO term 클릭 시 상세 패널 조회 구현

---

## 1. 핵심 엔드포인트

| 엔드포인트 | 용도 |
|-----------|------|
| `/services/ontology/go/terms/{id}` | GO term 기본 정보 |
| `/services/ontology/go/terms/{id}/ancestors` | 상위 term 목록 |
| `/services/ontology/go/terms/{id}/paths/{root}` | root까지 경로 |

> 참고: `children` 호출은 직계 child term의 이름 목록을 바로 주기보다, 현재 term wrapper 성격이 강해서 BioHub에서는 `term.children[].id`를 읽고 다시 term lookup 하는 방식 사용.

---

## 2. BioHub 구현 범위

현재 구현:

1. UniProt에서 GO ID 추출
2. 사용자가 GO ID 클릭
3. QuickGO에서 term 상세 조회
4. 아래 정보를 요약 표시
   - 정의
   - 동의어
   - 상위 term
   - 직계 하위 term
   - root path

관련 코드:
- `stats/lib/genetics/quickgo.ts`
- `stats/app/genetics/protein/ProteinContent.tsx`

---

## 3. 호출 예시

```bash
curl "https://www.ebi.ac.uk/QuickGO/services/ontology/go/terms/GO:0005344"
curl "https://www.ebi.ac.uk/QuickGO/services/ontology/go/terms/GO:0005344/ancestors"
curl "https://www.ebi.ac.uk/QuickGO/services/ontology/go/terms/GO:0005344/paths/GO:0003674"
```

---

## 4. 응답에서 실제로 쓰는 필드

### term

- `id`
- `name`
- `aspect`
- `definition.text`
- `usage`
- `comment`
- `synonyms[]`
- `children[]`
- `ancestors[]`

### path

- `child`
- `parent`
- `relationship`

---

## 5. CORS / 인증 / 제약

- **CORS**: 브라우저 직접 호출 가능
- **인증**: 불필요
- **프록시**: 불필요
- **오프라인**: 불가

---

## 6. 후속 확장

- GO 검색 자동완성 (`search`)
- GO evidence/annotation 레벨 drill-down
- Reactome와 연결한 pathway 설명 카드
