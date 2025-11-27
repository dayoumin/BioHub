
export interface AlternativeTest {
    name: string
    route: string
    reason: string
}

export const alternativeMap: Record<string, AlternativeTest[]> = {
    't-test': [
        { name: 'Mann-Whitney U', route: '/statistics/mann-whitney', reason: '정규성 위반 시 (비모수 검정)' },
        { name: "Welch's t-test", route: '/statistics/welch-t', reason: '등분산성 위반 시' }
    ],
    'paired-t-test': [
        { name: 'Wilcoxon Signed-Rank', route: '/statistics/wilcoxon', reason: '정규성 위반 시 (비모수 검정)' }
    ],
    'anova': [
        { name: 'Kruskal-Wallis', route: '/statistics/kruskal-wallis', reason: '정규성 위반 시 (비모수 검정)' },
        { name: "Welch's ANOVA", route: '/statistics/welch-anova', reason: '등분산성 위반 시' }
    ],
    'repeated-measures-anova': [
        { name: 'Friedman Test', route: '/statistics/friedman', reason: '정규성/구형성 위반 시 (비모수 검정)' }
    ],
    'pearson-correlation': [
        { name: 'Spearman Correlation', route: '/statistics/spearman', reason: '정규성 위반 시 (순위 상관계수)' },
        { name: 'Kendall\'s Tau', route: '/statistics/kendall', reason: '표본이 작거나 동점이 많을 때' }
    ],
    'linear-regression': [
        { name: 'Robust Regression', route: '/statistics/robust-regression', reason: '이상치 영향이 클 때' },
        { name: 'Generalized Linear Model', route: '/statistics/glm', reason: '오차항의 정규성 위반 시' }
    ]
}

export function getAlternatives(testType: string): AlternativeTest[] {
    // Normalize test type string (lowercase, remove spaces/hyphens if needed for matching)
    const normalizedKey = Object.keys(alternativeMap).find(key =>
        key.toLowerCase().replace(/[\s_]/g, '-') === testType.toLowerCase().replace(/[\s_]/g, '-')
    )

    return normalizedKey ? alternativeMap[normalizedKey] : []
}
