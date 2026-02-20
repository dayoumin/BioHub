#!/usr/bin/env python3
"""
PyodideWorker Enum 자동 변환 스크립트
Worker 번호(1-4)를 PyodideWorker enum으로 변환
"""

import os
import re
from pathlib import Path

# 변환 매핑
WORKER_ENUM_MAP = {
    '1': 'PyodideWorker.Descriptive',
    '2': 'PyodideWorker.Hypothesis',
    '3': 'PyodideWorker.NonparametricAnova',
    '4': 'PyodideWorker.RegressionAdvanced',
}

# 이미 처리된 페이지
SKIP_PAGES = {'descriptive', 'chi-square', 'normality-test', 'anova'}

IMPORT_LINE = "import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'"

def find_worker_number(content):
    """파일에서 사용 중인 Worker 번호 찾기"""
    # 패턴: callWorkerMethod<...>(1, 또는 callWorkerMethod<...>(\n  1,
    patterns = [
        r'}\s*>\s*\(\s*(\d)\s*,',  # }>(1,
        r'callWorkerMethod<[^>]+>\s*\(\s*(\d)\s*,',  # callWorkerMethod<T>(1,
        r'callWorkerMethod<[^>]+>\s*\(\s*\n\s*(\d)\s*,',  # callWorkerMethod<T>(\n  1,
    ]

    for pattern in patterns:
        match = re.search(pattern, content, re.MULTILINE | re.DOTALL)
        if match:
            return match.group(1)
    return None

def add_import_if_missing(content):
    """PyodideWorker import 추가"""
    if 'PyodideWorker' in content and 'pyodide-worker.enum' in content:
        return content, False  # 이미 있음

    # 마지막 import 문 찾기
    import_pattern = r"^import .+ from ['\"].+['\"]$"
    lines = content.split('\n')
    last_import_idx = -1

    for i, line in enumerate(lines):
        if re.match(import_pattern, line):
            last_import_idx = i

    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, IMPORT_LINE)
        return '\n'.join(lines), True

    return content, False

def replace_worker_numbers(content, worker_num):
    """Worker 번호를 enum으로 변경"""
    enum_value = WORKER_ENUM_MAP[worker_num]

    # 패턴들 - 모든 callWorkerMethod 호출에서 Worker 번호를 enum으로 변경
    patterns = [
        # callWorkerMethod<T>(1, → callWorkerMethod<T>(PyodideWorker.X,
        (r'(callWorkerMethod<[^>]+>\s*\(\s*)' + worker_num + r'(\s*,)',
         r'\1' + enum_value + r'\2'),
        # callWorkerMethod<T>(\n  1, → callWorkerMethod<T>(\n  PyodideWorker.X,
        (r'(callWorkerMethod<[^>]+>\s*\(\s*\n\s*)' + worker_num + r'(\s*,)',
         r'\1' + enum_value + r'\2'),
    ]

    modified = content
    for pattern, replacement in patterns:
        modified = re.sub(pattern, replacement, modified, flags=re.MULTILINE | re.DOTALL)

    return modified

def process_file(file_path):
    """파일 하나 처리"""
    page_name = file_path.parent.name

    if page_name in SKIP_PAGES:
        return 'skipped', f'{page_name} (이미 완료)'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # callWorkerMethod 사용하는지 확인
    if 'callWorkerMethod' not in content:
        return 'skipped', f'{page_name} (callWorkerMethod 미사용)'

    # 이미 enum 사용 중인지 확인
    if 'PyodideWorker.' in content:
        return 'skipped', f'{page_name} (enum 이미 사용)'

    # Worker 번호 찾기
    worker_num = find_worker_number(content)
    if not worker_num:
        return 'error', f'{page_name} (Worker 번호 추출 실패)'

    if worker_num not in WORKER_ENUM_MAP:
        return 'error', f'{page_name} (잘못된 Worker 번호: {worker_num})'

    # Import 추가
    content, import_added = add_import_if_missing(content)

    # Worker 번호 변환
    content = replace_worker_numbers(content, worker_num)

    # 파일 저장
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    enum_name = WORKER_ENUM_MAP[worker_num]
    return 'updated', f'{page_name} (Worker {worker_num} → {enum_name})'

def main():
    stats_dir = Path('app/(dashboard)/statistics')

    if not stats_dir.exists():
        print("❌ statistics 디렉토리를 찾을 수 없습니다.")
        print(f"   현재 경로: {Path.cwd()}")
        return

    print("=== PyodideWorker Enum 변환 시작 ===\n")

    results = {'updated': [], 'skipped': [], 'error': []}

    for page_dir in sorted(stats_dir.iterdir()):
        if not page_dir.is_dir():
            continue

        page_file = page_dir / 'page.tsx'
        if not page_file.exists():
            continue

        status, message = process_file(page_file)
        results[status].append(message)

        # 상태 아이콘
        icon = {'updated': '[OK]', 'skipped': '[SKIP]', 'error': '[ERR]'}[status]
        print(f"{icon} {message}")

    print("\n=== 완료 ===")
    print(f"업데이트: {len(results['updated'])}개")
    print(f"건너뜀: {len(results['skipped'])}개")
    print(f"오류: {len(results['error'])}개")

    if results['error']:
        print("\n오류 목록:")
        for error in results['error']:
            print(f"  - {error}")

if __name__ == '__main__':
    main()
