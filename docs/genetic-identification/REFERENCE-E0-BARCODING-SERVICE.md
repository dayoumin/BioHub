# E-0 DNA 바코딩 종 동정 — 외부 리서치 참고 자료

> **상위 문서**: [PLAN-MODULE-E-NCBI-GENETICS.md](../PLAN-MODULE-E-NCBI-GENETICS.md) → E-0 섹션
> **출처**: 외부 AI 리서치 (2026-03-21) — 검증 필요 항목 포함
> **용도**: E-0 구현 시 참고할 시장 분석, 기술 옵션, 아키텍처 아이디어
>
> **관련 레퍼런스**:
> - [01-markers.md](01-markers.md) — DNA 바코딩 마커 총정리
> - [02-taxa-guide.md](02-taxa-guide.md) — 분류군별 마커 선택 가이드
> - [03-databases.md](03-databases.md) — 종 판별 DB & API 기술 가이드

## 서비스 비전 & 시장 포지셔닝

### 핵심 방향

기존 서비스: **"이게 결과입니다"** (검색 도구)
우리 서비스: **"이 결과는 왜 이렇고, 다음에 뭘 해야 합니다"** (AI 기반 의사결정 보조)

### 기존 서비스 분석

| 서비스 | 강점 | 한계 |
|--------|------|------|
| **BOLD Systems** | COI 기반 species match, 유사도 결과 | No match = 끝. 왜 안 되는지 설명 없음, 다음 마커 추천 없음 |
| **NCBI BLAST** | 다양한 DB, 유사 서열 검색 | 완전 raw 결과, 해석은 사용자 몫, 초보자 불친절 |
| **GenBank** | 방대한 서열 DB | 분석/추천 기능 거의 없음 |
| **MEGA** | 계통 분석 | 완전 수동, 전문가용 |
| **QIIME/OBITools** | Metabarcoding 분석 | 전문가용, UX 없음, 실패 설명 없음 |
| **Elicit/Connected Papers** | 논문 기반 인사이트 | 서열 입력 → 마커 추천 없음 |

### 시장 빈틈

| 영역 | 현재 상태 |
|------|-----------|
| 서열 검색 | 포화 (BOLD, BLAST) |
| 데이터 DB | 포화 |
| 분석 도구 | 전문가용 |
| **의사결정 지원** | **거의 없음** |

### 왜 아무도 안 하고 있나

1. **생물학 + UX + AI 결합 필요** — 단순 DB가 아닌 "해석 엔진"
2. **Domain knowledge 필요** — 참치는 COI 안됨, 곤충은 잘됨 등 rule화 어려움
3. **책임 문제** — "신종 가능성" 등 민감한 판단, 대부분 서비스는 안전하게 검색만 제공

### 우리 서비스 = 4가지 결합

```
검색 (BOLD/BLAST) + 해석 (AI) + 추천 (marker/실험/논문) + UX (다음 행동 제시)
```

### 게임체인저 기능 (아직 아무도 안 함)

1. **실험 설계 추천**: primer 추천, PCR 조건, sequencing 전략
2. **데이터 품질 진단**: contamination 확률, sequencing error 탐지
3. **규제 연결**: CITES / 수출입 규제, 종 판별 실패 시 법적 리스크

---

## 현재 상태

BLAST 유사도(%)만 출력 → 사용자가 "이 결과로 뭘 해야 하지?" 모름

## 1. 상황별 자동 해석 & 추천 로직 (핵심 업그레이드)

시퀀스 업로드 → NCBI BLAST 실행 후, **유사도 + top hit 수** 기준 4단계 분류.
각 단계마다 **색상 + 아이콘 + 한 줄 해석 + 버튼** 제공.

| 상황 | 해석 | 색상 | 추천 후속 액션 | Threshold 근거 |
|------|------|------|----------------|----------------|
| 고신뢰 (>=98-99%, 유일 top hit) | "종 수준 확인됨 (Species confirmed)" | 녹색 | NCBI Record 바로가기, BOLD BIN 확인, GenBank 등록 가이드 | COI 동물: 98-99%, 식물 rbcL/matK: 97-99% |
| 중간/모호 (95-98% or top 3 유사도 차이 <2%) | "속 수준 확인, 종 구분 불확실 (Possible cryptic species)" | 노랑 | MSA 정렬 보기, Phylogenetic tree 생성, BOLD ID Engine 재검색 | 다중 hit / intraspecific variation |
| 저신뢰 (90-95%) | "동일 속 가능성 높음, 추가 marker 권장" | 주황 | 다른 marker 추천 리스트, BOLD multi-marker 검색 | genus 수준 threshold |
| 매우 낮음 (<90% or no hit) | "신종 후보 or marker 오류" | 빨강 | Sequence quality check, NCBI Submission Portal, 다른 DB 검색 | novel taxon 가능성 |

