import os
import re
from pathlib import Path

# 모든 통계 페이지 찾기
stats_dir = Path("./statistical-platform/app/(dashboard)/statistics")
pages = []

for subdir in sorted(stats_dir.iterdir()):
    if subdir.is_dir() and subdir.name != "__pycache__":
        page_file = subdir / "page.tsx"
        if page_file.exists():
            pages.append((subdir.name, str(page_file)))

# 검사 함수
def check_page(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    results = {
        'useStatisticsPage': 'useStatisticsPage' in content and 'const { state, actions }' in content,
        'useState_direct': bool(re.search(r'const \[.+\] = useState', content)) and 'currentStep' in content,
        'useCallback': bool(re.search(r'useCallback\(', content)),
        'completeAnalysis': 'completeAnalysis' in content,
        'setResults': 'setResults(' in content,
        'any_type': bool(re.search(r':\s*any[^a-zA-Z]|as any', content)),
        'unknown_type': 'unknown' in content,
        'try_catch': 'try {' in content and 'catch' in content,
        'setError': 'setError' in content,
        'non_null_assertion': '!' in content and '!(' in content,
        'handleDataUpload': 'handleDataUpload' in content,
        'handleVariablesSelected': 'handleVariablesSelected' in content,
        'DataUploadStep': 'DataUploadStep' in content,
        'VariableSelector': 'VariableSelector' in content,
        'withUploadedData': 'withUploadedData' in content,
    }
    
    return results, content

# 모든 페이지 검사
results_map = {}
for page_name, filepath in pages:
    results, content = check_page(filepath)
    results_map[page_name] = {
        'results': results,
        'lines': len(content.split('\n')),
        'filepath': filepath
    }

# 상태별 분류
critical_issues = {}  # Category A, C
major_issues = {}     # Category B, D
minor_issues = {}     # Category E

for page_name, data in results_map.items():
    res = data['results']
    issues = []
    
    # Category A: useStatisticsPage 미사용
    if not res['useStatisticsPage']:
        issues.append('A')
        if 'A' not in critical_issues:
            critical_issues['A'] = []
        critical_issues['A'].append(page_name)
    
    # Category C: setResults() 사용
    if res['setResults']:
        issues.append('C')
        if 'C' not in critical_issues:
            critical_issues['C'] = []
        critical_issues['C'].append(page_name)
    
    # Category B: useCallback 미적용 (이벤트 핸들러 있는데 useCallback 없음)
    if (res['handleDataUpload'] or res['handleVariablesSelected']) and not res['useCallback']:
        issues.append('B')
        if 'B' not in major_issues:
            major_issues['B'] = []
        major_issues['B'].append(page_name)
    
    # Category D: any 타입 사용
    if res['any_type']:
        issues.append('D')
        if 'D' not in major_issues:
            major_issues['D'] = []
        major_issues['D'].append(page_name)
    
    # Category E: 기타 (try-catch 미흡, setError 미사용 등)
    if res['try_catch'] and not res['setError']:
        issues.append('E-noError')
        if 'E' not in minor_issues:
            minor_issues['E'] = []
        if page_name not in minor_issues['E']:
            minor_issues['E'].append(page_name)

# 결과 출력
print("=" * 100)
print("STATISTICS PAGES CONSISTENCY CHECK")
print("=" * 100)
print()

# 요약
print(f"Total statistics pages: {len(results_map)}")
print()

# Critical Issues
if critical_issues or major_issues:
    print("ISSUES FOUND:")
    print()
    
    if critical_issues:
        for cat in ['A', 'C']:
            if cat in critical_issues:
                pages_list = ', '.join(critical_issues[cat])
                print(f"[CRITICAL] Category {cat}: {pages_list}")
    print()
    
    if major_issues:
        for cat in ['B', 'D']:
            if cat in major_issues:
                pages_list = ', '.join(major_issues[cat])
                print(f"[MAJOR] Category {cat}: {pages_list}")
    print()
    
    if minor_issues and 'E' in minor_issues:
        pages_list = ', '.join(minor_issues['E'])
        print(f"[MINOR] Category E: {pages_list}")
        print()
else:
    print("No critical issues found!")
    print()

# 상세 테이블
print("=" * 120)
print("DETAILED ANALYSIS TABLE")
print("=" * 120)
print()

# CSV 형식으로 출력
print("|Page Name|useStatsHook|useCallback|completeAnalysis|setResults|anyType|tryCatch|setError|Status|")
print("|---|---|---|---|---|---|---|---|---|")

for page_name in sorted(results_map.keys()):
    data = results_map[page_name]
    res = data['results']
    
    # Status 결정
    status_parts = []
    if not res['useStatisticsPage']:
        status_parts.append('A')
    if res['setResults']:
        status_parts.append('C')
    if (res['handleDataUpload'] or res['handleVariablesSelected']) and not res['useCallback']:
        status_parts.append('B')
    if res['any_type']:
        status_parts.append('D')
    
    if status_parts:
        status = 'ISSUE:' + ','.join(status_parts)
    else:
        status = 'OK'
    
    useStatHook = 'O' if res['useStatisticsPage'] else 'X'
    useCallBack = 'O' if res['useCallback'] else 'X'
    completeAnal = 'O' if res['completeAnalysis'] else 'X'
    setRes = 'O' if res['setResults'] else 'X'
    anyType = 'O' if not res['any_type'] else 'X'
    tryCatch = 'O' if res['try_catch'] else 'X'
    setErr = 'O' if res['setError'] else 'X'
    
    print(f"|{page_name}|{useStatHook}|{useCallBack}|{completeAnal}|{setRes}|{anyType}|{tryCatch}|{setErr}|{status}|")

