#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
크롤링된 라이브러리 문서에서 불필요한 네비게이션/메타 콘텐츠 제거

제거 대상:
- 상단 네비게이션 메뉴
- 버전 선택 링크
- "Skip to main content", "Back to top" 등
- 사이드바 네비게이션
- 반복되는 헤더/푸터

보존 대상:
- YAML frontmatter
- 함수 시그니처
- 파라미터 설명
- 코드 예제
- 반환값 설명
"""

import os
import re
import sys
from pathlib import Path
from typing import List

# Windows UTF-8 출력 설정
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


# 제거할 패턴 (정규식)
REMOVE_PATTERNS = [
    # Skip to content, Back to top 등
    r'\[Skip to main content\].*?\n',
    r'Back to top `Ctrl`\+`K`\n',

    # 상단 네비게이션 (Logo, Installing, User Guide 등)
    r'\[ !\[\].*?SciPy \].*?\n',
    r'\[ !\[\].*?NumPy \].*?\n',
    r'\[ !\[\].*?statsmodels \].*?\n',
    r'  \* \[ Installing \].*?\n',
    r'  \* \[ User Guide \].*?\n',
    r'  \* \[ API reference \].*?\n',
    r'  \* \[ Building from source \].*?\n',
    r'  \* \[ Development \].*?\n',
    r'  \* \[ Release notes \].*?\n',

    # 버전 선택 (엄청 긴 부분)
    r'1\.\d+\.\d+ \(stable\)\n\[development\].*?\n',
    r'\[1\.\d+\.\d+.*?\]\(https://.*?\)',
    r'\[0\.\d+.*?\]\(https://.*?\)',

    # Light/Dark 테마 선택
    r'Light Dark System Settings\n',

    # GitHub, Forum 링크
    r'  \* \[ GitHub\].*?\n',
    r'  \* \[ Scientific Python Forum\].*?\n',

    # Search 버튼
    r'Search `Ctrl`\+`K`\n',

    # Section Navigation (모든 모듈 목록)
    r'Section Navigation\n',
    r'  \* \[scipy\].*?\n',
    r'  \* \[scipy\..*?\].*?\n',
    r'  \* \[numpy\].*?\n',
    r'  \* \[numpy\..*?\].*?\n',
    r'  \* \[statsmodels\].*?\n',
    r'  \* \[statsmodels\..*?\].*?\n',

    # Breadcrumb navigation
    r'  \* \[ \]\(https://.*?index\.html\)\n',
    r'  \* \[.*? API\]\(https://.*?\)\n',
    r'  \* \[Statistical functions.*?\]\(https://.*?\)\n',
]


def extract_frontmatter(content: str) -> tuple[str, str]:
    """YAML frontmatter 추출"""
    if not content.startswith('---'):
        return '', content

    # 첫 번째 --- 이후 두 번째 --- 찾기
    parts = content.split('---', 2)
    if len(parts) < 3:
        return '', content

    frontmatter = f"---{parts[1]}---"
    body = parts[2]

    return frontmatter, body


def find_content_start(lines: List[str]) -> int:
    """실제 콘텐츠 시작 라인 찾기 (함수 시그니처)"""
    for i, line in enumerate(lines):
        # 함수 시그니처 패턴 (예: scipy.stats.ttest_ind)
        if re.match(r'^[a-z_]+\.[a-z_]+\.\w+', line):
            return i
        # 또는 # 헤딩 (함수명)
        if line.startswith('# ') and '(' in line:
            return i

    # 찾지 못하면 YAML 이후부터
    return 0


def clean_content(content: str) -> str:
    """네비게이션/메타 콘텐츠 제거"""
    # 1. Frontmatter 추출
    frontmatter, body = extract_frontmatter(content)

    # 2. 라인별로 분리
    lines = body.split('\n')

    # 3. 실제 콘텐츠 시작 위치 찾기
    content_start = find_content_start(lines)

    # 4. 콘텐츠 시작 이전 부분 정제
    header = '\n'.join(lines[:content_start])
    main_content = '\n'.join(lines[content_start:])

    # 5. 패턴 제거
    for pattern in REMOVE_PATTERNS:
        header = re.sub(pattern, '', header)

    # 6. 빈 줄 3개 이상 연속 → 2개로 축소
    header = re.sub(r'\n{4,}', '\n\n\n', header)
    main_content = re.sub(r'\n{4,}', '\n\n\n', main_content)

    # 7. 재조합
    if frontmatter:
        return f"{frontmatter}\n\n{header.strip()}\n\n{main_content.strip()}\n"
    else:
        return f"{header.strip()}\n\n{main_content.strip()}\n"


def cleanup_directory(data_dir: Path, library: str):
    """특정 라이브러리 디렉토리 정제"""
    lib_dir = data_dir / library

    if not lib_dir.exists():
        print(f"❌ {library} 디렉토리가 없습니다: {lib_dir}")
        return

    md_files = list(lib_dir.glob('*.md'))

    if not md_files:
        print(f"⚠️  {library} 디렉토리에 .md 파일이 없습니다")
        return

    print(f"\n🧹 {library} 정제 시작 ({len(md_files)}개 파일)")
    print("=" * 60)

    cleaned_count = 0
    error_count = 0

    for md_file in md_files:
        try:
            # 원본 읽기
            with open(md_file, 'r', encoding='utf-8') as f:
                original = f.read()

            original_size = len(original)

            # 정제
            cleaned = clean_content(original)
            cleaned_size = len(cleaned)

            # 저장
            with open(md_file, 'w', encoding='utf-8') as f:
                f.write(cleaned)

            reduction = original_size - cleaned_size
            reduction_pct = (reduction / original_size * 100) if original_size > 0 else 0

            print(f"  ✅ {md_file.name}")
            print(f"     {original_size:,} → {cleaned_size:,} bytes (-{reduction:,}, -{reduction_pct:.1f}%)")

            cleaned_count += 1

        except Exception as e:
            print(f"  ❌ {md_file.name}: {e}")
            error_count += 1

    print("=" * 60)
    print(f"✅ 완료: {cleaned_count}/{len(md_files)} 파일")
    if error_count > 0:
        print(f"❌ 에러: {error_count}개 파일")


def main():
    """메인 실행"""
    script_dir = Path(__file__).parent
    rag_system_dir = script_dir.parent
    data_dir = rag_system_dir / 'data'

    print("🚀 문서 정제 시작")
    print("=" * 60)
    print(f"데이터 디렉토리: {data_dir}")

    # 각 라이브러리 정제
    libraries = ['scipy', 'numpy', 'statsmodels', 'pingouin']

    for library in libraries:
        cleanup_directory(data_dir, library)

    print("\n" + "=" * 60)
    print("✅ 모든 라이브러리 문서 정제 완료!")


if __name__ == '__main__':
    main()
