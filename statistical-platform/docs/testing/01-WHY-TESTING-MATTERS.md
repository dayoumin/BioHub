# 왜 자동화 검증이 필요한가?

**수동 테스트의 지옥에서 탈출하기**

---

## 🔥 현실: 수동 테스트의 악몽

### 시나리오 1: 매일 아침 반복되는 일

```
07:00 - 출근
07:30 - 커피 한 잔 ☕
08:00 - "어제 수정한 T-Test 테스트해야지..."

# 테스트 시작
1. 브라우저 열기
2. 통계 페이지 이동 (/statistics/t-test)
3. CSV 파일 업로드 (test-data-normal.csv)
4. 변수 선택: Group1, Group2
5. 분석 실행 버튼 클릭
6. 결과 확인:
   - p-value: 0.0234 ✓
   - t-statistic: 2.456 ✓
   - 신뢰구간: [-0.5, 2.3] ✓
7. 다음 시나리오 (test-data-skewed.csv)
8. 반복...

12:00 - 점심 (T-Test 1개 완료, 42개 남음 😱)
```

### 시나리오 2: 코드 수정 후

```python
# worker1.py 수정
def ttest(data):
    result = stats.ttest_ind(group1, group2)
    return {
        "statistic": result.statistic,
        "pValue": result.pvalue,  # ← 오타: pValue → p_value
        "ci": [ci_lower, ci_upper]
    }
```

**문제**: 43개 통계 메서드 모두 다시 테스트? 🤯

---

## 📊 숫자로 보는 수동 테스트

### 이 프로젝트의 현실

| 항목 | 수량 | 시간 |
|------|------|------|
| 통계 메서드 | 43개 | - |
| 메서드당 시나리오 | 10개 | 5분/개 |
| **총 테스트 케이스** | **430개** | **35.8시간** |

**매주 금요일 배포 전**:
- ✅ 모든 메서드 테스트
- ✅ 모든 시나리오 검증
- ✅ 회귀 테스트 (이전 기능 깨지지 않았는지)

**현실**:
- ❌ 시간 부족 (35시간 → 2시간만 가능)
- ❌ 샘플링 (10개만 테스트)
- ❌ 배포 후 버그 발견 😭

---

## 🎯 자동화의 힘

### Before: 수동 테스트

```bash
# 개발자가 직접 실행 (35시간)
- T-Test 10개 시나리오
- ANOVA 10개 시나리오
- Chi-Square 10개 시나리오
- ... (43개 반복)
```

### After: 자동화 테스트

```bash
npm test

# 5분 후...
✓ T-Test: 정규분포 (0.8s)
✓ T-Test: 왜도 데이터 (0.9s)
✓ ANOVA: 3그룹 동일분산 (1.2s)
✓ Chi-Square: 2x2 독립성 (0.7s)
...
✓ 430/430 tests passed (5m 12s)
```

**결과**:
- ⏱️ 35시간 → **5분** (420배 빠름)
- 🎯 100% 커버리지 (430개 모두)
- 🤖 CI/CD 자동 실행 (사람 개입 0)

---

## 🐛 실제 발생한 버그들

### 버그 1: 필드명 불일치 (Phase 9)

**Python Worker**:
```python
# worker2.py
def anova_oneway(data):
    result = stats.f_oneway(*groups)
    return {
        "f_statistic": result.statistic,  # ← 스네이크 케이스
        "p_value": result.pvalue
    }
```

**TypeScript**:
```typescript
interface ANOVAResult {
  fStatistic: number;  // ← 카멜 케이스
  pValue: number;
}

const { fStatistic } = result as ANOVAResult;
console.log(fStatistic);  // undefined 😱
```

**발견 시점**: 사용자 신고 (배포 후 3일)
**영향**: ANOVA 사용자 100% 영향
**수정 시간**: 10분
**손실 시간**: 3일 × 8시간 = 24시간 (신뢰도 하락)

---

### 버그 2: Null 체크 누락 (Phase 6)

```typescript
function runChiSquare(data: Dataset) {
  const row = data.columns.find(c => c.role === 'row');
  const column = data.columns.find(c => c.role === 'column');

  // ❌ row가 undefined일 수 있음!
  const result = await worker.chiSquare({
    row: row.name,  // 💥 런타임 에러
    column: column.name
  });
}
```

**발견 시점**: 사용자가 변수 선택 안 하고 실행
**증상**: 화면 멈춤 (에러 메시지 없음)
**원인**: `row.name` → `Cannot read property 'name' of undefined`

---

### 버그 3: Python 라이브러리 버전 차이

**로컬 환경**:
```python
# SciPy 1.10.1
stats.ttest_ind(g1, g2)
# → { statistic: 2.5, pvalue: 0.03 }
```

