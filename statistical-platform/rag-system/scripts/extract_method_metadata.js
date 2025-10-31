#!/usr/bin/env node

/**
 * method-metadata.ts 문서화 스크립트
 * 목적: TypeScript 메서드 메타데이터를 Markdown으로 변환
 */

const fs = require('fs');
const path = require('path');

// 경로 설정
const scriptDir = __dirname;
const metadataPath = path.join(scriptDir, '../../lib/statistics/registry/method-metadata.ts');
const outputDir = path.join(scriptDir, '../data/project');
const outputPath = path.join(outputDir, 'statistical_methods.md');

// 출력 디렉토리 생성
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🚀 method-metadata.ts 문서화 시작');
console.log('='.repeat(60));

// TypeScript 파일 읽기
const tsContent = fs.readFileSync(metadataPath, 'utf-8');

// 간단한 정규식 파싱 (TypeScript 컴파일러 없이)
// METHOD_METADATA 객체 추출
const methodMetadataMatch = tsContent.match(/export const METHOD_METADATA[^{]*{([^}]+(?:}[^}]+)*?)}\s*;/s);

if (!methodMetadataMatch) {
    console.error('❌ METHOD_METADATA를 찾을 수 없습니다');
    process.exit(1);
}

const metadataContent = methodMetadataMatch[1];

// 메서드별로 파싱
const methodRegex = /(\w+):\s*{\s*group:\s*'([^']+)',\s*deps:\s*\[([^\]]+)\],\s*estimatedTime:\s*([\d.]+)\s*}/g;

const methods = [];
let match;

while ((match = methodRegex.exec(metadataContent)) !== null) {
    const [, name, group, depsStr, time] = match;
    const deps = depsStr.split(',').map(d => d.trim().replace(/['"]/g, ''));

    methods.push({
        name,
        group,
        deps,
        estimatedTime: parseFloat(time)
    });
}

console.log(`\n[PARSE] method-metadata.ts`);
console.log(`  메서드 개수: ${methods.length}`);

// 그룹별로 분류
const groupMap = {
    'descriptive': { name: 'Descriptive Statistics', worker: 'Worker 1', methods: [] },
    'hypothesis': { name: 'Hypothesis Testing', worker: 'Worker 2', methods: [] },
    'nonparametric': { name: 'Nonparametric Tests', worker: 'Worker 3', methods: [] },
    'anova': { name: 'ANOVA', worker: 'Worker 3', methods: [] },
    'regression': { name: 'Regression Analysis', worker: 'Worker 4', methods: [] },
    'advanced': { name: 'Advanced Analytics', worker: 'Worker 4', methods: [] }
};

methods.forEach(method => {
    if (groupMap[method.group]) {
        groupMap[method.group].methods.push(method);
    }
});

// Markdown 생성
const today = new Date().toISOString().split('T')[0];

let markdown = `---
title: Statistical Methods Metadata
source: lib/statistics/registry/method-metadata.ts
type: Project Internal Documentation
license: MIT
crawled_date: ${today}
---

# Statistical Methods Metadata

**파일**: \`lib/statistics/registry/method-metadata.ts\`
**총 메서드 개수**: ${methods.length}

이 문서는 통계 플랫폼의 60개 통계 메서드 메타데이터를 정리한 것입니다.

---

## 📋 메서드 그룹별 분류

`;

// 그룹별로 테이블 생성
for (const [groupKey, groupInfo] of Object.entries(groupMap)) {
    if (groupInfo.methods.length === 0) continue;

    markdown += `\n### ${groupInfo.name} (${groupInfo.worker})\n\n`;
    markdown += `**메서드 개수**: ${groupInfo.methods.length}\n\n`;
    markdown += `| 메서드 ID | 의존성 패키지 | 예상 실행 시간 (초) |\n`;
    markdown += `|-----------|---------------|--------------------|\n`;

    groupInfo.methods.forEach(method => {
        const deps = method.deps.join(', ');
        markdown += `| \`${method.name}\` | ${deps} | ${method.estimatedTime} |\n`;
    });

    markdown += `\n`;
}

// 전체 메서드 목록 (알파벳 순)
markdown += `\n---\n\n## 📚 전체 메서드 목록 (알파벳 순)\n\n`;
markdown += `| 메서드 ID | 그룹 | Worker | 의존성 | 예상 시간 |\n`;
markdown += `|-----------|------|--------|--------|----------|\n`;

methods.sort((a, b) => a.name.localeCompare(b.name));

methods.forEach(method => {
    const group = groupMap[method.group];
    const groupName = group ? group.name : method.group;
    const worker = group ? group.worker : 'Unknown';
    const deps = method.deps.join(', ');

    markdown += `| \`${method.name}\` | ${groupName} | ${worker} | ${deps} | ${method.estimatedTime}s |\n`;
});

// 의존성 패키지 통계
markdown += `\n---\n\n## 📦 의존성 패키지 통계\n\n`;

const depsCount = {};
methods.forEach(method => {
    method.deps.forEach(dep => {
        depsCount[dep] = (depsCount[dep] || 0) + 1;
    });
});

markdown += `| 패키지 | 사용 메서드 수 | 비율 |\n`;
markdown += `|--------|---------------|------|\n`;

Object.entries(depsCount)
    .sort(([, a], [, b]) => b - a)
    .forEach(([pkg, count]) => {
        const percentage = ((count / methods.length) * 100).toFixed(1);
        markdown += `| \`${pkg}\` | ${count} | ${percentage}% |\n`;
    });

// 파일 저장
fs.writeFileSync(outputPath, markdown, 'utf-8');

console.log(`  ✅ 저장: ${outputPath}`);

console.log('\n' + '='.repeat(60));
console.log('📋 요약');
console.log('='.repeat(60));
console.log(`총 메서드: ${methods.length}`);
console.log(`그룹 수: ${Object.keys(groupMap).length}`);
console.log(`의존성 패키지: ${Object.keys(depsCount).join(', ')}`);
console.log('\n✅ method-metadata.ts 문서화 완료!');
