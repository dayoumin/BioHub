# Result Interpretation Refactor Plan

## 목표
- 목적/분석 방법에 따른 해석을 한 곳에서 관리하는 엔진화.
- UI(ResultsActionStep 등)와 해석 로직 분리로 유지보수/확장 용이.
- 가드/유효성 검사로 잘못된(0 기본값 등) 문구 노출 방지.

## 현황 문제
- 목적별 패널이 비교/상관/예측 3가지에 한정, 다른 통계는 미노출.
- 해석 로직이 UI 파일에 흩어져 있어 수정 시 위험·중복 발생.
- 멀티그룹, 로지스틱/분류, 카이제곱, 비모수, 생존 등 미커버 영역 존재.
- 일부 문자열/인코딩 깨짐으로 가독성 저하.

## 제안 아키텍처
1) 중앙 엔진 모듈 (예: `lib/interpretation/engine.ts`):
   - 입력: `AnalysisResult`, 선택적 `purpose`.
   - 출력: `{ title, summary, statistical, practical } | null`.
2) 매퍼/라우터:
   - 우선순위: 명시 `purpose` → `results.method` 패턴 매칭 → fallback 기본.
   - 매핑 테이블 예시:  
     - `group-two`: t-test, two-sample, mann-whitney  
     - `group-multi`: anova, kruskal  
     - `chi-square`: chi, 카이  
     - `correlation`: pearson, spearman, kendall  
     - `regression-linear`, `regression-logistic`  
     - `classification`: accuracy/auc/f1 보유 시  
     - `clustering`: silhouette/cluster count  
     - `reliability`: alpha  
     - `survival`(옵션)  
     - `fallback`
3) 타입별 해석기 (순수 함수):
   - 유효성 체크 후 null 반환(패널 숨김).
   - 숫자 클램핑/포맷팅(예: r ∈ [-1,1], p-value 문구).
   - 다중 그룹: 최댓/최솟 평균, 범위, 유의 그룹 수 요약.
   - 회귀: 주요 예측변수 상위 N개, R²/AdjR², 로지스틱이면 OR·AUC/정확도.
   - 분류: accuracy/precision/recall/F1/AUC, 혼동행렬 요약(선택).
   - 카이제곱: df, 기대빈도 검토, 독립성/적합도 결론.
4) 템플릿/문구:
   - 한글 기본, 필요 시 영어 번역 테이블 별도 분리.
   - 공통 유틸: `interpretPValue`, `interpretEffectSize`, 숫자 포맷 helper.
5) UI 연동:
   - ResultsActionStep에서 `getInterpretation(results, purpose)` 호출로 교체.
   - 데이터 부족 시 패널 미노출 유지.

## 단계별 실행 계획
1. 스켈레톤/타입 정의 & 매핑 테이블 초안 작성 (0.5d)  
2. 핵심 핸들러 구현: group-two, group-multi, correlation, regression-linear/logistic, classification, chi-square (1.0d)  
3. UI 연결 및 기존 해석 로직 제거/치환, 한글 문자열 정리 (0.5d)  
4. 테스트: 타입별 단위 테스트 + ResultsActionStep 통합 스냅샷 갱신 (0.5d)  
5. 선택 추가: clustering/reliability/survival handler, 영어 템플릿 (0.5d)  
총 2.5~3.0d 예상 (핵심 범위 기준).

## 난이도/리스크
- 난이도: 중간. 기존 데이터 구조(`AnalysisResult`)를 그대로 사용하므로 API 변경은 적음.
- 리스크: method 문자열 다양성, 누락된 필드로 인한 null 처리 필요. 테스트로 커버 필요.
- 문자열/인코딩 정리 병행해 가독성 확보.

## LLM 연계 여부
- 장점: 드물게 등장하는 방법/결과를 유연하게 설명, 서술형 요약 품질 향상.
- 단점: 응답 일관성/결정성 부족, 레이턴시·비용 증가, 프롬프트 관리 필요. 데이터 외부 전송 이슈.
- 구현 난이도: 중간~높음. 안전 가드, 토큰/비용 관리, 실패 시 룰 기반 fallback 필요.
- 현실적 제안: 1) 룰 기반 엔진을 기본으로 먼저 완성. 2) 옵션 플래그로 LLM 해석을 추가(비핵심). 3) LLM은 “미지원/희귀 통계 방법”일 때만 호출하도록 제한.

