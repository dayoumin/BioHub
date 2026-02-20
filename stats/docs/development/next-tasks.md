# 다음 작업 목록

## 📅 작성일: 2025-09-22
## 🎯 현재 상태: 41개 통계 메서드 구현 완료 (8개 카테고리)

## ✅ Week 4에서 완료된 작업

### 통계 메서드 확장 (39→41개)
- ✅ welchTTest: Welch t-검정 구현
- ✅ oneSampleProportionTest: 일표본 비율검정 (Wilson Score Interval)
- ✅ partialCorrelation: 편상관분석
- ✅ effectSize: Cohen's d, eta², Cohen's h
- ✅ mixedEffectsModel: 혼합효과모형
- ✅ sarimaForecast: SARIMA 예측
- ✅ varModel: VAR 모형
- ✅ coxRegression: Cox 회귀분석

### 카테고리 재구성 (6→8개)
- ✅ 기초통계 (5개), 가설검정 (8개), 분산분석 (8개)
- ✅ 회귀분석 (4개), 비모수검정 (6개)
- ✅ 시계열분석 (4개), 생존분석 (2개), 다변량/기타 (4개)
- ✅ 8개 카테고리 탭 한 줄 표시 (grid-cols-8)

### 코드 품질 개선
- ✅ 비율검정 UI 파라미터 구성 (StatisticalAnalysisTemplate)
- ✅ 매직 넘버 제거 (constants.ts)
- ✅ 포맷터 함수 통합 (formatters.ts)
- ✅ Dynamic import 성능 최적화

### 문서화
- ✅ STATISTICAL_METHODS_COMPLETE_GUIDE.md 업데이트 (41개)
- ✅ PROJECT_STATUS.md 업데이트
- ✅ implementation-status.md 업데이트

## 📋 다음 작업 (Week 5 계획)

### 1. 데이터 처리 강화 ⭐
- 대용량 데이터 처리 최적화 (Web Worker)
- 실시간 프로그레스 표시
- 메모리 효율성 개선
- 스트리밍 데이터 처리

### 2. 통계 결과 시각화 강화
- 인터랙티브 차트 (Plotly/D3.js)
- 히트맵, 박스플롯 추가
- 결과 내보내기 기능 (PNG, SVG, PDF)
- 대시보드 뷰 구현

### 3. 테스트 커버리지 확대
- 41개 모든 메서드 E2E 테스트
- 통계 결과 정확도 검증 (R/SPSS 비교)
- 성능 벤치마크 테스트
- 시각화 컴포넌트 테스트

### 4. 사용자 경험 개선
- 통계 메서드 추천 시스템
- 분석 히스토리 기능
- 협업 기능 (결과 공유, 코멘트)
- 튜토리얼 및 가이드 모드

### 5. 성능 최적화
- Pyodide 캐싱 전략
- 비동기 처리 개선
- 코드 스플리팅 최적화
- 번들 사이즈 최소화

### 6. 고급 기능 구현
- 머신러닝 모델 통합 (scikit-learn)
- 자동 보고서 생성
- 배치 분석 기능
- API 엔드포인트 구축

## 🔍 검증 항목
- ✅ 8개 카테고리 탭 한 줄 표시
- ✅ 41개 모든 메서드 라우팅 정상
- ✅ 비율검정 UI 파라미터 작동
- ✅ 테스트 데이터 로드 성공
- ✅ 통계 계산 결과 정확도
- [ ] 대용량 데이터 처리 테스트 (10MB+)
- [ ] 동시 다중 분석 테스트
- [ ] 모바일 반응형 테스트

## 📝 참고사항

### 기술적 부채
1. **advanced.ts 파일 분리 필요** (990줄)
   - timeseries.ts, survival.ts, multivariate.ts로 분리

2. **테스트 데이터 관리**
   - TEST_DATA_PATHS를 ui-config.ts로 통합 검토

3. **에러 처리 개선**
   - 사용자 친화적 에러 메시지
   - 에러 복구 메커니즘

### 장기 목표
- Tauri 데스크톱 앱 패키징
- 클라우드 배포 (Vercel/AWS)
- 다국어 지원 (영어, 일본어)
- 플러그인 시스템 구축

## 📊 성과 지표
- **구현 완료**: 41/41 메서드 (100%)
- **테스트 커버리지**: 라우팅 테스트 완료
- **문서화**: 주요 가이드 3개 완료
- **코드 품질**: TypeScript strict mode, ESLint 준수

---

*Next Sprint: Week 5 (2025-09-23~29)*
*Focus: 데이터 처리 강화 & 시각화 개선*