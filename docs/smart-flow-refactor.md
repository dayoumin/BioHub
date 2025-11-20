## Smart Flow Variable Mapping & Refactor Notes

### ✅ Completed (2025-11-20)

#### 1. VariableMapping 중복 정의 제거
**문제**: VariableMapping 인터페이스가 4곳에 중복 정의되어 타입 불일치 발생
- `lib/statistics/variable-mapping.ts` - `dependentVar`, `groupVar` ✅
- `types/statistics.d.ts` - `dependent`, `group` ❌
- `types/smart-flow-navigation.ts` - `dependent`, `group` ❌
- `hooks/use-statistics-page.ts` - `[key: string]` ❌

**해결**:
- `lib/statistics/variable-mapping.ts`를 **유일한 정의**로 유지
- 나머지 3곳은 import + re-export 패턴 적용
- `components/variable-selection/types.ts`도 동일하게 수정
- index signature `[key: string]: string | string[] | undefined` 추가 (하위 호환성)

**결과**:
- TypeScript 컴파일: 0 errors ✅
- 빌드: 68 pages 성공 ✅
- 테스트: 9/9 passed ✅

#### 2. VariableSelectionStep 표준화
- `VariableAssignment` → `VariableMapping` 변환 로직 구현 (line 38-56)
- 단일 선택 필드 (`dependent`, `factor`) → 배열 검사 후 첫 값 추출
- 표준 키 사용: `dependentVar`, `independentVar`, `groupVar`, `timeVar`

#### 3. AnovaExecutor prepareGroups() 추가
- 원시 데이터 → 그룹별 숫자 배열 자동 변환 (line 296-322)
- `one-way-anova`, `tukey-hsd`, `games-howell` ID 지원
- `dependentVar` + `groupVar` 표준 키 사용

---

### 📋 표준 규칙

#### 변수 키 이름 규칙
| 역할 | 키 이름 | 타입 | 비고 |
|------|---------|------|------|
| 종속변수 | `dependentVar` | `string` | 단일 선택 |
| 독립변수 | `independentVar` | `string \| string[]` | 단일/복수 |
| 그룹변수 | `groupVar` | `string` | 단일 선택 |
| 시간변수 | `timeVar` | `string` | 단일 선택 |
| 공변량 | `covariate` | `string \| string[]` | 선택 |
| 블록 | `blocking` | `string \| string[]` | 선택 |
| 개체내 | `within` | `string[]` | 선택 |
| 개체간 | `between` | `string[]` | 선택 |
| 이벤트 | `event` | `string` | 생존분석 |
| 중도절단 | `censoring` | `string` | 생존분석 |
| 가중치 | `weight` | `string` | 선택 |

#### 타입 정의 위치
- **유일한 정의**: `lib/statistics/variable-mapping.ts`
- **re-export**: `types/smart-flow-navigation.ts`, `hooks/use-statistics-page.ts`, `components/variable-selection/types.ts`
- **절대 금지**: 페이지별 재정의

---

### 🔜 향후 작업

- **DataValidationStep 분리**: 큰 컴포넌트를 작은 단위로 분할
- **Phase 6 (props centralization)**: 공통 인터페이스로 props 통합
- **다른 Executor 표준화**: `dependentVar`, `groupVar` 표준 키 적용
- **변수 확장**: 새 변수 role 추가 시 `VariableMapping` 먼저 업데이트 후 `VariableSelectionStep` 반영
