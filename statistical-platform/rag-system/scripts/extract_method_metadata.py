#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
method-metadata.ts 문서화 스크립트
목적: TypeScript 메서드 메타데이터를 Markdown으로 변환
"""

import sys
import io
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Windows UTF-8 encoding fix
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def parse_typescript_metadata(content: str) -> list:
    """TypeScript METHOD_METADATA 객체 파싱"""
    methods = []

    # 메서드별로 파싱 (간단한 정규식)
    # 패턴: methodName: { group: 'xxx', deps: ['a', 'b'], estimatedTime: 0.x }
    pattern = r"(\w+):\s*\{\s*group:\s*'(\w+)',\s*deps:\s*\[([^\]]+)\],\s*estimatedTime:\s*([\d.]+)"

    for match in re.finditer(pattern, content):
        method_name, group, deps_str, time = match.groups()

        # deps 파싱
        deps = [d.strip().strip("'\"") for d in deps_str.split(',')]

        methods.append({
            'name': method_name,
            'group': group,
            'deps': deps,
            'estimatedTime': float(time)
        })

    return methods


def main():
    """메인 실행 함수"""
    print("🚀 method-metadata.ts 문서화 시작")
    print("=" * 60)

    # 경로 설정
    script_dir = Path(__file__).parent
    metadata_path = script_dir.parent.parent / "lib" / "statistics" / "registry" / "method-metadata.ts"
    output_dir = script_dir.parent / "data" / "project"
    output_path = output_dir / "statistical_methods.md"

    output_dir.mkdir(parents=True, exist_ok=True)

    # TypeScript 파일 읽기
    with open(metadata_path, 'r', encoding='utf-8') as f:
        ts_content = f.read()

    print(f"\n[PARSE] {metadata_path.name}")

    # 메서드 추출
    methods = parse_typescript_metadata(ts_content)
    print(f"  메서드 개수: {len(methods)}")

    # 그룹별로 분류
    group_info = {
        'descriptive': {'name': 'Descriptive Statistics', 'worker': 'Worker 1', 'methods': []},
        'hypothesis': {'name': 'Hypothesis Testing', 'worker': 'Worker 2', 'methods': []},
        'nonparametric': {'name': 'Nonparametric Tests', 'worker': 'Worker 3', 'methods': []},
        'anova': {'name': 'ANOVA', 'worker': 'Worker 3', 'methods': []},
        'regression': {'name': 'Regression Analysis', 'worker': 'Worker 4', 'methods': []},
        'advanced': {'name': 'Advanced Analytics', 'worker': 'Worker 4', 'methods': []}
    }

    for method in methods:
        group_key = method['group']
        if group_key in group_info:
            group_info[group_key]['methods'].append(method)

    # Markdown 생성
    today = datetime.now().strftime("%Y-%m-%d")

    md = f"""---
title: Statistical Methods Metadata
source: lib/statistics/registry/method-metadata.ts
type: Project Internal Documentation
license: MIT
crawled_date: {today}
---

# Statistical Methods Metadata

**파일**: `lib/statistics/registry/method-metadata.ts`
**총 메서드 개수**: {len(methods)}

이 문서는 통계 플랫폼의 60개 통계 메서드 메타데이터를 정리한 것입니다.

---

## 📋 메서드 그룹별 분류

"""

    # 그룹별로 테이블 생성
    for group_key, group in group_info.items():
        if not group['methods']:
            continue

        md += f"\n### {group['name']} ({group['worker']})\n\n"
        md += f"**메서드 개수**: {len(group['methods'])}\n\n"
        md += f"| 메서드 ID | 의존성 패키지 | 예상 실행 시간 (초) |\n"
        md += f"|-----------|---------------|--------------------|\n"

        for method in group['methods']:
            deps = ', '.join(method['deps'])
            md += f"| `{method['name']}` | {deps} | {method['estimatedTime']} |\n"

        md += f"\n"

    # 전체 메서드 목록 (알파벳 순)
    md += f"\n---\n\n## 📚 전체 메서드 목록 (알파벳 순)\n\n"
    md += f"| 메서드 ID | 그룹 | Worker | 의존성 | 예상 시간 |\n"
    md += f"|-----------|------|--------|--------|----------|\n"

    sorted_methods = sorted(methods, key=lambda m: m['name'])

    for method in sorted_methods:
        group = group_info.get(method['group'], {})
        group_name = group.get('name', method['group'])
        worker = group.get('worker', 'Unknown')
        deps = ', '.join(method['deps'])

        md += f"| `{method['name']}` | {group_name} | {worker} | {deps} | {method['estimatedTime']}s |\n"

    # 의존성 패키지 통계
    md += f"\n---\n\n## 📦 의존성 패키지 통계\n\n"

    deps_count = defaultdict(int)
    for method in methods:
        for dep in method['deps']:
            deps_count[dep] += 1

    md += f"| 패키지 | 사용 메서드 수 | 비율 |\n"
    md += f"|--------|---------------|------|\n"

    for pkg, count in sorted(deps_count.items(), key=lambda x: -x[1]):
        percentage = (count / len(methods)) * 100
        md += f"| `{pkg}` | {count} | {percentage:.1f}% |\n"

    # 파일 저장
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(md)

    print(f"  ✅ 저장: {output_path}")

    print("\n" + "=" * 60)
    print("📋 요약")
    print("=" * 60)
    print(f"총 메서드: {len(methods)}")
    print(f"그룹 수: {len([g for g in group_info.values() if g['methods']])}")
    print(f"의존성 패키지: {', '.join(sorted(deps_count.keys()))}")
    print("\n✅ method-metadata.ts 문서화 완료!")


if __name__ == "__main__":
    main()
