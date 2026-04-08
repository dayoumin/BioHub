/**
 * SelectorType — 변수 선택기 유형
 *
 * 각 통계 메서드가 사용하는 UI 변수 선택기 패턴.
 * method-registry.ts에서 메서드별 매핑, slot-configs.ts에서 슬롯 구성에 사용.
 */
export type SelectorType =
  | 'one-sample'
  | 'two-way-anova'
  | 'correlation'
  | 'paired'
  | 'multiple-regression'
  | 'group-comparison'
  | 'chi-square'
  | 'repeated-measures'
  | 'manova'
  | 'survival'
  | 'time-series'
  | 'mixed-model'
  | 'discriminant'
  | 'roc-curve'
  | 'auto'
  | 'default'
