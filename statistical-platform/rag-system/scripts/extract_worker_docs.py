#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Worker Python Docstrings 추출 스크립트
목적: Worker 1-4 Python 파일에서 함수 시그니처, 타입, 설명 추출
"""

import sys
import io
import ast
import inspect
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Windows UTF-8 encoding fix
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


class FunctionExtractor(ast.NodeVisitor):
    """AST를 순회하며 함수 정의 추출"""

    def __init__(self):
        self.functions: List[Dict[str, Any]] = []

    def visit_FunctionDef(self, node: ast.FunctionDef):
        """함수 정의 노드 방문"""
        # Private 함수(_로 시작) 제외
        if node.name.startswith('_'):
            self.generic_visit(node)
            return

        # 함수 정보 추출
        func_info = {
            'name': node.name,
            'docstring': ast.get_docstring(node),
            'parameters': self._extract_parameters(node),
            'return_annotation': self._extract_return_type(node),
            'line_number': node.lineno,
            'decorators': [d.id if isinstance(d, ast.Name) else str(d) for d in node.decorator_list]
        }

        self.functions.append(func_info)
        self.generic_visit(node)

    def _extract_parameters(self, node: ast.FunctionDef) -> List[Dict[str, str]]:
        """파라미터 정보 추출"""
        params = []

        for arg in node.args.args:
            param_info = {
                'name': arg.arg,
                'type': self._get_annotation(arg.annotation),
                'default': None
            }
            params.append(param_info)

        # 기본값 추출
        defaults = node.args.defaults
        if defaults:
            # 기본값은 뒤에서부터 매칭
            for i, default in enumerate(defaults):
                param_idx = len(params) - len(defaults) + i
                if param_idx >= 0:
                    params[param_idx]['default'] = self._get_default_value(default)

        return params

    def _extract_return_type(self, node: ast.FunctionDef) -> str:
        """반환 타입 추출"""
        if node.returns:
            return self._get_annotation(node.returns)
        return "Any"

    def _get_annotation(self, annotation) -> str:
        """타입 어노테이션을 문자열로 변환"""
        if annotation is None:
            return "Any"

        if isinstance(annotation, ast.Name):
            return annotation.id
        elif isinstance(annotation, ast.Constant):
            return str(annotation.value)
        elif isinstance(annotation, ast.Subscript):
            # List[int], Dict[str, float] 등
            if isinstance(annotation.value, ast.Name):
                base = annotation.value.id
                if isinstance(annotation.slice, ast.Tuple):
                    # Dict[str, float] 형태
                    elts = [self._get_annotation(e) for e in annotation.slice.elts]
                    return f"{base}[{', '.join(elts)}]"
                else:
                    # List[int] 형태
                    return f"{base}[{self._get_annotation(annotation.slice)}]"
        elif isinstance(annotation, ast.BinOp):
            # Union[int, float] 형태 (Python 3.10+ int | float)
            left = self._get_annotation(annotation.left)
            right = self._get_annotation(annotation.right)
            return f"{left} | {right}"

        return ast.unparse(annotation) if hasattr(ast, 'unparse') else "Any"

    def _get_default_value(self, node) -> str:
        """기본값을 문자열로 변환"""
        if isinstance(node, ast.Constant):
            if isinstance(node.value, str):
                return f"'{node.value}'"
            return str(node.value)
        elif isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.List):
            return "[]"
        elif isinstance(node, ast.Dict):
            return "{}"
        return ast.unparse(node) if hasattr(ast, 'unparse') else "..."


def extract_functions_from_file(filepath: Path) -> List[Dict[str, Any]]:
    """Python 파일에서 함수 정보 추출"""
    with open(filepath, 'r', encoding='utf-8') as f:
        source = f.read()

    tree = ast.parse(source)
    extractor = FunctionExtractor()
    extractor.visit(tree)

    return extractor.functions


def create_markdown_doc(worker_name: str, functions: List[Dict[str, Any]], source_file: str) -> str:
    """Markdown 문서 생성"""
    today = datetime.now().strftime("%Y-%m-%d")

    md = f"""---
title: {worker_name} Functions
source: {source_file}
type: Project Internal Documentation
license: MIT
crawled_date: {today}
---

# {worker_name} - Python Functions

**파일**: `{source_file}`
**함수 개수**: {len(functions)}

---

"""

    for func in functions:
        # 함수 시그니처
        md += f"## `{func['name']}()`\n\n"

        # Docstring
        if func['docstring']:
            md += f"**설명**: {func['docstring']}\n\n"
        else:
            md += f"**설명**: (문서화 필요)\n\n"

        # 파라미터
        if func['parameters']:
            md += "**파라미터**:\n\n"
            for param in func['parameters']:
                param_type = param['type']
                param_name = param['name']
                default = f" = {param['default']}" if param['default'] else ""
                md += f"- `{param_name}`: `{param_type}`{default}\n"
            md += "\n"

        # 반환 타입
        md += f"**반환 타입**: `{func['return_annotation']}`\n\n"

        # 소스 위치
        md += f"**소스 라인**: Line {func['line_number']}\n\n"

        md += "---\n\n"

    return md


def main():
    """메인 실행 함수"""
    print("🚀 Worker Docstring 추출 시작")
    print("=" * 60)

    # 경로 설정
    script_dir = Path(__file__).parent
    worker_dir = script_dir.parent.parent / "public" / "workers" / "python"
    output_dir = script_dir.parent / "data" / "project"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Worker 파일 목록
    worker_files = [
        ("worker1-descriptive.py", "Worker 1: Descriptive Statistics"),
        ("worker2-hypothesis.py", "Worker 2: Hypothesis Testing"),
        ("worker3-nonparametric-anova.py", "Worker 3: Nonparametric & ANOVA"),
        ("worker4-regression-advanced.py", "Worker 4: Regression & Advanced")
    ]

    total_functions = 0

    for filename, worker_name in worker_files:
        filepath = worker_dir / filename

        if not filepath.exists():
            print(f"⚠️ 파일 없음: {filepath}")
            continue

        print(f"\n[EXTRACT] {worker_name}")
        print(f"  파일: {filename}")

        # 함수 추출
        functions = extract_functions_from_file(filepath)
        print(f"  함수 개수: {len(functions)}")

        # Markdown 생성
        markdown = create_markdown_doc(worker_name, functions, filename)

        # 저장
        output_filename = filename.replace('.py', '_functions.md')
        output_path = output_dir / output_filename

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(markdown)

        print(f"  ✅ 저장: {output_path}")

        total_functions += len(functions)

    print("\n" + "=" * 60)
    print(f"📋 요약")
    print("=" * 60)
    print(f"총 Worker 파일: {len(worker_files)}")
    print(f"총 함수 개수: {total_functions}")
    print(f"저장 경로: {output_dir}")
    print("\n✅ Worker docstring 추출 완료!")


if __name__ == "__main__":
    main()
