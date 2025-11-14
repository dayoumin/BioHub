/**
 * 42개 통계 페이지 자동 테스트 스크립트
 * Playwright를 사용하여 각 통계 페이지의 분석 기능 테스트
 */

const statisticsPages = [
  'ancova',
  'anova',
  'binomial-test',
  'chi-square',
  'chi-square-goodness',
  'chi-square-independence',
  'cluster',
  'cochran-q',
  'correlation',
  'descriptive',
  'discriminant',
  'dose-response',
  'explore-data',
  'factor-analysis',
  'friedman',
  'kruskal-wallis',
  'ks-test',
  'mann-kendall',
  'mann-whitney',
  'manova',
  'mcnemar',
  'means-plot',
  'mixed-model',
  'mood-median',
  'non-parametric',
  'normality-test',
  'one-sample-t',
  'ordinal-regression',
  'partial-correlation',
  'pca',
  'poisson',
  'power-analysis',
  'proportion-test',
  'regression',
  'reliability',
  'response-surface',
  'runs-test',
  'sign-test',
  'stepwise',
  't-test',
  'welch-t',
  'wilcoxon'
];

/**
 * 각 통계별 테스트 데이터 설정
 */
const testDataConfig = {
  // 1. T-Tests (3개)
  't-test': {
    dataType: 'two-groups',
    csvContent: `group,value
A,23.5
A,25.1
A,24.8
A,26.2
A,23.9
A,25.5
A,24.3
A,26.0
A,23.7
A,25.8
B,28.3
B,29.5
B,27.8
B,30.1
B,28.9
B,29.2
B,27.5
B,30.3
B,28.5
B,29.8`,
    variables: { group: 'group', value: 'value' }
  },

  'one-sample-t': {
    dataType: 'single-group',
    csvContent: `value
23.5
25.1
24.8
26.2
23.9
25.5
24.3
26.0
23.7
25.8
24.5
25.3
24.0
26.1
23.8`,
    variables: { variable: 'value' },
    testValue: 25
  },

  'welch-t': {
    dataType: 'two-groups',
    csvContent: `group,value
A,23.5
A,25.1
A,24.8
A,26.2
A,23.9
B,28.3
B,29.5
B,27.8
B,30.1
B,28.9
B,29.2
B,27.5`,
    variables: { group: 'group', value: 'value' }
  },

  // 2. ANOVA (2개)
  'anova': {
    dataType: 'multiple-groups',
    csvContent: `group,value
A,23.5
A,25.1
A,24.8
B,28.3
B,29.5
B,27.8
C,32.1
C,33.5
C,31.8
C,34.2`,
    variables: { factor: 'group', dependent: 'value' }
  },

  'ancova': {
    dataType: 'multiple-groups-covariate',
    csvContent: `group,value,covariate
A,23.5,10.2
A,25.1,11.5
A,24.8,10.8
B,28.3,12.1
B,29.5,13.2
B,27.8,11.9
C,32.1,14.5
C,33.5,15.1
C,31.8,14.2`,
    variables: { factor: 'group', dependent: 'value', covariate: 'covariate' }
  },

  // 3. Chi-Square Tests (3개)
  'chi-square': {
    dataType: 'contingency',
    csvContent: `row,col
A,X
A,X
A,Y
A,Y
B,X
B,Y
B,Y
B,Y`,
    variables: { row: 'row', col: 'col' }
  },

  'chi-square-independence': {
    dataType: 'contingency',
    csvContent: `treatment,outcome
Control,Success
Control,Success
Control,Failure
Treatment,Success
Treatment,Success
Treatment,Success
Treatment,Failure`,
    variables: { row: 'treatment', col: 'outcome' }
  },

  'chi-square-goodness': {
    dataType: 'single-categorical',
    csvContent: `category
A
A
A
B
B
C
C
C
C`,
    variables: { variable: 'category' }
  },

  // 4. Correlation (2개)
  'correlation': {
    dataType: 'numeric-pairs',
    csvContent: `x,y
12.5,23.1
15.2,28.5
13.8,25.2
18.1,32.5
16.5,30.1
14.2,26.8
17.3,31.2
13.5,24.9
16.8,30.5
15.9,29.1`,
    variables: { variable1: 'x', variable2: 'y' }
  },

  'partial-correlation': {
    dataType: 'numeric-triplets',
    csvContent: `x,y,z
12.5,23.1,5.2
15.2,28.5,6.8
13.8,25.2,5.9
18.1,32.5,7.5
16.5,30.1,7.1
14.2,26.8,6.2
17.3,31.2,7.3
13.5,24.9,5.8`,
    variables: { variable1: 'x', variable2: 'y', control: 'z' }
  },

  // 5. Non-parametric Tests (10개)
  'mann-whitney': {
    dataType: 'two-groups',
    csvContent: `group,value
A,15
A,18
A,21
A,17
A,19
B,25
B,28
B,26
B,30
B,27`,
    variables: { group: 'group', value: 'value' }
  },

  'wilcoxon': {
    dataType: 'paired',
    csvContent: `before,after
15,18
18,22
21,24
17,20
19,23
16,19
20,25
14,17`,
    variables: { before: 'before', after: 'after' }
  },

  'kruskal-wallis': {
    dataType: 'multiple-groups',
    csvContent: `group,value
A,15
A,18
A,21
B,25
B,28
B,26
C,35
C,38
C,36`,
    variables: { group: 'group', value: 'value' }
  },

  'friedman': {
    dataType: 'repeated-measures',
    csvContent: `subject,time1,time2,time3
S1,15,18,21
S2,16,19,22
S3,14,17,20
S4,17,20,23
S5,15,18,21`,
    variables: { columns: ['time1', 'time2', 'time3'] }
  },

  'mood-median': {
    dataType: 'multiple-groups',
    csvContent: `group,value
A,15
A,18
A,21
B,25
B,28
B,26
C,35
C,38
C,36`,
    variables: { group: 'group', value: 'value' }
  },

  'sign-test': {
    dataType: 'paired',
    csvContent: `before,after
15,18
18,22
21,24
17,20
19,23
16,19
20,25`,
    variables: { before: 'before', after: 'after' }
  },

  'runs-test': {
    dataType: 'binary-sequence',
    csvContent: `value
A
A
B
B
B
A
A
A
B
B`,
    variables: { variable: 'value' }
  },

  'cochran-q': {
    dataType: 'binary-repeated',
    csvContent: `subject,time1,time2,time3
S1,1,0,1
S2,0,1,1
S3,1,1,0
S4,0,0,1
S5,1,1,1`,
    variables: { columns: ['time1', 'time2', 'time3'] }
  },

  'mcnemar': {
    dataType: 'paired-binary',
    csvContent: `before,after
Yes,Yes
Yes,No
No,Yes
No,No
Yes,Yes
No,Yes
Yes,No`,
    variables: { before: 'before', after: 'after' }
  },

  'ks-test': {
    dataType: 'single-numeric',
    csvContent: `value
23.5
25.1
24.8
26.2
23.9
25.5
24.3
26.0
23.7
25.8`,
    variables: { variable: 'value' }
  },

  // 6. Regression (4개)
  'regression': {
    dataType: 'regression',
    csvContent: `x1,x2,y
12.5,5.2,23.1
15.2,6.8,28.5
13.8,5.9,25.2
18.1,7.5,32.5
16.5,7.1,30.1
14.2,6.2,26.8
17.3,7.3,31.2
13.5,5.8,24.9`,
    variables: { predictors: ['x1', 'x2'], dependent: 'y' }
  },

  'stepwise': {
    dataType: 'regression',
    csvContent: `x1,x2,x3,y
12.5,5.2,8.1,23.1
15.2,6.8,9.5,28.5
13.8,5.9,8.7,25.2
18.1,7.5,10.2,32.5
16.5,7.1,9.8,30.1
14.2,6.2,8.9,26.8`,
    variables: { predictors: ['x1', 'x2', 'x3'], dependent: 'y' }
  },

  'ordinal-regression': {
    dataType: 'ordinal-response',
    csvContent: `x1,x2,y
12.5,5.2,Low
15.2,6.8,Medium
13.8,5.9,Low
18.1,7.5,High
16.5,7.1,Medium
14.2,6.2,Low`,
    variables: { predictors: ['x1', 'x2'], dependent: 'y' }
  },

  'poisson': {
    dataType: 'count-response',
    csvContent: `x1,x2,count
12.5,5.2,3
15.2,6.8,5
13.8,5.9,4
18.1,7.5,8
16.5,7.1,6
14.2,6.2,4`,
    variables: { predictors: ['x1', 'x2'], dependent: 'count' }
  },

  // 7. Multivariate (3개)
  'manova': {
    dataType: 'multivariate',
    csvContent: `group,y1,y2
A,23.5,15.2
A,25.1,16.8
A,24.8,16.1
B,28.3,18.5
B,29.5,19.2
B,27.8,18.1`,
    variables: { factor: 'group', dependents: ['y1', 'y2'] }
  },

  'pca': {
    dataType: 'multivariate-numeric',
    csvContent: `x1,x2,x3,x4
12.5,5.2,8.1,15.3
15.2,6.8,9.5,18.2
13.8,5.9,8.7,16.5
18.1,7.5,10.2,21.3
16.5,7.1,9.8,19.8
14.2,6.2,8.9,17.2`,
    variables: { variables: ['x1', 'x2', 'x3', 'x4'] }
  },

  'factor-analysis': {
    dataType: 'multivariate-numeric',
    csvContent: `x1,x2,x3,x4,x5
12.5,5.2,8.1,15.3,9.2
15.2,6.8,9.5,18.2,11.5
13.8,5.9,8.7,16.5,10.1
18.1,7.5,10.2,21.3,13.8
16.5,7.1,9.8,19.8,12.5
14.2,6.2,8.9,17.2,10.8`,
    variables: { variables: ['x1', 'x2', 'x3', 'x4', 'x5'] }
  },

  // 8. 기타 (15개)
  'descriptive': {
    dataType: 'numeric',
    csvContent: `value
23.5
25.1
24.8
26.2
23.9
25.5
24.3
26.0
23.7
25.8`,
    variables: { variables: ['value'] }
  },

  'normality-test': {
    dataType: 'numeric',
    csvContent: `value
23.5
25.1
24.8
26.2
23.9
25.5
24.3
26.0
23.7
25.8
24.5
25.3
24.0
26.1
23.8`,
    variables: { variable: 'value' }
  },

  'binomial-test': {
    dataType: 'binary',
    csvContent: `outcome
Success
Success
Success
Success
Failure
Failure
Success
Success`,
    variables: { variable: 'outcome' }
  },

  'proportion-test': {
    dataType: 'two-proportions',
    csvContent: `group,outcome
A,Success
A,Success
A,Failure
A,Success
B,Success
B,Failure
B,Failure
B,Success`,
    variables: { group: 'group', outcome: 'outcome' }
  },

  'power-analysis': {
    dataType: 'parameters-only',
    parameters: {
      effectSize: 0.5,
      alpha: 0.05,
      power: 0.8
    }
  },

  'cluster': {
    dataType: 'multivariate-numeric',
    csvContent: `x1,x2
12.5,5.2
15.2,6.8
13.8,5.9
18.1,7.5
16.5,7.1
14.2,6.2
25.3,15.1
28.5,17.2
26.8,16.5`,
    variables: { variables: ['x1', 'x2'] }
  },

  'discriminant': {
    dataType: 'classification',
    csvContent: `group,x1,x2
A,12.5,5.2
A,15.2,6.8
A,13.8,5.9
B,18.1,7.5
B,16.5,7.1
B,14.2,6.2`,
    variables: { group: 'group', predictors: ['x1', 'x2'] }
  },

  'reliability': {
    dataType: 'items',
    csvContent: `item1,item2,item3,item4
4,5,4,5
5,4,5,4
3,3,4,3
4,4,4,4
5,5,5,5`,
    variables: { items: ['item1', 'item2', 'item3', 'item4'] }
  },

  'mann-kendall': {
    dataType: 'time-series',
    csvContent: `time,value
1,23.5
2,25.1
3,24.8
4,26.2
5,23.9
6,25.5
7,26.8
8,27.2`,
    variables: { time: 'time', value: 'value' }
  },

  'means-plot': {
    dataType: 'grouped-numeric',
    csvContent: `group,value
A,23.5
A,25.1
A,24.8
B,28.3
B,29.5
B,27.8
C,32.1
C,33.5
C,31.8`,
    variables: { group: 'group', value: 'value' }
  },

  'explore-data': {
    dataType: 'multivariate-numeric',
    csvContent: `x1,x2,x3
12.5,5.2,8.1
15.2,6.8,9.5
13.8,5.9,8.7
18.1,7.5,10.2
16.5,7.1,9.8
14.2,6.2,8.9`,
    variables: { variables: ['x1', 'x2', 'x3'] }
  },

  'dose-response': {
    dataType: 'dose-response',
    csvContent: `dose,response
0,0.1
1,0.3
2,0.5
5,0.8
10,0.95
20,0.99`,
    variables: { dose: 'dose', response: 'response' }
  },

  'response-surface': {
    dataType: 'response-surface',
    csvContent: `x1,x2,response
1,1,10.5
1,2,12.3
2,1,15.8
2,2,18.5
3,1,20.2
3,2,23.5`,
    variables: { factors: ['x1', 'x2'], response: 'response' }
  },

  'mixed-model': {
    dataType: 'hierarchical',
    csvContent: `subject,group,time,value
S1,A,1,23.5
S1,A,2,25.1
S2,A,1,24.8
S2,A,2,26.2
S3,B,1,28.3
S3,B,2,29.5`,
    variables: { subject: 'subject', group: 'group', time: 'time', value: 'value' }
  },

  'non-parametric': {
    dataType: 'numeric',
    csvContent: `value
15
18
21
17
19
25
28
26`,
    variables: { variable: 'value' }
  }
};

module.exports = {
  statisticsPages,
  testDataConfig
};