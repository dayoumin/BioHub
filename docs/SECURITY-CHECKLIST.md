# 보안 체크리스트

**작성일**: 2026-03-22
**대상**: BioHub 전체 (stats, genetics, Workers)

---

## 배포 전 필수 조치

### Workers API 보안

| # | 항목 | 현황 | 조치 |
|---|------|------|------|
| 1 | **Rate limiting** | in-memory (isolate별, 비신뢰) | CF Rate Limiting Rules 설정 또는 KV 기반 구현 |
| 2 | **Origin 검증** | Origin/Referer 헤더 체크 (스푸핑 가능) | CF WAF 또는 API 토큰 도입 |
| 3 | **BLAST 서열 크기** | 100-10,000bp 제한 (구현됨) | ✅ 완료 |
| 4 | **BLAST 스로틀** | 10초 간격 (isolate별, 비신뢰) | KV 기반 글로벌 스로틀 필요 |
| 5 | **파일 업로드** | 1MB 제한 (구현됨) | ✅ 완료 |
| 6 | **NCBI API 키 보호** | Workers secrets에 저장 | ✅ `wrangler secret put NCBI_API_KEY` |
| 7 | **OpenRouter API 키** | Workers secrets에 저장, 10KB body 제한 | ✅ 기존 구현 |

### 사용자 데이터 보안

| # | 항목 | 현황 | 조치 |
|---|------|------|------|
| 8 | **인증** | MVP: UUID (localStorage) | OAuth 도입 시 세션 관리 필요 |
| 9 | **D1 접근 제어** | Workers 바인딩 전용 (직접 노출 안 됨) | ✅ |
| 10 | **R2 접근 제어** | Workers 바인딩 전용 | ✅ |
| 11 | **SQL injection** | Drizzle ORM 사용 (파라미터화) | ✅ |

### 외부 API 남용 방지

| # | 항목 | 위험 | 조치 |
|---|------|------|------|
| 12 | **NCBI BLAST 남용** | Workers IP 차단 위험 | 사용자별 키 입력 + 일일 제한 + 캐시 |
| 13 | **EBI BLAST** | 동시 30건 제한 | 큐 시스템 |
| 14 | **OpenAlex** | 무료 API 키 필요 | 키 관리 |

### 클라이언트 보안

| # | 항목 | 현황 | 조치 |
|---|------|------|------|
| 15 | **XSS** | React 기본 이스케이프 | ✅ dangerouslySetInnerHTML 미사용 확인 |
| 16 | **NCBI accession 링크** | 외부 링크 target=_blank | ✅ rel=noopener noreferrer 확인 |

---

## 현재 미해결 (배포 전 처리)

- [ ] #1: CF Rate Limiting Rules 설정
- [ ] #2: API 토큰 또는 CF WAF 설정
- [ ] #4: KV 기반 BLAST 스로틀
- [ ] #8: OAuth 인증 (카카오/네이버/구글)
- [ ] #12: 사용자별 NCBI API 키 입력 UI + 일일 제한

## 이미 완료

- [x] #3: 서열 크기 제한 (100-10,000bp)
- [x] #5: 파일 업로드 1MB 제한
- [x] #6, #7: API 키 Workers secrets
- [x] #9, #10: D1/R2 Workers 바인딩
- [x] #11: Drizzle ORM
- [x] #15, #16: XSS/링크 보안
