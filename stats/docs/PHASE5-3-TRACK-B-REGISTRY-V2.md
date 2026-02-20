# Phase 5-3 Track B: methods-registry v2 확장

## 배경

현재 `methods-registry.schema.json`의 `methodDefinition`은 아래 필드만 허용합니다.

- `params`
- `returns`
- `description`

`additionalProperties: false` 제약으로 인해 운영 메타데이터(`status`, `deprecated`)를 넣을 수 없습니다.

---

## 목표

1. 레지스트리에 운영 메타데이터를 공식 지원
2. 생성기(`scripts/generate-method-types.mjs`)와 타입(`methods-registry.types.ts`)을 v2와 정합화
3. 기존 데이터와의 하위호환 유지

---

## 제안 스키마(v2)

`methodDefinition` 확장 필드(안):

- `status`: `'active' | 'todo' | 'experimental' | 'deprecated'`
- `since`: `string` (예: `2026-02`)
- `replacement`: `string` (대체 메서드 ID)
- `notes`: `string`

원칙:

1. 기존 필드(`params/returns/description`)는 필수 유지
2. 신규 필드는 optional
3. 스키마 버전을 `_meta.version`으로 명확히 증가

---

## 작업 단계

### B1. 스키마 업데이트
- 파일: `lib/constants/methods-registry.schema.json`
- 검증: 스키마 lint + 샘플 데이터 검증

### B2. 생성기 영향 반영
- 파일: `scripts/generate-method-types.mjs`
- 신규 메타 필드가 타입 생성을 깨지 않도록 처리

### B3. 타입 및 유틸 업데이트
- 파일: `lib/constants/methods-registry.types.ts`
- `MethodDefinition` 인터페이스 확장

### B4. 데이터 마이그레이션
- 파일: `lib/constants/methods-registry.json`
- 미구현 메서드 등부터 점진 적용

---

## 완료 기준

1. v2 스키마 기준으로 레지스트리 유효성 통과
2. 타입 생성/빌드 파이프라인 정상 동작
3. 최소 1개 method에 신규 메타 필드 시범 적용 완료
