# Genetics 개발 로그

> 구현 중 발견한 기술적 사항, 외부 API 특이점, 우회 방법 등을 기록.
> TODO.md는 "할 일", DEVLOG.md는 "알게 된 것".

---

## 2026-03-22: NCBI BLAST API

### JSON2 포맷이 ZIP으로 올 수 있음
- `FORMAT_TYPE=JSON2`로 결과 요청 시 ZIP 파일로 응답하는 경우 발견
- ZIP 시그니처: 응답이 `PK`로 시작
- **해결**: `FORMAT_TYPE=Text&ALIGNMENT_VIEW=Tabular` (TSV)로 전환
- TSV 필드: query, subject acc.ver, % identity, alignment length, mismatches, gap opens, q.start, q.end, s.start, s.end, evalue, bit score

### Tabular 응답에 종명 없음
- Tabular에는 accession만 있고 종명(organism)이 없음
- 종명 조회: NCBI E-utilities `efetch.fcgi?db=nuccore&id=ACCESSION&rettype=docsum&retmode=json`
- **현재**: accession으로 표시. **Phase 2**: efetch 연동

### dev 환경 프록시 설정
- Next.js(3000) → wrangler(8787) 프록시: `next.config.ts`에 `rewrites` 추가
- Origin 검증: localhost 간 포트 차이 허용 필요 (dev에서만)
- `stats/out` 폴더가 없으면 wrangler 시작 실패 → `mkdir -p stats/out`

### Rate Limit
- BLAST 제출: 10초 간격 (NCBI 정책)
- E-utilities: 키 없이 3/sec, 키 있으면 10/sec
- Workers의 in-memory rate limiter는 isolate별이라 분산 환경에서 비신뢰

## 2026-03-22: 워크스페이스 패키지

### @biohub/types 사용 시 transpilePackages 필수
- 워크스페이스 패키지가 빌드 안 된 TypeScript 소스를 제공
- Next.js는 기본적으로 node_modules의 TypeScript를 처리 안 함
- **해결**: `next.config.ts`에 `transpilePackages: ['@biohub/types', '@biohub/db']`

### 중복 lockfile 충돌
- `stats/pnpm-lock.yaml`과 루트 `pnpm-lock.yaml`이 공존하면 Next.js가 workspace root를 잘못 추론
- `stats/package-lock.json` (npm용)도 충돌
- **해결**: stats 하위 lockfile 모두 삭제, 루트 lockfile만 유지

## 2026-03-22: 보안

- 보안 체크리스트: [docs/SECURITY-CHECKLIST.md](../SECURITY-CHECKLIST.md)
- 서열 크기 제한: 100-10,000bp (Worker에서 검증)
- 파일 업로드: 1MB 제한 (클라이언트에서 검증)
- Origin 스푸핑: 비브라우저 클라이언트에서 가능 → CF Rate Limiting 필요 (배포 시)
