# STRING

**운영**: STRING Consortium  
**용도**: 단백질-단백질 상호작용 네트워크, 파트너 조회  
**BioHub 상태**: 2026-04-10 기준 `/genetics/protein`에서 UniProt 요약 다음 단계로 상호작용 파트너 조회 구현

---

## 1. 핵심 엔드포인트

| 엔드포인트 | 용도 |
|-----------|------|
| `/api/json/get_string_ids` | 입력 identifier를 STRING 내부 ID로 매핑 |
| `/api/json/interaction_partners` | 상호작용 파트너 조회 |
| `/api/tsv/version` | 버전 확인 |

---

## 2. BioHub 구현 범위

현재 구현:

1. UniProt 요약에서 `gene name` 또는 `primary accession` 확보
2. UniProt organism의 `taxonId` 사용
3. STRING `get_string_ids`로 매핑
4. `interaction_partners`로 상위 파트너 조회
5. `/genetics/protein` 화면에서
   - 파트너 테이블
   - combined score
   - 상위 evidence channel
   - 소규모 graph 시각화(ECharts graph)
   를 표시

관련 코드:
- `stats/lib/genetics/string.ts`
- `stats/app/genetics/protein/ProteinContent.tsx`

---

## 3. 호출 예시

```bash
curl "https://string-db.org/api/json/get_string_ids?identifiers=P68871&species=9606&caller_identity=biohub"
curl "https://string-db.org/api/json/interaction_partners?identifiers=9606.ENSP00000494175&species=9606&required_score=700&limit=10&caller_identity=biohub"
curl "https://string-db.org/api/tsv/version"
```

---

## 4. 응답에서 실제로 쓰는 필드

### get_string_ids

- `stringId`
- `preferredName`
- `ncbiTaxonId`
- `annotation`

### interaction_partners

- `stringId_A`
- `stringId_B`
- `preferredName_A`
- `preferredName_B`
- `score`
- `nscore`
- `fscore`
- `pscore`
- `ascore`
- `escore`
- `dscore`
- `tscore`

---

## 5. 점수 해석

- `score`: combined score
- `nscore`: neighborhood
- `fscore`: fusion
- `pscore`: phylogeny
- `ascore`: coexpression
- `escore`: experimental
- `dscore`: database
- `tscore`: text mining

BioHub UI는 현재 가장 큰 evidence channel 하나만 요약해서 표시한다.

---

## 6. CORS / 인증 / 제약

- **CORS**: 브라우저 직접 호출 가능
- **인증**: 불필요
- **프록시**: 불필요
- **주의**: 브라우저에서 과도한 연속 호출은 피하는 것이 좋음
- **오프라인**: 불가

---

## 7. 후속 확장

- enrichment endpoint 추가
- full network viewer를 Cytoscape.js로 분리
- Reactome pathway와 교차 연결
