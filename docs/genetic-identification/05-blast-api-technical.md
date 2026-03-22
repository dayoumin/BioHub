# NCBI BLAST API 기술 참고

> **검증일**: 2026-03-22
> **관련 코드**: `src/worker.ts` (BLAST 프록시), `stats/lib/genetics/decision-engine.ts`

---

## 1. BLAST URL API 형식

### FORMAT_TYPE 옵션

| 값 | 설명 | 비고 |
|----|------|------|
| HTML | 기본값 | 브라우저용 |
| Text | 텍스트 (+ Tabular 가능) | **현재 Worker 사용** |
| XML2 | XML | 비압축 |
| JSON2 | JSON | **항상 ZIP으로 반환** |
| JSON2_S | JSON (단일 쿼리) | ZIP |
| SAM | SAM 형식 | — |

### Tabular 출력

```
FORMAT_TYPE=Text&ALIGNMENT_VIEW=Tabular
```

필드 순서 (탭 구분):
```
query, subject acc.ver, % identity, alignment length, mismatches, gap opens,
q.start, q.end, s.start, s.end, evalue, bit score
```

### FORMAT_TYPE은 Put과 Get 모두 사용 가능

- Put(제출): 결과 준비 형식 지정 (선택)
- Get(조회): 결과 반환 형식 지정 (선택, 기본 HTML)
- Get에서 별도 지정하면 Put의 FORMAT_TYPE은 무의미

공식 문서: https://blast.ncbi.nlm.nih.gov/doc/blast-help/urlapi.html

---

## 2. JSON2 = 항상 ZIP (NCBI 표준)

- JSON2 응답은 **항상** ZIP 파일로 반환됨 (`PK\x03\x04` magic number)
- "때때로" ZIP이 아니라 **표준 동작**
- ZIP 내부: manifest + JSON 파일들
- 처리: `zipfile` 모듈로 추출 → `json.loads()` 파싱
- **ZIP 없는 JSON2는 방법 없음**

Biopython 참고: https://biopython.org/docs/latest/Tutorial/chapter_blast.html

---

## 3. BioHub Worker 구현 결정

### Tabular 선택 이유

```
JSON2 → 항상 ZIP → Cloudflare Workers에 ZIP 파싱 모듈 없음 → 사용 불가
XML2  → 파싱 가능하나 응답 크기 큼 + XML 파싱 비용
Text/Tabular → 경량, 탭 split으로 즉시 파싱 가능 → 채택
```

### Worker 응답 형식

```json
{
  "rid": "XXXXXXXX",
  "hits": [
    {
      "accession": "KF601412.1",
      "identity": 0.9908,
      "alignLength": 654,
      "mismatches": 6,
      "gapOpens": 0,
      "queryStart": 1,
      "queryEnd": 654,
      "subjectStart": 1,
      "subjectEnd": 654,
      "evalue": 0.0,
      "bitScore": 1189
    }
  ]
}
```

### 알려진 한계

| 한계 | 원인 | 해결 계획 |
|------|------|-----------|
| 종명 없음 (`species: accession`) | Tabular 형식에 종명 필드 없음 | E-utilities API로 accession → 종명 변환 (Phase E-1) |
| description 없음 | 동일 | E-utilities 연동 시 title 추출 |

---

## 4. 코드 동기화 이력 (2026-03-22)

### parseBlastHits 불일치 수정

- **문제**: genetics/는 NCBI JSON2 형식 파싱, stats/는 Worker tabular 형식 파싱
- **원인**: Worker가 JSON2 → Tabular로 변경 시 stats/만 업데이트, genetics/ 누락
- **수정**: genetics/를 stats/ 기준(tabular 파서)으로 통일

### analyzeBlastResult ambiguous 조건 통일

- **genetics/**: `bestIdentity >= 0.95 || isAmbiguous` (하한 없음)
- **stats/**: `bestIdentity >= 0.95 || (isAmbiguous && bestIdentity >= 0.90)` (90% 하한)
- **수정**: stats/ 기준 채택. 90% 미만에서 2종 유사는 "동정 실패"가 올바름

### genetics/stats 컴포넌트 중복

- BlastRunner, SequenceInput, ResultView가 양쪽에 거의 동일하게 존재
- `packages/genetics-ui`로 통합 검토 필요 (미착수)