**배포 환경** (Pyodide):
```python
# SciPy 1.9.0 (Pyodide 구버전)
stats.ttest_ind(g1, g2)
# → { statistic: 2.5, pvalue: 0.03, df: 10 }  # df 필드 추가!
```

**발견 시점**: 배포 후 통합 테스트
**영향**: TypeScript에서 `df` 필드 파싱 실패

---

## 🤔 자동화가 해결하는 문제

### 1. 휴먼 에러 제거

```typescript
// ❌ 개발자가 눈으로 확인
console.log('p-value:', result.pValue);
// "0.0234... 맞는 것 같은데?" (소수점 5자리 육안 비교)

// ✅ 자동화 테스트
expect(result.pValue).toBeCloseTo(0.023456, 5);  // 정밀 비교
```

### 2. 회귀 테스트 자동화

```bash
# 개발자: "Chi-Square 수정했어"
# 팀원: "다른 메서드는 괜찮아?"
# 개발자: "음... 확인 안 했는데..." 😅

# 자동화 테스트
npm test  # 43개 메서드 모두 검증 ✅
```

### 3. 문서화 역할

```typescript
// 테스트 = 살아있는 문서
test('T-Test: 표본 크기 3 미만 시 에러', () => {
  expect(() => runTTest([1, 2])).toThrow('최소 3개 필요');
});

test('T-Test: 동일분산 가정', () => {
  const result = runTTest(data, { equalVariance: true });
  expect(result.method).toBe('Student T-Test');
});
```

**효과**:
- 새 개발자: "T-Test가 어떻게 동작하지?" → 테스트 코드 보면 됨
- 기획자: "최소 표본 크기는?" → 테스트 케이스에 명시됨

---

## 🚀 AI 시대의 필수 조건

### 문제: AI가 생성한 코드 신뢰할 수 있나?

**GPT-4에게 요청**:
```
"T-Test를 수행하는 Python 함수 작성해줘"
```

**GPT-4 응답**:
```python
def ttest(data1, data2):
    # ❌ 잘못된 통계 공식 (AI 환각)
    mean_diff = np.mean(data1) - np.mean(data2)
    std_pooled = (np.std(data1) + np.std(data2)) / 2  # 틀림!
    t = mean_diff / std_pooled
    return t
```

### 해결: 자동화 테스트로 검증

```python
# Golden Snapshot (정답지)
def test_ttest_normal_distribution():
    result = ttest([1,2,3,4,5], [6,7,8,9,10])

    # SciPy 공식 결과와 비교
    expected = stats.ttest_ind([1,2,3,4,5], [6,7,8,9,10])
    assert result.statistic == expected.statistic  # ✅
```

**결과**:
- AI 코드 즉시 검증
- 통계 공식 정확도 보장
- 사람이 통계 이론 몰라도 OK

---

## 📈 ROI (투자 대비 효과)

### 비용 분석

| 항목 | 수동 | 자동화 |
|------|------|--------|
| **초기 투자** | 0시간 | 68시간 (테스트 작성) |
| **주간 테스트** | 35시간 | 0.1시간 (자동 실행) |
| **월간 비용** | 140시간 | 0.4시간 |
| **연간 비용** | 1,680시간 | 4.8시간 |

**3개월 후 손익분기점**:
- 수동: 420시간
- 자동화: 68시간 (초기) + 1.2시간 (운영) = 69.2시간
- **절감**: 350.8시간 (87.5% 감소)

---

## 🎯 결론

### 자동화가 필요한 이유

1. **시간 절약**: 35시간 → 5분 (420배)
2. **신뢰성**: 휴먼 에러 제거
3. **회귀 방지**: 기존 기능 보호
4. **문서화**: 테스트 = 살아있는 스펙
5. **AI 시대 대비**: LLM 생성 코드 검증

### 이 프로젝트의 목표

- ✅ 43개 통계 메서드 100% 커버리지
- ✅ 430개 테스트 케이스 자동 실행
- ✅ CI/CD 통합 (커밋마다 자동 검증)
- ✅ **사람은 창의적인 일에 집중** 🚀

---

## 🔗 다음 단계

자동화 검증의 3가지 핵심 도구를 배워봅시다:

1. [Contract (계약)](./02-CONTRACT-EXPLAINED.md) - 약속 정의
2. [Zod (검증)](./03-ZOD-RUNTIME-VALIDATION.md) - 런타임 체크
3. [Golden Snapshot (정답)](./04-GOLDEN-SNAPSHOT.md) - 자동 비교

**시작**: [Contract 개념 이해하기 →](./02-CONTRACT-EXPLAINED.md)