**Threshold 커스터마이징**: marker별(COI / ITS / rbcL / matK) 사용자 선택 가능, taxon-specific threshold 테이블 제공

## 2. 추가 기능 (구현 우선순위 순)

### 2-1. BOLD ID Engine 병행 검색 (강력 추천)
- BOLD는 NCBI보다 **바코딩 특화** (BIN 시스템, voucher 사진/수집지 정보)
- REST API 무료: `https://v3.boldsystems.org/index.php/IDS_OpenIdEngine` 또는 XML API
- NCBI + BOLD 결과 병렬 표시: "NCBI 99.2% vs BOLD BIN: BOLD:AAA1234"

### 2-2. Top Hit 자동 부가정보 수집 (Entrez E-utilities)
Accession 클릭 시 자동 수집:
- Taxonomy lineage
- Voucher specimen 정보
- PubMed 논문 링크
- Sequence 출처 (institute, country)

### 2-3. 시각화
- Top 5-10 hit FASTA 자동 다운로드 + Clustal/MUSCLE 정렬 (HTML 테이블 or Jalview.js)
- Neighbor-Joining tree (Biopython + ete3 or Phylogeny.fr 링크)
- "Tree 보기" 버튼 → Phylogeny.fr / iTOL 업로드 파일 제공

### 2-4. 품종(cultivar) 구분 경고
- "품종 구분은 barcoding만으로는 한계가 있습니다" 경고문
- SNP/microsatellite 추천
- 작물별 전문 DB 링크 (NCBI, Korean Crop DB, Grape Genome DB 등)

### 2-5. 고급 분석 (프리미엄 확장 가능)
- Species delimitation (ASAP, PTP, mPTP)
- Multi-locus analysis
- Niche-model-based identification (분포 정보 결합)

## 3. 결과 페이지 UX

하단에 **"다음으로 해보세요" 카드** 3-4개 항상 노출:

**즉시 실행 버튼:**
- "BOLD에서 다시 검색" (API 호출)
- "Phylogenetic Tree 만들기" (파일 다운로드 + Phylogeny.fr 링크)
- "GenBank에 내 시퀀스 등록하기" (Submission Portal + 가이드)
- "전문가에게 물어보기" (Taxonomy 커뮤니티 / NIBR 문의 링크)

**상황별 맞춤 팁:**
- 모호할 때: "cryptic species일 수 있으니 추가 marker (ITS or matK) 시퀀싱 추천"
- 신종 후보: "NCBI 신규 등록 → BIN 자동 부여 → BOLD 공유"

## 4. API 비용 & Rate Limit 정리

| 항목 | 무료 여부 | 주요 제한 | 대안/팁 |
|------|-----------|-----------|---------|
| NCBI BLAST (원격) | 무료 | 초당 3-10회 | API key 필수 + 큐잉 구현 |
| NCBI Entrez | 무료 | 초당 3-10회, retmax 제한 | API key + 배치 처리 |
| BOLD ID Engine | 무료 | 명시 제한 없으나 과도 사용 시 차단 가능 | public endpoint 먼저 사용 |
| BOLD 전체 데이터 | 무료-조건부 | private는 API key 필요 | public만 쓰면 문제없음 |

**NCBI API key**: 무료 발급, 기본 초당 3회 → key 등록 시 10회. 추가 승인 가능 (연구/비영리).
**NCBI BLAST+ 로컬**: 대량/상용이면 로컬 설치가 안정적 (무료).
**BOLD API key**: Workbench에서 무료 발급, 주기적 만료 주의. 상업적 사용 시 support@boldsystems.org 문의.

**결론**: 개인/연구용 소규모 → 둘 다 무료 충분. 고빈도 시 큐 시스템(Redis + Celery) + 캐싱 필수.

## 5. 상용 서비스 시 비용 & 아키텍처

### 5-1. 규모별 추천 아키텍처

| 규모 (일일 검색 수) | 추천 아키텍처 | 예상 월 비용 | 비고 |
|---------------------|--------------|-------------|------|
| ~1,000건 이하 | NCBI/BOLD 공공 API + 큐잉 | 0 ~ 50만원 (서버비) | 초기 추천 |
| 1,000~10,000건 | 자체 BLAST+ on AWS + 캐싱 | 100~400만원 (EC2 + EBS) | 가장 안정적 |
| 10,000건+ | 클라우드 BLAST 서비스 + 자체 서버 | 200~800만원+ | SequenceServer Cloud 등 |
| 고급 기능 (tree, delimitation) | Biopython + 추가 라이브러리 + GPU 서버 | +100~300만원 | ML 기반 분석 추가 시 |

