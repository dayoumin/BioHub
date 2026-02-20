# 🚀 테스트 빠른 시작 가이드

## 즉시 테스트 실행하기

### 🌐 브라우저 테스트 (가장 쉬움)
```bash
# 1단계: 서버 시작
cd stats
npm run dev

# 2단계: 브라우저 열기 (자동)
start chrome "http://localhost:3000/validation"
```

**테스트 페이지에서:**
1. Pyodide 자동 초기화 대기 (5-10초)
2. "테스트 실행" 버튼 클릭
3. 결과 확인 (✅ 성공 / ❌ 실패)

### ⚡ 단위 테스트 (빠른 검증)
```bash
# 메서드 매핑 테스트
npm test method-mapping
```

## 📍 주요 테스트 페이지

| URL | 용도 | 특징 |
|-----|------|------|
| `/validation` | 기본 통계 검증 | 17개 핵심 함수 테스트 |
| `/validation-full` | 전체 테스트 | 29개 모든 함수 테스트 |
| `/smart-flow` | 통합 플로우 | 실제 사용 시나리오 |

## ✅ 테스트 체크리스트

### 핵심 기능 (반드시 확인)
- [ ] Pyodide 초기화
- [ ] T-test (독립/대응)
- [ ] ANOVA + Tukey HSD
- [ ] 상관분석 (Pearson/Spearman)
- [ ] 선형회귀
- [ ] 정규성 검정 (Shapiro-Wilk)

### 추가 검증
- [ ] 비모수 검정 (Mann-Whitney, Kruskal-Wallis)
- [ ] 카이제곱 검정
- [ ] 이상치 탐지
- [ ] 대용량 데이터 (n>1000)

## 🔍 문제 해결

### Pyodide 로딩 실패
```javascript
// 콘솔에서 확인
console.log(window.loadPyodide)  // 함수가 있어야 함
```

### 테스트 타임아웃
```bash
# 타임아웃 증가
npm test -- --testTimeout=60000
```

### 포트 충돌
```bash
# 다른 포트 사용
npm run dev -- -p 3001
```

## 📊 예상 결과

### 성공 기준
- **정확도**: R/SPSS와 0.0001 이내 차이
- **속도**: 각 테스트 < 100ms
- **안정성**: 10회 연속 실행 시 동일 결과

### 현재 상태 (2025-09-17)
- ✅ 17/29 함수 구현 및 테스트
- ✅ 브라우저 테스트 정상 작동
- ⚠️ Jest 환경 Pyodide 이슈 (알려진 문제)

---

**빠른 도움**: 문제 발생 시 `/validation` 페이지의 콘솔 로그 확인