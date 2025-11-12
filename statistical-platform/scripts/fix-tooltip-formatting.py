#!/usr/bin/env python3
"""
Tooltip 블록의 빈 줄을 제거하는 스크립트
"""

import re
import os

PAGES = [
    'mcnemar',
    'ks-test',
    'regression',
    'runs-test',
    'sign-test'
]

BASE_PATH = 'app/(dashboard)/statistics'

def remove_blank_lines_in_tooltip(content: str) -> str:
    """Tooltip 블록 내의 빈 줄 제거"""

    # UITooltip 블록 찾기
    pattern = re.compile(
        r'(<UITooltip>)\n\s*\n\s*(<TooltipTrigger asChild>)\n\s*\n\s*(<Button[^>]*>)\n\s*\n\s*(<[^>]*/>)\n\s*\n\s*([^<\n]+)\n\s*\n\s*(</Button>)\n\s*\n\s*(</TooltipTrigger>)\n\s*\n\s*(<TooltipContent>)\n\s*\n\s*(<p>[^<]+</p>)\n\s*\n\s*(</TooltipContent>)\n\s*\n\s*(</UITooltip>)',
        re.MULTILINE
    )

    def replace(match):
        indent = '            '  # 12 spaces
        button_content = match.group(3)
        icon = match.group(4)
        button_text = match.group(5).strip()
        tooltip_text = match.group(9)

        return f'''{indent}<UITooltip>
{indent}  <TooltipTrigger asChild>
{indent}    {button_content}
{indent}      {icon}
{indent}      {button_text}
{indent}    </Button>
{indent}  </TooltipTrigger>
{indent}  <TooltipContent>
{indent}    {tooltip_text}
{indent}  </TooltipContent>
{indent}</UITooltip>'''

    content = pattern.sub(replace, content)

    return content

def process_page(page_name: str) -> dict:
    """페이지 처리"""
    file_path = f"{BASE_PATH}/{page_name}/page.tsx"

    if not os.path.exists(file_path):
        return {'status': 'not_found', 'page': page_name}

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    content = remove_blank_lines_in_tooltip(content)

    if content == original_content:
        return {'status': 'no_change', 'page': page_name}

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return {'status': 'success', 'page': page_name}

def main():
    results = []

    for page in PAGES:
        result = process_page(page)
        results.append(result)

        if result['status'] == 'success':
            print(f"[OK] {result['page']}: formatting fixed")
        elif result['status'] == 'no_change':
            print(f"[SKIP] {result['page']}: already clean")
        elif result['status'] == 'not_found':
            print(f"[ERROR] {result['page']}: file not found")

    success_count = sum(1 for r in results if r['status'] == 'success')
    print(f"\n[SUCCESS] Total: {success_count}/{len(PAGES)} pages formatted")

if __name__ == '__main__':
    main()
