import os
import re
from pathlib import Path

# 문제가 있는 페이지들
CRITICAL_PAGES = ['chi-square-goodness', 'explore-data', 'mann-whitney']
MAJOR_PAGES = ['anova', 'chi-square-goodness', 'correlation', 'descriptive', 'explore-data', 
               'frequency-table', 'kruskal-wallis', 'mann-whitney', 'proportion-test', 
               'regression', 't-test', 'welch-t', 'non-parametric']

def analyze_page(page_name):
    filepath = f"./statistical-platform/app/(dashboard)/statistics/{page_name}/page.tsx"
    if not os.path.exists(filepath):
        return None
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    content = ''.join(lines)
    
    info = {
        'name': page_name,
        'filepath': filepath,
        'issues': []
    }
    
    # 1. useStatisticsPage 확인
    has_use_stats_page = 'useStatisticsPage' in content and 'const { state, actions }' in content
    if not has_use_stats_page:
        info['issues'].append({
            'type': 'A',
            'severity': 'CRITICAL',
            'description': 'useStatisticsPage hook 미사용',
            'details': 'useState를 직접 사용하고 있는지 확인 필요'
        })
    
    # 2. setResults 확인
    if 'setResults(' in content:
        # 라인 번호 찾기
        for i, line in enumerate(lines, 1):
            if 'setResults(' in line:
                info['issues'].append({
                    'type': 'C',
                    'severity': 'CRITICAL',
                    'description': 'setResults() 사용 (금지됨)',
                    'line': i,
                    'code': line.strip()
                })
    
    # 3. useCallback 확인 (이벤트 핸들러 있는데 없음)
    has_callbacks = bool(re.search(r'useCallback\(', content))
    has_handlers = 'handleDataUpload' in content or 'handleVariablesSelected' in content
    
    if has_handlers and not has_callbacks:
        info['issues'].append({
            'type': 'B',
            'severity': 'MAJOR',
            'description': 'useCallback 미적용',
            'details': '이벤트 핸들러가 있는데 useCallback 사용 안 함'
        })
    
    # 4. any 타입 확인
    any_matches = re.findall(r'(:\s*any[^a-zA-Z]|as any)', content)
    if any_matches:
        for i, line in enumerate(lines, 1):
            if re.search(r':\s*any[^a-zA-Z]|as any', line):
                info['issues'].append({
                    'type': 'D',
                    'severity': 'MAJOR',
                    'description': 'any 타입 사용',
                    'line': i,
                    'code': line.strip()
                })
    
    # 5. try-catch와 setError 확인
    has_try_catch = 'try {' in content and 'catch' in content
    has_set_error = 'setError' in content
    
    if has_try_catch and not has_set_error:
        info['issues'].append({
            'type': 'E',
            'severity': 'MINOR',
            'description': '에러 처리 미흡',
            'details': 'try-catch는 있지만 setError() 호출 없음'
        })
    
    # 6. Step 흐름 확인
    has_data_upload_step = 'DataUploadStep' in content
    has_variable_selector = 'VariableSelector' in content
    
    if has_data_upload_step and not has_variable_selector:
        # 기본 데이터 업로드만 하는 페이지일 수 있음
        pass
    
    return info

# 모든 문제 페이지 분석
all_issues = {}

for page_name in sorted(set(CRITICAL_PAGES + MAJOR_PAGES)):
    info = analyze_page(page_name)
    if info and info['issues']:
        all_issues[page_name] = info

# 결과 출력
print("=" * 120)
print("DETAILED ISSUE ANALYSIS")
print("=" * 120)
print()

# Category별로 정렬
categories = {'A': [], 'B': [], 'C': [], 'D': [], 'E': []}

for page_name, info in all_issues.items():
    for issue in info['issues']:
        cat = issue['type']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append((page_name, issue))

# Category A (Critical - useStatisticsPage 미사용)
if categories['A']:
    print("[CRITICAL - Category A] useStatisticsPage Hook 미사용")
    print("-" * 120)
    for page_name, issue in categories['A']:
        print(f"  {page_name}: {issue['description']}")
        print(f"    Detail: {issue.get('details', '')}")
    print()

# Category C (Critical - setResults 사용)
if categories['C']:
    print("[CRITICAL - Category C] setResults() 사용 (금지됨)")
    print("-" * 120)
    for page_name, issue in categories['C']:
        print(f"  {page_name}: Line {issue['line']}")
        print(f"    Code: {issue['code']}")
    print()

# Category B (Major - useCallback 미적용)
if categories['B']:
    print("[MAJOR - Category B] useCallback 미적용")
    print("-" * 120)
    for page_name, issue in categories['B']:
        print(f"  {page_name}: {issue['description']}")
        print(f"    Detail: {issue.get('details', '')}")
    print()

# Category D (Major - any 타입 사용)
if categories['D']:
    print("[MAJOR - Category D] any 타입 사용")
    print("-" * 120)
    for page_name, issue in categories['D']:
        print(f"  {page_name}: Line {issue['line']}")
        print(f"    Code: {issue['code']}")
    print()

# Category E (Minor)
if categories['E']:
    print("[MINOR - Category E] 기타 이슈")
    print("-" * 120)
    for page_name, issue in categories['E']:
        print(f"  {page_name}: {issue['description']}")
        print(f"    Detail: {issue.get('details', '')}")
    print()

# 요약
print("=" * 120)
print("SUMMARY")
print("=" * 120)
print(f"Total pages with issues: {len(all_issues)}")
print(f"  - Category A (Critical): {len(categories['A'])}")
print(f"  - Category B (Major): {len(categories['B'])}")
print(f"  - Category C (Critical): {len(categories['C'])}")
print(f"  - Category D (Major): {len(categories['D'])}")
print(f"  - Category E (Minor): {len(categories['E'])}")