## 권장 우선순위
1) 룰 기반 엔진화 + 다중 타입 커버리지 확장 → 단기 안정성 확보.  
2) 템플릿/문구 정리 및 다국어 분리.  
3) 필요 시 LLM 보조 해석을 옵트인으로 추가.  

## 산출물
- `lib/interpretation/engine.ts` (핵심 엔진)
- `lib/interpretation/mapping.ts` (매핑 테이블)
- `lib/interpretation/handlers/*.ts` (타입별 해석기)
- `__tests__/interpretation-engine.test.ts` (단위/스냅샷)
- `components/smart-flow/steps/ResultsActionStep.tsx` 연동 수정

---

## 커버리지 & 데이터 계약 체크리스트
| 타입 | 필요 필드/조건 | 출력 요약 포인트 |
| --- | --- | --- |
| group-two | groupStats length >= 2, pValue, effectSize? | 두 그룹 평균/차이, p-value 해석, 효과크기 |
| group-multi | groupStats length >= 3, pValue | 최댓/최솟 평균, 범위, 유의 그룹 수 |
| chi-square (독립/적합도) | statistic, pValue, df, expected? | 독립성/적합도 결론, 기대빈도 부족 경고(optional) |
| correlation (pearson/spearman/kendall) | statistic(r), pValue | 부호/강도, r^2 %, r 클램핑 |
| regression-linear | coefficients, pValue, additional.rSquared? | 주요 예측변수 계수/부호, R^2/AdjR^2 |
| regression-logistic | coefficients, odds ratio 변환, accuracy/AUC? | OR 요약, 모델 적합도, 분류 성능 요약 |
| classification | accuracy/precision/recall/F1/rocAuc/confusionMatrix | 핵심 지표 요약, 클래스 불균형 언급(optional) |
| clustering | silhouetteScore, clusters | 실루엣, 군집 수 |
| reliability | alpha | 신뢰도 구간화 메시지 |
| survival (옵션) | hazard ratio/log-rank p | HR/신뢰구간, p-value |
| fallback | interpretation, pValue?, effectSize? | 기본 p-value/효과크기 해석 |

## 포맷팅/가드 규칙
- r 클램핑: [-1, 1], |r|<0.05 → “상관 없음” 처리.
- p-value: NaN/undefined 시 해석하지 않고 null 반환; 표시 형식 `< 0.001` / `0.123`.
- 기본값 0 사용 금지: 필드 부재 시 null 반환해 패널 숨김.
- 숫자 포맷 helper: 소수 자리수, 퍼센트 변환, 부호(+/-) 표기 통일.
- 문자열 인코딩/한글 깨짐 제거 후 정규화.

## 멀티그룹 요약 방안
- groupStats 3개 이상: 최고/최저 평균, 범위, 샘플 수 표시.
- 유의성: p<0.05이면 “집단 간 차이 있음”; 추가로 postHoc 존재 시 유의 쌍 개수 요약(선택).
- 2개만 있을 때는 기존 요약 유지.

## 회귀/분류 분기
- 선형 회귀: 상위 예측변수 N개(기본 1~3) 계수+부호, R^2/AdjR^2.
- 로지스틱 회귀: 계수를 OR로 변환, 95% CI(가능 시), accuracy/AUC 표시.
- 분류 모델: accuracy/precision/recall/F1/rocAuc, 혼동행렬 요약(선택), 클래스 불균형 경고(optional).

## 테스트 계획 (예시 케이스)
- group-two: 유의/비유의, 효과크기 있음/없음.
- group-multi: 3+그룹, p<0.05, postHoc 있음/없음.
- correlation: r=0.7/-0.4/0, p 유의/비유의, r 클램핑.
- regression-linear: 계수 있음/없음, R^2 있음/없음.
- regression-logistic: OR 변환, AUC 있음/없음.
- classification: accuracy/AUC 제공, 혼동행렬 제공/없음.
- chi-square: 유의/비유의, df 제공/없음.
- clustering: silhouette 제공/없음.
- reliability: alpha 구간별 메시지.
- fallback: purpose 미매칭, 필드 부족 시 null.

## 롤아웃/플래그
- feature flag로 신/구 해석 엔진 전환 가능하게 하고, 단계적 적용.
- 로깅 옵션: 어떤 handler가 선택되었는지 기록(디버그용).

## LLM 활용 가이드 (옵션)
- 기본은 룰 기반 엔진. LLM은 “미지원/희귀 method” 등에서만 옵트인 호출.
- 실패/지연 시 즉시 룰 기반 fallback.
- 프롬프트/토큰 가드, 비용/레이턴시 모니터링 필요.