### 5-2. 상용 시 NCBI 대안

| 옵션 | 비용 | 장점 | 단점 | 적합 |
|------|------|------|------|------|
| 공공 API + 큐잉/캐싱 | 무료 | 비용 0원 | 안정성 낮음, 차단 위험 | MVP, ~500명/일 |
| BLAST+ 로컬 설치 + nt DB | 서버 월 50~500만원+ | 무제한 속도, 커스텀 DB | 셋업 복잡, DB 1TB+ 유지 | 1,000명+/일 |
| SequenceServer Cloud 등 | 월 $149~$399 | UI/해석 포함, 안정적 | 월정액 + 추가 비용 | SaaS 빠른 런칭 |
| AWS/GCP에 NCBI DB 미러 | EC2 비용 | 공공 DB 그대로, 비용 예측 | 셋업/운영 비용 | 장기 상용 운영 |

### 5-3. 법적/정책 참고

- NCBI: 상업적 사용 포함 완전 무료. 별도 유료 티어 없음. 단, 고빈도 시 차단 가능.
- BOLD: public endpoint 무료, 상업 사용 명시적 금지 없음. 고빈도 시 차단 가능.
- **안전 조치**: dev@ncbi / support@boldsystems.org 에 "상용 웹서비스 API 사용 계획" 메일 권장.
- SkyBLAST 등 서드파티: 2025년 말 중단 사례 있음 — 의존 주의.

## 6. Rate Limiting & 캐싱 아키텍처

### 6-1. 내부 Rate Limit

NCBI API key 기준 **초당 10회**, 초과 시 HTTP 429.

**구현 방식:**
- 전역 rate limiter (Redis sliding window / token bucket): 초당 8~9회로 여유
- 사용자별 추가 제한: 무료 1~2회/초, 일 50회 / 유료 5회/초, 일 500회
- 큐 시스템 (Celery + Redis or BullMQ): 몰리면 큐 → "처리 중 (대기: 3초)" 표시

### 6-2. Turso DB 캐싱 전략

**캐시 키**: `md5(sequence + "_" + marker + "_" + db)` (예: `md5(seq + "_coi_nt")`)

**저장 데이터:**
- raw BLAST JSON 결과
- top hit accession, identity %, query cover, taxonomy
- hit_timestamp + expire_at

**캐시 로직:**
```
요청 → 키로 Turso SELECT
  ├─ hit + 유효 → 바로 반환 (0.1~1초)
  └─ miss or expired → NCBI/BOLD 호출 → INSERT/UPDATE → 반환
```

**기대 효과:**
- 캐시 히트율 50~80% → NCBI 호출 1/5~1/10 수준
- 100명/일 → 실제 호출 ~50회/일, 1,000명/일 → ~300회/일

### 6-3. 캐시 갱신 전략

**왜 즉시 갱신 불필요?**
- NCBI nt: 매일 추가되지만 기존 top hit 결과 90%+ 변하지 않음
- BOLD BIN: 월 1회 정도 clustering 업데이트
- 1~4주 된 캐시는 연구/상용에서 충분히 신뢰 가능

**TTL 설정:**
- NCBI BLAST 결과: 14~30일
- BOLD BIN 관련: 30~60일

**갱신 트리거:**
- TTL 만료 시 자동 재검색
- 사용자 "최신 결과로 다시 검색" 버튼 → 강제 재호출
- (선택) 매주/매월 cron: 인기 시퀀스 top 1000 재검색
- BLAST XML의 db version 변경 시 invalidate

**캐시 예외 (저장하지 않는 경우):**
- No significant hit (<90%) → 신종 후보 → 매번 fresh 검색 강제
- 프리미엄 사용자: 항상 fresh 옵션 제공

### 6-4. 전체 아키텍처 흐름

```
사용자 요청
  ↓
Rate Limiter (Redis: 초당 8회 전역 + 사용자별 제한)
  ↓ (통과)
Cache Check (Turso: MD5 키로 hit?)
  ├─ Yes → 바로 결과 반환 (cached)
  └─ No → Job Queue (Celery/BullMQ)
            ↓
      NCBI/BOLD API 호출 (with API key)
            ↓
      결과 저장 Turso + 반환
```

## 7. COI 실패 대응 엔진 (Decision Engine)

핵심 원칙: **"결과 없음"은 에러가 아니라 지능형 가이드의 시작점**

### 7-1. 실패 상황 3가지 분류

| Case | 상황 | 원인 | 색상 |
|------|------|------|------|
| A: Ambiguous | 여러 종이 동일하게 나옴 (예: 참치류 Thunnus) | COI 분해능 부족 | 노랑 |
| B: No hit | DB에 유사 서열 자체 없음 | 신종 / 데이터 부족 / 잘못된 서열 | 주황 |
| C: Low identity (<90%) | 유사도 매우 낮음 | 프라이머 문제 / 오염 / 엉뚱한 서열 | 빨강 |

