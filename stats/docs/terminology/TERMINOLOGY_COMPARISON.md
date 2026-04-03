# 도메인별 용어 비교표

**목적**: 각 도메인의 용어가 적절한지 검증

---

## 📊 변수 타입 용어 비교

| 통계 개념 | 수산과학 (aquaculture) | 범용 통계 (generic) | 의학 연구 (medical) |
|----------|---------------------|------------------|------------------|
| **Group Variable** | 실험구 변수<br><small>예: 양식장, 처리구, 사료 종류</small> | Group Variable<br><small>Categorical variable defining groups</small> | 환자군 변수<br><small>예: 대조군, 치료군</small> |
| **Dependent Variable** | 측정값 (Y)<br><small>예: 어체 중량, 성장률, 생존율</small> | Dependent Variable (Y)<br><small>Numeric variable to compare</small> | 측정 지표<br><small>예: 혈압, 혈당, 생존율</small> |
| **Independent Variable** | 요인 변수 (X)<br><small>예: 수온, 염분도, 용존산소</small> | Independent Variable (X)<br><small>Predictor variables</small> | 예측 변수<br><small>예: 나이, 성별, BMI</small> |
| **Factor** | 처리 조건<br><small>예: 사료 종류, 수온 수준, 밀도</small> | Factor<br><small>Categorical factor variable</small> | 처치 변수<br><small>예: 약물 종류, 투여량</small> |
| **Covariate** | 공변량<br><small>예: 초기 체중, 초기 전장</small> | Covariate<br><small>Continuous control variable</small> | 공변량<br><small>예: 기저선 측정값</small> |
| **Time Variable** | 시간 변수<br><small>예: 사육일수, 측정 주차</small> | Time Variable<br><small>Time or sequence variable</small> | 시간 변수<br><small>예: 추적 기간, 내원일</small> |
| **Event Variable** | 사건 변수<br><small>예: 폐사 여부, 성숙 도달</small> | Event Variable<br><small>Binary outcome variable</small> | 사건 변수<br><small>예: 사망, 재발</small> |

---

## ✅ 적절성 평가

### 수산과학 용어 (aquaculture)

| 용어 | 적절성 | 비고 |
|------|--------|------|
| 실험구 변수 | ⭐⭐⭐⭐⭐ | 수산과학에서 표준적으로 사용 |
| 측정값 | ⭐⭐⭐⭐ | "관측값"도 고려 가능 |
| 요인 변수 | ⭐⭐⭐⭐⭐ | 적절함 |
| 처리 조건 | ⭐⭐⭐⭐⭐ | 실험 설계에서 표준 용어 |
| 사육일수 | ⭐⭐⭐⭐⭐ | 수산과학 특화 용어 |
| 폐사 여부 | ⭐⭐⭐⭐⭐ | 수산과학 특화 용어 |

**결론**: 수산과학 용어는 매우 적절하며, 실제 연구자들이 사용하는 용어와 일치합니다.

### 예시의 적절성

| 예시 | 적절성 | 대안 |
|------|--------|------|
| 양식장, 처리구 | ⭐⭐⭐⭐⭐ | - |
| 어체 중량, 성장률 | ⭐⭐⭐⭐⭐ | - |
| 수온, 염분도 | ⭐⭐⭐⭐⭐ | 용존산소량 추가 가능 |
| 사료 종류 | ⭐⭐⭐⭐⭐ | - |
| 초기 체중 | ⭐⭐⭐⭐⭐ | "입식 체중"도 가능 |

---

## 🔄 도메인 전환 시나리오

### 시나리오 1: 수산과학 연구자

```
도메인: aquaculture
언어: ko

GroupComparisonSelector 표시:
- 제목: "실험구 비교 변수 선택"
- 설명: "실험구 변수와 측정값을 선택하세요 (예: 양식장별 어체 중량 비교)"
- 카드: "실험구 변수" / "측정값 (Y)"
```

### 시나리오 2: 범용 통계 사용자

```
도메인: generic
언어: ko (한국어 UI 유지)

GroupComparisonSelector 표시:
- 제목: "Group Comparison Variable Selection"
- 설명: "Select a group variable and a dependent variable to compare"
- 카드: "Group Variable" / "Dependent Variable (Y)"
```

### 시나리오 3: 의학 연구자 (미래)

```
도메인: medical
언어: ko

GroupComparisonSelector 표시:
- 제목: "환자군 비교 변수 선택"
- 설명: "환자군과 측정 지표를 선택하세요 (예: 치료군별 혈압 비교)"
- 카드: "환자군 변수" / "측정 지표"
```

---

## 📝 개선 제안

### 1. 수산과학 용어 미세 조정

**현재 좋은 것들 (유지)**:
- ✅ 실험구 변수
- ✅ 측정값
- ✅ 사육일수
- ✅ 폐사 여부

**고려 사항**:
- "측정값" vs "관측값": 측정값이 더 일반적
- "처리 조건" vs "실험 처리": 둘 다 사용되지만 처리 조건이 더 명확

### 2. 다국어 지원 우선순위

1. **Phase 1 (완료)**: 도메인별 용어 (ko)
2. **Phase 2 (미래)**: 도메인 + 언어 (ko/en)
   - `aquaculture.ko.ts`
   - `aquaculture.en.ts`
   - `generic.ko.ts`
   - `generic.en.ts`

### 3. 사용자 피드백 수집

실제 수산과학 연구자에게 용어를 검증받아 개선할 수 있습니다.

---

**작성일**: 2026-02-09
**검증자**: AI (Claude)
**다음 단계**: 실제 연구자 피드백 수집
