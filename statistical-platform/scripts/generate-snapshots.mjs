/**
 * 스냅샷 JSON 파일 자동 생성 스크립트
 *
 * 사용법: node scripts/generate-snapshots.mjs
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 통계별 설정 (우선순위 높음 나머지 8개)
const statsConfig = [
  {
    filename: 'kruskal-wallis',
    method: 'Kruskal-Wallis Test',
    title: '다집단 비교 결과',
    summary: '3개 이상 그룹의 중앙값 차이를 검정했습니다.',
    scenarios: [
      { pValue: 0.003, statistical: '통계적으로 유의한 차이가 있습니다 (p=0.003).', practical: '사후 검정을 수행하여 어느 그룹이 다른지 확인하세요.' },
      { pValue: 0.312, statistical: '통계적으로 유의한 차이가 없습니다 (p=0.312).', practical: '모든 그룹의 중앙값이 유사합니다.' },
      { pValue: 0.047, statistical: '통계적으로 유의한 차이가 있습니다 (p=0.047).', practical: '사후 검정을 수행하여 어느 그룹이 다른지 확인하세요.' }
    ]
  },
  {
    filename: 'friedman',
    method: 'Friedman Test',
    title: '반복측정 비모수 검정',
    summary: '동일 개체에서 3회 이상 측정한 값의 중앙값 차이를 검정했습니다.',
    scenarios: [
      { pValue: 0.007, statistical: '측정 시점 간 통계적으로 유의한 차이가 있습니다 (p=0.007).', practical: '사후 검정을 통해 어느 시점이 다른지 확인하세요.' },
      { pValue: 0.421, statistical: '측정 시점 간 통계적으로 유의한 차이가 없습니다 (p=0.421).', practical: '측정 시점에 따른 유의한 변화가 없습니다.' },
      { pValue: 0.049, statistical: '측정 시점 간 통계적으로 유의한 차이가 있습니다 (p=0.049).', practical: '사후 검정을 통해 어느 시점이 다른지 확인하세요.' }
    ]
  },
  {
    filename: 'chi-square',
    method: 'Chi-Square Test',
    title: '범주형 변수 연관성 검정',
    summary: '두 범주형 변수 간 독립성을 검정했습니다.',
    scenarios: [
      { pValue: 0.001, statistical: '두 변수 간 통계적으로 유의한 연관성이 있습니다 (p=< 0.001).', practical: '두 변수가 서로 독립적이지 않습니다.' },
      { pValue: 0.567, statistical: '두 변수 간 통계적으로 유의한 연관성이 없습니다 (p=0.567).', practical: '두 변수는 서로 독립적입니다.' },
      { pValue: 0.048, statistical: '두 변수 간 통계적으로 유의한 연관성이 있습니다 (p=0.048).', practical: '두 변수가 서로 독립적이지 않습니다.' }
    ]
  },
  {
    filename: 'mcnemar',
    method: 'McNemar Test',
    title: '범주형 변수 연관성 검정',
    summary: '두 범주형 변수 간 독립성을 검정했습니다.',
    scenarios: [
      { pValue: 0.005, statistical: '두 변수 간 통계적으로 유의한 연관성이 있습니다 (p=0.005).', practical: '두 변수가 서로 독립적이지 않습니다.' },
      { pValue: 0.432, statistical: '두 변수 간 통계적으로 유의한 연관성이 없습니다 (p=0.432).', practical: '두 변수는 서로 독립적입니다.' },
      { pValue: 0.046, statistical: '두 변수 간 통계적으로 유의한 연관성이 있습니다 (p=0.046).', practical: '두 변수가 서로 독립적이지 않습니다.' }
    ]
  },
  {
    filename: 'linear-regression',
    method: 'Linear Regression',
    title: '예측 모델 결과',
    summary: '선형 회귀 모델을 적합했습니다.',
    scenarios: [
      { pValue: 0.001, rSquared: 0.75, statistical: '모델이 통계적으로 유의합니다 (p=< 0.001).', practical: '모델의 설명력이 높습니다 (R²=75.0%).' },
      { pValue: 0.234, rSquared: 0.12, statistical: '모델이 통계적으로 유의하지 않습니다 (p=0.234).', practical: '모델의 설명력이 낮습니다 (R²=12.0%).' },
      { pValue: 0.048, rSquared: 0.42, statistical: '모델이 통계적으로 유의합니다 (p=0.048).', practical: '모델의 설명력이 중간입니다 (R²=42.0%).' }
    ]
  },
  {
    filename: 'logistic-regression',
    method: 'Logistic Regression',
    title: '예측 모델 결과',
    summary: '로지스틱 회귀 모델을 적합했습니다.',
    scenarios: [
      { pValue: 0.002, rSquared: 0.68, statistical: '모델이 통계적으로 유의합니다 (p=0.002).', practical: '모델의 설명력이 높습니다 (Pseudo R²=68.0%).' },
      { pValue: 0.321, rSquared: 0.15, statistical: '모델이 통계적으로 유의하지 않습니다 (p=0.321).', practical: '모델의 설명력이 낮습니다 (Pseudo R²=15.0%).' },
      { pValue: 0.049, rSquared: 0.38, statistical: '모델이 통계적으로 유의합니다 (p=0.049).', practical: '모델의 설명력이 중간입니다 (Pseudo R²=38.0%).' }
    ]
  },
  {
    filename: 'shapiro-wilk',
    method: 'Shapiro-Wilk Test',
    title: '정규성 검정 결과',
    summary: '데이터가 정규분포를 따르는지 검정했습니다.',
    scenarios: [
      { pValue: 0.001, statistical: '정규성 가정을 만족하지 않습니다 (p=< 0.001).', practical: '비모수 검정(Mann-Whitney, Kruskal-Wallis 등) 사용을 권장합니다.' },
      { pValue: 0.421, statistical: '정규성 가정을 만족합니다 (p=0.421).', practical: '모수 검정(t-test, ANOVA 등) 사용이 적절합니다.' },
      { pValue: 0.048, statistical: '정규성 가정을 만족하지 않습니다 (p=0.048).', practical: '비모수 검정(Mann-Whitney, Kruskal-Wallis 등) 사용을 권장합니다.' }
    ]
  },
  {
    filename: 'levene',
    method: 'Levene Test',
    title: '등분산성 검정 결과',
    summary: '그룹 간 분산이 동일한지 검정했습니다.',
    scenarios: [
      { pValue: 0.002, statistical: '등분산 가정을 만족하지 않습니다 (p=0.002).', practical: "Welch's t-test 또는 비모수 검정 사용을 권장합니다." },
      { pValue: 0.512, statistical: '등분산 가정을 만족합니다 (p=0.512).', practical: '일반 t-test 또는 ANOVA 사용이 적절합니다.' },
      { pValue: 0.047, statistical: '등분산 가정을 만족하지 않습니다 (p=0.047).', practical: "Welch's t-test 또는 비모수 검정 사용을 권장합니다." }
    ]
  }
];

// JSON 파일 생성
statsConfig.forEach(config => {
  const snapshotData = {
    method: config.method,
    scenarios: [
      {
        name: 'significant-strong-effect',
        description: `유의한 결과 (p=${config.scenarios[0].pValue})`,
        input: {
          method: config.method,
          statistic: 10.5,
          pValue: config.scenarios[0].pValue,
          ...(config.scenarios[0].rSquared && { additional: { rSquared: config.scenarios[0].rSquared } })
        },
        expectedOutput: {
          title: config.title,
          summary: config.summary,
          statistical: config.scenarios[0].statistical,
          practical: config.scenarios[0].practical
        }
      },
      {
        name: 'nonsignificant-weak-effect',
        description: `유의하지 않은 결과 (p=${config.scenarios[1].pValue})`,
        input: {
          method: config.method,
          statistic: 1.8,
          pValue: config.scenarios[1].pValue,
          ...(config.scenarios[1].rSquared && { additional: { rSquared: config.scenarios[1].rSquared } })
        },
        expectedOutput: {
          title: config.title,
          summary: config.summary,
          statistical: config.scenarios[1].statistical,
          practical: config.scenarios[1].practical
        }
      },
      {
        name: 'boundary-case-p-near-0.05',
        description: `경계값 (p=${config.scenarios[2].pValue})`,
        input: {
          method: config.method,
          statistic: 4.2,
          pValue: config.scenarios[2].pValue,
          ...(config.scenarios[2].rSquared && { additional: { rSquared: config.scenarios[2].rSquared } })
        },
        expectedOutput: {
          title: config.title,
          summary: config.summary,
          statistical: config.scenarios[2].statistical,
          practical: config.scenarios[2].practical
        }
      }
    ]
  };

  const outputPath = join(__dirname, '..', '__tests__', 'lib', 'interpretation', 'snapshots', `${config.filename}.json`);
  writeFileSync(outputPath, JSON.stringify(snapshotData, null, 2), 'utf8');
  console.log(`✅ Created: ${config.filename}.json`);
});

console.log('\n🎉 Total: 8 snapshot files created!');
