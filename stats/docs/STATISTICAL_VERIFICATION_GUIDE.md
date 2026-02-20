# 통계 메서드 검증 가이드 (R 없이)

## 📋 개요
R이나 SPSS가 설치되지 않은 환경에서 Pyodide 기반 통계 계산 결과를 검증하는 방법을 설명합니다.

## 🔍 검증 방법

### 1. 브라우저 기반 테스트 페이지
```bash
# 개발 서버 실행
cd stats
npm run dev

# 브라우저에서 접속
(페이지 미구현 - Jest 테스트 사용: npm test)
```

**특징:**
- 실시간 통계 계산 실행
- 카테고리별 테스트 (T-test, ANOVA, 상관분석, 회귀분석 등)
- 시각적 결과 비교 (기대값 vs 실제값)
- 통과/실패 상태 표시

### 2. Jest 단위 테스트
```bash
# 모든 통계 테스트 실행
npm test -- __tests__/statistics/

# 온라인 검증 테스트만 실행
npm test -- __tests__/statistics/online-verified.test.ts

# R/SPSS 참조값 테스트 실행
npm test -- __tests__/statistics/r-spss-validation.test.ts
```

### 3. Python scipy 직접 검증
```bash
# Python scipy로 직접 계산 (환경 설정 필요)
cd stats
python verify_statistics.py
```

⚠️ **주의**: Python 환경에 scipy가 올바르게 설치되어 있어야 합니다.

## 🌐 온라인 통계 계산기 신뢰성 평가

### 높은 신뢰도 (★★★★★)

#### 1. **GraphPad QuickCalcs**
- **URL**: https://www.graphpad.com/quickcalcs/
- **제작사**: GraphPad Software (Prism 통계 소프트웨어 개발사)
- **신뢰성**: 매우 높음
- **특징**:
  - 30년 이상의 역사를 가진 과학 통계 소프트웨어 회사
  - 수천 개의 논문에서 인용됨
  - FDA 승인 연구에서 사용
- **지원 테스트**: t-test, Chi-square, 기술통계

#### 2. **NIST/SEMATECH e-Handbook**
- **URL**: https://www.itl.nist.gov/div898/handbook/
- **제작사**: 미국 국립표준기술연구소 (NIST)
- **신뢰성**: 최상급
- **특징**:
  - 미국 정부 공식 통계 참조 자료
  - 표준 데이터셋과 검증된 결과 제공
  - 통계 알고리즘 검증의 표준
- **용도**: 알고리즘 정확도 검증

### 중-높은 신뢰도 (★★★★☆)

#### 3. **Stats Kingdom**
- **URL**: https://www.statskingdom.com/
- **신뢰성**: 높음
- **특징**:
  - 다양한 고급 통계 테스트 지원
  - 상세한 계산 과정 표시
  - 학술 논문에서 자주 인용
- **지원 테스트**: ANOVA, 회귀분석, 비모수 검정

#### 4. **Social Science Statistics**
- **URL**: https://www.socscistatistics.com/
- **신뢰성**: 중-높음
- **특징**:
  - 사회과학 연구에 특화
  - 직관적인 인터페이스
  - 교육용으로 널리 사용
- **지원 테스트**: 다양한 기초 통계

### 중간 신뢰도 (★★★☆☆)

#### 5. **VassarStats**
- **URL**: http://vassarstats.net/
- **제작사**: Vassar College
- **신뢰성**: 중간
- **특징**:
  - 대학 교육용으로 개발
  - 오랜 역사 (1998년부터)
  - 소스 코드 일부 공개
- **지원 테스트**: 기초-중급 통계

## ✅ 신뢰성 검증 체크리스트

### 온라인 계산기 선택 기준
1. **제작 기관의 신뢰성**
   - 대학, 연구소, 정부 기관 > 상업 기업 > 개인

2. **인용 빈도**
   - Google Scholar에서 검색하여 학술 논문 인용 확인

3. **계산 방법 투명성**
   - 사용하는 공식과 알고리즘 명시 여부
   - 소스 코드 공개 여부

4. **교차 검증**
   - 최소 2-3개의 독립적인 계산기로 동일 결과 확인

## 🔬 검증 전략

### 1단계: 기본 검증 (Simple Cases)
```javascript
// 완전히 같은 데이터
const same1 = [1, 2, 3, 4, 5]
const same2 = [1, 2, 3, 4, 5]
// 기대 결과: t = 0, p = 1

// 완전히 다른 데이터
const low = [1, 2, 3, 4, 5]
const high = [100, 101, 102, 103, 104]
// 기대 결과: t > 10, p ≈ 0
```

### 2단계: 표준 데이터셋 검증
- Montgomery 교과서 예제
- Wikipedia 문서화된 예제
- NIST StRD (Statistical Reference Datasets)

### 3단계: 교차 검증
```markdown
GraphPad 결과 == Stats Kingdom 결과 == Pyodide 결과
```

## 📊 검증 결과 기록 템플릿

```markdown
## 테스트: [테스트 이름]
- **데이터**: [입력 데이터]
- **GraphPad 결과**: t = X.XXX, p = X.XXX
- **Stats Kingdom 결과**: t = X.XXX, p = X.XXX
- **Pyodide 결과**: t = X.XXX, p = X.XXX
- **허용 오차**: 0.001 (0.1%)
- **판정**: ✅ 통과 / ❌ 실패
```

## 🚨 주의사항

### 온라인 계산기 한계
1. **반올림 차이**: 계산기마다 소수점 처리 방식이 다름
2. **알고리즘 차이**: 동일한 검정도 구현 방식이 다를 수 있음
3. **가정 차이**: 기본 가정(등분산성 등)이 다를 수 있음

### 권장 사항
1. **다중 소스 검증**: 한 개의 계산기만 믿지 말고 여러 소스 확인
2. **허용 오차 설정**: 0.1% ~ 1% 범위의 오차는 허용
3. **극단값 테스트**: 경계 조건에서도 정확한지 확인
4. **문서화**: 모든 검증 결과를 기록하여 추적 가능하게 유지

## 📚 추가 참고 자료

### 통계 검증 표준
- **NIST StRD**: https://www.itl.nist.gov/div898/strd/
- **R 소스 코드**: https://github.com/wch/r-source
- **SciPy 문서**: https://docs.scipy.org/doc/scipy/

### 학술 자료
- Wilkinson, L. (1999). "Statistical methods in psychology journals"
- McCullough, B.D. (1998). "Assessing the reliability of statistical software"

## 🔄 업데이트 이력

- **2025-01-18**: 초기 문서 작성
- 브라우저 기반 검증 페이지 구현
- 온라인 계산기 신뢰성 평가 추가
- Jest 테스트 환경 구축

---

**작성자**: Statistical Platform 개발팀
**최종 업데이트**: 2025-01-18