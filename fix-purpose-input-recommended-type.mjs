import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:/Projects/Statics/statistical-platform/components/smart-flow/steps/PurposeInputStep.tsx';

// UTF-8로 읽기
let content = readFileSync(filePath, 'utf8');

// recommendedType 로직 개선
const oldLogic = `      recommendedType: data.length >= 30 ? ('parametric' as const) : ('nonparametric' as const)`;

const newLogic = `      recommendedType: (() => {
        const n = data.length

        // 1. 소표본 (n < 30) → 무조건 비모수
        if (n < 30) return 'nonparametric' as const

        // 2. 대표본이지만 가정 검정 결과가 있으면 그것 우선
        if (assumptionResults?.summary?.canUseParametric !== undefined) {
          return assumptionResults.summary.canUseParametric ? 'parametric' as const : 'nonparametric' as const
        }

        // 3. 가정 검정 없음 → 보수적 접근 (비모수 권장)
        // 이유: n≥30이어도 데이터가 심하게 비대칭이거나 이상치가 많을 수 있음
        return 'nonparametric' as const
      })()`;

content = content.replace(oldLogic, newLogic);

// UTF-8로 쓰기
writeFileSync(filePath, content, 'utf8');

console.log('✅ PurposeInputStep.tsx 수정 완료 (recommendedType 로직 개선)');
