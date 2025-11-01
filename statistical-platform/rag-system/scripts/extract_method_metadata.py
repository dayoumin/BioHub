#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
method-metadata.ts → Markdown 변환 스크립트
- TypeScript 메타데이터를 RAG 친화적 Markdown 테이블로 변환
- 통계 메서드 카탈로그 생성
"""

import sys
import io
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List

# Windows UTF-8 encoding fix
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def parse_typescript_metadata(ts_file_path: Path) -> Dict[str, Dict]:
    """
    TypeScript method-metadata.ts 파일 파싱
    
    Returns:
        dict: {method_name: {group, deps, estimatedTime}}
    """
    with open(ts_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # TypeScript 객체 파싱 (정규식)
    # 패턴: methodName: { group: 'xxx', deps: [...], estimatedTime: 0.x }
    pattern = r"(\w+):\s*\{\s*group:\s*'(\w+)',\s*deps:\s*\[(.*?)\],\s*estimatedTime:\s*([\d.]+)"
    
    metadata = {}
    for match in re.finditer(pattern, content, re.DOTALL):
        method_name = match.group(1)
        group = match.group(2)
        deps_str = match.group(3)
        estimated_time = float(match.group(4))
        
        # Parse dependencies
        deps = [d.strip().strip("'\"") for d in deps_str.split(',') if d.strip()]
        
        metadata[method_name] = {
            'group': group,
            'deps': deps,
            'estimatedTime': estimated_time
        }
    
    return metadata


def create_markdown_table(metadata: Dict[str, Dict], crawled_date: str) -> str:
    """Generate Markdown with YAML frontmatter + tables"""
    
    # Group by category
    groups = {}
    for method, info in metadata.items():
        group_name = info['group']
        if group_name not in groups:
            groups[group_name] = []
        groups[group_name].append((method, info))
    
    # Sort groups
    for group_name in groups:
        groups[group_name].sort(key=lambda x: x[0])
    
    # Build Markdown
    md = f"""---
title: Statistical Methods Metadata
description: 통계 메서드 카탈로그 (그룹, 의존성, 실행 시간)
source: statistical-platform/lib/statistics/registry/method-metadata.ts
category: project-internal
crawled_date: {crawled_date}
total_methods: {len(metadata)}
---

# Statistical Methods Metadata

**설명**: 통계 플랫폼에서 제공하는 {len(metadata)}개 통계 메서드의 메타데이터

**원본 파일**: `lib/statistics/registry/method-metadata.ts`

---

## 전체 메서드 목록 ({len(metadata)}개)

| 메서드명 | 그룹 | 의존성 | 예상 실행 시간 (초) |
|---------|------|--------|------------------|
"""
    
    # Full table
    for method in sorted(metadata.keys()):
        info = metadata[method]
        deps_str = ', '.join(info['deps']) if info['deps'] else '-'
        md += f"| {method} | {info['group']} | {deps_str} | {info['estimatedTime']} |\n"
    
    md += "\n---\n\n"
    
    # Group tables
    group_names = {
        'descriptive': '기술통계',
        'hypothesis': '가설검정',
        'regression': '회귀분석',
        'nonparametric': '비모수',
        'anova': '분산분석',
        'advanced': '고급분석'
    }
    
    for group_key in sorted(groups.keys()):
        group_display = group_names.get(group_key, group_key)
        methods = groups[group_key]
        
        md += f"## {group_display} ({len(methods)}개)\n\n"
        md += "| 메서드명 | 의존성 | 예상 실행 시간 (초) |\n"
        md += "|---------|--------|-------------------|\n"
        
        for method, info in methods:
            deps_str = ', '.join(info['deps']) if info['deps'] else '-'
            md += f"| {method} | {deps_str} | {info['estimatedTime']} |\n"
        
        md += "\n"
    
    # Statistics summary
    md += "---\n\n## 통계 요약\n\n"
    md += f"- **총 메서드 수**: {len(metadata)}개\n"
    
    for group_key in sorted(groups.keys()):
        group_display = group_names.get(group_key, group_key)
        md += f"- **{group_display}**: {len(groups[group_key])}개\n"
    
    # Dependency analysis
    all_deps = set()
    for info in metadata.values():
        all_deps.update(info['deps'])
    
    md += f"\n### 사용 중인 Python 라이브러리\n\n"
    for dep in sorted(all_deps):
        count = sum(1 for info in metadata.values() if dep in info['deps'])
        md += f"- **{dep}**: {count}개 메서드에서 사용\n"
    
    return md


def main():
    print("=== method-metadata.ts → Markdown 변환 ===\n")
    
    # Paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    ts_file = project_root / "lib" / "statistics" / "registry" / "method-metadata.ts"
    output_dir = script_dir.parent / "data" / "project"
    output_file = output_dir / "method-metadata.md"
    
    # Verify input file exists
    if not ts_file.exists():
        print(f"ERROR: TypeScript 파일을 찾을 수 없습니다: {ts_file}")
        return 1
    
    print(f"Input: {ts_file}")
    print(f"Output: {output_file}\n")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Parse TypeScript
    print("[1/3] TypeScript 파일 파싱 중...")
    metadata = parse_typescript_metadata(ts_file)
    print(f"  → {len(metadata)}개 메서드 발견\n")
    
    # Generate Markdown
    print("[2/3] Markdown 생성 중...")
    crawled_date = datetime.now().strftime("%Y-%m-%d")
    markdown = create_markdown_table(metadata, crawled_date)
    print(f"  → {len(markdown):,} characters\n")
    
    # Save
    print("[3/3] 파일 저장 중...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(markdown)
    
    print(f"✅ 완료: {output_file.name}")
    print(f"   크기: {output_file.stat().st_size:,} bytes")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
