#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RAG 시스템 문서 품질 검증

검증 항목:
1. YAML frontmatter 유효성
2. Markdown 구조 검증 (헤딩, 코드 블록)
3. 중복 콘텐츠 감지
4. 최소 콘텐츠 길이 확인
5. 함수 시그니처 존재 여부
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Set
from collections import defaultdict

# Windows UTF-8 출력 설정
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


class DocumentValidator:
    def __init__(self):
        self.issues = defaultdict(list)
        self.stats = {
            'total': 0,
            'valid': 0,
            'has_issues': 0,
            'total_issues': 0
        }

    def validate_frontmatter(self, file_path: Path, content: str) -> List[str]:
        """YAML frontmatter 검증"""
        issues = []

        if not content.startswith('---'):
            issues.append("YAML frontmatter 없음")
            return issues

        parts = content.split('---', 2)
        if len(parts) < 3:
            issues.append("YAML frontmatter 형식 오류")
            return issues

        frontmatter = parts[1]

        # 필수 필드 확인
        required_fields = ['title', 'source', 'library', 'crawled_date']
        for field in required_fields:
            if f"{field}:" not in frontmatter:
                issues.append(f"필수 필드 누락: {field}")

        return issues

    def validate_markdown_structure(self, file_path: Path, content: str) -> List[str]:
        """Markdown 구조 검증"""
        issues = []

        # 헤딩 확인
        headings = re.findall(r'^#+\s+.+', content, re.MULTILINE)
        if len(headings) < 1:
            issues.append("헤딩이 없음")

        # 코드 블록 짝 확인
        code_blocks = re.findall(r'```', content)
        if len(code_blocks) % 2 != 0:
            issues.append(f"코드 블록 짝 안 맞음 (``` {len(code_blocks)}개)")

        return issues

    def validate_content_length(self, file_path: Path, content: str) -> List[str]:
        """콘텐츠 길이 검증"""
        issues = []

        # Frontmatter 제외한 본문 길이
        parts = content.split('---', 2)
        if len(parts) >= 3:
            body = parts[2]
        else:
            body = content

        # 최소 길이 체크 (300자 미만이면 경고)
        body_length = len(body.strip())
        if body_length < 300:
            issues.append(f"본문이 너무 짧음 ({body_length} bytes)")

        # 빈 줄만 있는지 체크
        if body.strip() == '':
            issues.append("본문이 비어 있음")

        return issues

    def validate_function_signature(self, file_path: Path, content: str, library: str) -> List[str]:
        """함수 시그니처 검증 (라이브러리별)"""
        issues = []

        # Python Workers는 스킵
        if 'project' in str(file_path):
            return issues

        # 함수 시그니처 패턴 (scipy, numpy, statsmodels)
        patterns = {
            'scipy': r'scipy\.\w+\.\w+\(',
            'numpy': r'numpy\.\w+\(',
            'statsmodels': r'statsmodels\.\w+\.',
            'pingouin': r'def \w+\('
        }

        pattern = patterns.get(library, None)
        if pattern:
            if not re.search(pattern, content):
                issues.append(f"함수 시그니처 없음 (패턴: {pattern})")

        return issues

    def detect_duplicates(self, files: List[Path]) -> Dict[str, List[Path]]:
        """중복 콘텐츠 감지 (파일 크기 기반)"""
        size_map = defaultdict(list)

        for file_path in files:
            size = file_path.stat().st_size
            size_map[size].append(file_path)

        # 같은 크기의 파일이 2개 이상이면 중복 의심
        duplicates = {str(size): files for size, files in size_map.items() if len(files) > 1}

        return duplicates

    def validate_file(self, file_path: Path, library: str):
        """단일 파일 검증"""
        self.stats['total'] += 1

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            file_issues = []

            # 각 검증 실행
            file_issues.extend(self.validate_frontmatter(file_path, content))
            file_issues.extend(self.validate_markdown_structure(file_path, content))
            file_issues.extend(self.validate_content_length(file_path, content))
            file_issues.extend(self.validate_function_signature(file_path, content, library))

            if file_issues:
                self.issues[str(file_path)] = file_issues
                self.stats['has_issues'] += 1
                self.stats['total_issues'] += len(file_issues)
            else:
                self.stats['valid'] += 1

        except Exception as e:
            self.issues[str(file_path)] = [f"파일 읽기 오류: {e}"]
            self.stats['has_issues'] += 1
            self.stats['total_issues'] += 1

    def validate_directory(self, data_dir: Path, library: str):
        """디렉토리 검증"""
        lib_dir = data_dir / library

        if not lib_dir.exists():
            print(f"⚠️  {library} 디렉토리가 없습니다: {lib_dir}")
            return

        md_files = list(lib_dir.glob('*.md'))

        if not md_files:
            print(f"⚠️  {library} 디렉토리에 .md 파일이 없습니다")
            return

        print(f"\n🔍 {library} 검증 시작 ({len(md_files)}개 파일)")
        print("=" * 60)

        for md_file in md_files:
            self.validate_file(md_file, library)

        # 중복 콘텐츠 감지
        duplicates = self.detect_duplicates(md_files)
        if duplicates:
            print(f"⚠️  중복 크기 파일 발견: {len(duplicates)}개 그룹")
            for size, files in list(duplicates.items())[:3]:  # 최대 3개 그룹만 표시
                print(f"   크기 {size} bytes: {len(files)}개 파일")

        print(f"✅ 정상: {self.stats['valid']}개")
        if self.stats['has_issues'] > 0:
            print(f"⚠️  문제: {self.stats['has_issues']}개 파일, {self.stats['total_issues']}개 이슈")

    def print_summary(self):
        """검증 결과 요약"""
        print("\n" + "=" * 60)
        print("📋 검증 결과 요약")
        print("=" * 60)
        print(f"총 파일: {self.stats['total']}개")
        print(f"정상: {self.stats['valid']}개 ({self.stats['valid']/self.stats['total']*100:.1f}%)")
        print(f"문제 있음: {self.stats['has_issues']}개 ({self.stats['has_issues']/self.stats['total']*100:.1f}%)")
        print(f"총 이슈: {self.stats['total_issues']}개")

        # 이슈 상위 10개 파일만 표시
        if self.issues:
            print("\n⚠️  이슈가 있는 파일 (상위 10개):")
            for i, (file_path, file_issues) in enumerate(list(self.issues.items())[:10], 1):
                print(f"\n{i}. {Path(file_path).name}")
                for issue in file_issues:
                    print(f"   - {issue}")

            if len(self.issues) > 10:
                print(f"\n... 외 {len(self.issues) - 10}개 파일 생략")


def main():
    """메인 실행"""
    script_dir = Path(__file__).parent
    rag_system_dir = script_dir.parent
    data_dir = rag_system_dir / 'data'

    print("🚀 문서 품질 검증 시작")
    print("=" * 60)
    print(f"데이터 디렉토리: {data_dir}")

    validator = DocumentValidator()

    # 각 라이브러리 검증
    libraries = ['scipy', 'numpy', 'statsmodels', 'pingouin', 'project']

    for library in libraries:
        validator.validate_directory(data_dir, library)

    # 전체 요약
    validator.print_summary()

    print("\n" + "=" * 60)
    print("✅ 문서 품질 검증 완료!")

    # 종료 코드 (이슈가 있으면 1, 없으면 0)
    sys.exit(1 if validator.stats['has_issues'] > 0 else 0)


if __name__ == '__main__':
    main()
