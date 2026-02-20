# Archived Scripts

이 디렉터리는 더 이상 사용되지 않거나 중복된 스크립트를 보관합니다.

---

## 📦 아카이브된 스크립트

### 1. `validate-statistics.sh`
**아카이브 날짜**: 2025-11-05
**이유**: `validate-statistics.js`와 기능 중복

**원래 용도**:
- 통계 페이지 UI 렌더링 검증 (L1-L3)
- bash 버전

**대체**:
- ✅ `validate-statistics.js` 사용 권장 (더 완성도 높음)

**복구 방법**:
```bash
git mv scripts/archive/validate-statistics.sh scripts/
```

---

### 2. `test-helper-refactoring.ts`
**아카이브 날짜**: 2025-11-05
**이유**: 용도 불명확, 문서화 부족

**원래 용도**:
- 테스트 헬퍼 함수 리팩토링 (추정)
- 110줄 TypeScript 파일

**문제점**:
- 실행 방법 없음
- 주석 부족
- 사용 여부 불명

**복구 방법**:
```bash
git mv scripts/archive/test-helper-refactoring.ts scripts/
```

---

## 🔄 복구 정책

아카이브된 스크립트는 삭제되지 않고 보관됩니다.

**복구가 필요한 경우**:
1. Git 이력에서 복구 가능
2. 이 디렉터리에서 직접 복사 가능
3. 복구 후 반드시 문서화 필요

---

## 📝 아카이브 이력

| 날짜 | 스크립트 | 이유 | 대체 |
|------|---------|------|------|
| 2025-11-05 | validate-statistics.sh | 중복 | validate-statistics.js |
| 2025-11-05 | test-helper-refactoring.ts | 용도 불명 | - |

---

**참고**: 스크립트 아카이브 정책은 [scripts/README.md](../README.md) 참조