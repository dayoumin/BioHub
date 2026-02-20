#!/usr/bin/env python3
"""
14개 통계 페이지의 내보내기 버튼을 비활성화하고 Tooltip을 추가하는 스크립트
"""

import re
import os

# 처리할 페이지 목록
PAGES = [
    'anova',
    'cochran-q',
    'correlation',
    'discriminant',
    'ks-test',
    'manova',
    'mcnemar',
    'mixed-model',
    'mood-median',
    'pca',
    'regression',
    'runs-test',
    'sign-test',
    't-test'
]

BASE_PATH = 'app/(dashboard)/statistics'

def add_tooltip_import(content: str) -> tuple[str, bool]:
    """Tooltip import 추가"""
    # 이미 UITooltip import가 있는지 확인
    if 'Tooltip as UITooltip' in content or 'TooltipTrigger' in content:
        return content, False

    # recharts Tooltip import 찾기
    recharts_pattern = r"(import \{[^}]*Tooltip[^}]*\} from 'recharts')"

    if re.search(recharts_pattern, content):
        # recharts Tooltip 다음 줄에 UI Tooltip import 추가
        tooltip_import = "import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'"
        content = re.sub(
            recharts_pattern,
            r'\1\n' + tooltip_import,
            content
        )
        return content, True

    # recharts가 없으면 일반적인 위치에 추가
    # 마지막 import 문 찾기
    import_lines = [i for i, line in enumerate(content.split('\n')) if line.startswith('import ')]
    if import_lines:
        lines = content.split('\n')
        last_import_idx = import_lines[-1]
        tooltip_import = "import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'"
        lines.insert(last_import_idx + 1, tooltip_import)
        return '\n'.join(lines), True

    return content, False

def wrap_button_with_tooltip(content: str, button_text: str) -> tuple[str, int]:
    """버튼을 Tooltip으로 감싸기"""
    count = 0

    # Pattern 1: onClick={() => {}} 버튼
    pattern1 = re.compile(
        r'(\s*)<Button variant="outline" onClick=\{\(\) => \{\}\}>\s*'
        r'<(Download|FileText) className="w-4 h-4 mr-2" />\s*'
        rf'{button_text}\s*'
        r'</Button>',
        re.MULTILINE | re.DOTALL
    )

    def replace1(match):
        nonlocal count
        count += 1
        indent = match.group(1)
        icon = match.group(2)
        tooltip_name = 'UITooltip' if 'Tooltip' in content and 'recharts' in content else 'Tooltip'
        return f'''{indent}<{tooltip_name}>
{indent}  <TooltipTrigger asChild>
{indent}    <Button variant="outline" disabled>
{indent}      <{icon} className="w-4 h-4 mr-2" />
{indent}      {button_text}
{indent}    </Button>
{indent}  </TooltipTrigger>
{indent}  <TooltipContent>
{indent}    <p>향후 제공 예정입니다</p>
{indent}  </TooltipContent>
{indent}</{tooltip_name}>'''

    content = pattern1.sub(replace1, content)

    # Pattern 2: disabled 이미 있는 버튼 (Tooltip만 추가)
    pattern2 = re.compile(
        r'(\s*)<Button[^>]*disabled[^>]*>\s*'
        r'<(Download|FileText) className="w-4 h-4 mr-2" />\s*'
        rf'{button_text}\s*'
        r'</Button>',
        re.MULTILINE | re.DOTALL
    )

    def replace2(match):
        # 이미 Tooltip으로 감싸져 있는지 확인
        if 'TooltipTrigger' in content[max(0, match.start()-200):match.start()]:
            return match.group(0)

        nonlocal count
        count += 1
        indent = match.group(1)
        icon = match.group(2)
        tooltip_name = 'UITooltip' if 'Tooltip' in content and 'recharts' in content else 'Tooltip'
        return f'''{indent}<{tooltip_name}>
{indent}  <TooltipTrigger asChild>
{indent}    <Button variant="outline" disabled>
{indent}      <{icon} className="w-4 h-4 mr-2" />
{indent}      {button_text}
{indent}    </Button>
{indent}  </TooltipTrigger>
{indent}  <TooltipContent>
{indent}    <p>향후 제공 예정입니다</p>
{indent}  </TooltipContent>
{indent}</{tooltip_name}>'''

    content = pattern2.sub(replace2, content)

    return content, count

def process_page(page_name: str) -> dict:
    """페이지 처리"""
    file_path = f"{BASE_PATH}/{page_name}/page.tsx"

    if not os.path.exists(file_path):
        return {'status': 'not_found', 'page': page_name}

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Tooltip import 추가
    content, import_added = add_tooltip_import(content)

    # 버튼 패턴 찾기
    button_texts = ['결과 다운로드', '결과 내보내기', '보고서 생성']
    total_count = 0

    for button_text in button_texts:
        if button_text in content:
            content, count = wrap_button_with_tooltip(content, button_text)
            total_count += count

    if total_count == 0 and not import_added:
        return {'status': 'no_change', 'page': page_name}

    # 파일 저장
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return {
        'status': 'success',
        'page': page_name,
        'import_added': import_added,
        'buttons_wrapped': total_count
    }

def main():
    results = []

    for page in PAGES:
        result = process_page(page)
        results.append(result)

        status = result['status']
        if status == 'success':
            print(f"[OK] {result['page']}: {result['buttons_wrapped']} buttons wrapped")
        elif status == 'no_change':
            print(f"[SKIP] {result['page']}: already processed")
        elif status == 'not_found':
            print(f"[ERROR] {result['page']}: file not found")

    # 요약
    success_count = sum(1 for r in results if r['status'] == 'success')
    print(f"\n[SUCCESS] Total: {success_count}/{len(PAGES)} pages processed")

if __name__ == '__main__':
    main()