### 7-2. 상황별 자동 시나리오 추천

**CASE A: Ambiguous (COI 분해능 부족)**
- 메시지: "COI는 해당 그룹에서 종 구분 능력이 낮습니다."
- 추천: D-loop / Cyt b / SNP panel
- 버튼: "추천 마커 보기", "참고 논문 보기"

**CASE B: No hit (매칭 없음)**
- 메시지: "현재 DB에서 유사 COI 서열을 찾지 못했습니다."
- 추천: GenBank BLAST 확장 검색, genus 수준 fallback, contamination 체크
- 추가: "신종 가능성" 힌트 (주의 문구 포함)

**CASE C: Low identity**
- 메시지: "입력된 서열의 품질 또는 영역이 COI와 일치하지 않을 수 있습니다."
- 추천: ORF 체크, stop codon 확인, reverse complement 검사, primer 위치 검증

### 7-3. Decision Engine 로직

```
if (multi_species_overlap) → scenario_A (Ambiguous)
if (no_hit)                → scenario_B (No hit)
if (low_identity)          → scenario_C (Low identity)
```

출력 JSON 예시:
```json
{
  "status": "ambiguous",
  "confidence": "low",
  "reason": "COI low resolution in Thunnus",
  "recommendation": ["Use D-loop marker", "Use Cyt b", "Consider SNP panel"],
  "next_actions": ["View protocols", "See reference papers"]
}
```

### 7-4. 차별화 기능 (고도화)

1. **Marker Recommendation Engine**: species 입력 → 최적 마커 자동 추천
2. **COI Reliability Score**: 분류군별 COI 신뢰도 점수 (예: Thunnus 0.2, Salmonidae 0.8)
3. **Explainable AI 결과**: "왜 COI가 안 되는지" 설명 (최근 진화, mtDNA 공유, 논문 근거)
4. **자동 논문 연결**: 해당 종의 barcoding 연구 논문 추천

### 7-5. UX 흐름

```
[사용자 서열 입력]
      ↓
[COI 분석]
      ↓
[결과 없음 / ambiguous / low identity]
      ↓
  "COI로는 종 구분이 어렵습니다" (원인 설명)
      ↓
  추천: D-loop / Cyt b / SNP panel 등
      ↓
[버튼] 실험 방법 보기 | 논문 보기 | 다른 마커 업로드
```

## 8. 구현 순서 (MVP → 고도화)

1. **즉시**: threshold-based 해석 문구 + BOLD 병행 검색 + "다음 액션" 버튼 3개
2. **다음**: MSA viewer + simple tree 생성 + Turso 캐싱
3. **고도화**: COI 실패 대응 엔진 + Marker Recommendation + 품종 구분 경고 + multi-marker + delimitation + rate limiting

---

## 검증 필요 항목

- [x] BOLD v3/v4/v5 API endpoint 현재 상태 확인 → v3/v4 2025.08 폐지, v5 활성. [03-databases.md](03-databases.md) 참조
- [ ] Threshold 수치 논문 출처 확인 (Hebert et al., Pappalardo 2025)
- [ ] Jalview.js 현재 유지보수 상태
- [ ] Phylogeny.fr / iTOL 연동 가능 여부
- [x] NCBI rate limit 정책 최신 확인 → E-utils 3/10 req/sec, BLAST 10초/건, 일 100건. [03-databases.md](03-databases.md) 참조
- [ ] SequenceServer Cloud 가격 최신 확인
- [ ] NCBI nt DB 크기 및 AWS Open Data 미러 현황 → GenBank Release 265.0: 55.6억 레코드, 41.96조 염기
- [x] BOLD API key 만료 주기 확인 → Workbench에서 무료 발급, 주기적 만료

## 아키텍처 참고 — BioHub 실제 스택과의 차이

> 이 문서의 아키텍처(Redis + Celery + AWS)는 일반적 구성 제안임.
> BioHub 실제 스택 반영 시 아래로 대체:
>
> | 이 문서 제안 | BioHub 실제 | 비고 |
> |-------------|------------|------|
> | Redis + Celery | Cloudflare Workers (큐잉) | Workers 내 rate limit 로직 |
> | AWS EC2 | Cloudflare Workers + Pages | 서버리스 |
> | Redis 캐싱 | Turso DB 캐싱 | 이미 일치 |
> | N/A | **Tauri 데스크탑** | CORS 없이 직접 API 호출, 사용자별 IP 분산 |
>
> 상세: [03-databases.md](03-databases.md) 섹션 10 "BioHub 아키텍처 결정 사항"
