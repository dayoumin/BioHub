import os
import re
from pathlib import Path

stats_dir = Path("./statistical-platform/app/(dashboard)/statistics")
pages = []

for subdir in sorted(stats_dir.iterdir()):
    if subdir.is_dir() and subdir.name != "__pycache__":
        page_file = subdir / "page.tsx"
        if page_file.exists():
            pages.append((subdir.name, str(page_file)))

def check_page(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except:
        return None, None
    
    # More accurate detection
    has_use_stats = 'useStatisticsPage' in content
    has_state_actions = 'hookState' in content or 'const { state' in content or 'const { state:' in content
    use_stats_page = has_use_stats
    
    # Check for useState used for state management (currentStep, isAnalyzing, etc.)
    state_vars = re.findall(r'const \[([a-zA-Z]+).*?\] = useState', content)
    has_state_vars = any(var in content and var in ['currentStep', 'isAnalyzing', 'results'] for var in state_vars)
    
    results = {
        'useStatisticsPage': use_stats_page,
        'useState_state_mgmt': has_state_vars,
        'useCallback': 'useCallback(' in content,
        'handleDataUpload': 'handleDataUpload' in content,
        'handleVariablesSelected': 'handleVariablesSelected' in content,
        'completeAnalysis': 'completeAnalysis(' in content,
        'setResults': 'setResults(' in content,
        'any_type': bool(re.search(r':\s*any[,\s)]|as any', content)),
        'try_catch': 'try {' in content and 'catch' in content,
        'setError': 'actions.setError(' in content or 'setError(' in content,
        'DataUploadStep': 'DataUploadStep' in content,
        'VariableSelector': 'VariableSelector' in content,
    }
    
    return results, content

results_map = {}
for page_name, filepath in pages:
    results, content = check_page(filepath)
    if results:
        results_map[page_name] = results

# Print summary table
print("========== STATISTICS PAGES CONSISTENCY CHECK ==========\n")

# Count OK
ok_count = sum(1 for r in results_map.values() if not any([
    not r['useStatisticsPage'],
    r['setResults'],
    (r['handleDataUpload'] or r['handleVariablesSelected']) and not r['useCallback'],
    r['any_type']
]))

print(f"Total pages: {len(results_map)}")
print(f"OK pages: {ok_count}")
print(f"Pages with issues: {len(results_map) - ok_count}\n")

# Issue categories
critical_a = []  # useStatisticsPage not used
critical_c = []  # setResults used
major_b = []     # useCallback not applied
major_d = []     # any type used
minor_e = []     # try-catch but no setError

for page_name, res in results_map.items():
    if not res['useStatisticsPage']:
        critical_a.append(page_name)
    
    if res['setResults']:
        critical_c.append(page_name)
    
    if (res['handleDataUpload'] or res['handleVariablesSelected']) and not res['useCallback']:
        major_b.append(page_name)
    
    if res['any_type']:
        major_d.append(page_name)
    
    if res['try_catch'] and not res['setError']:
        minor_e.append(page_name)

print("===== ISSUES BY CATEGORY =====\n")

if critical_a:
    print(f"[CRITICAL-A] useStatisticsPage not used: {critical_a}\n")

if critical_c:
    print(f"[CRITICAL-C] setResults() used (forbidden): {critical_c}\n")

if major_b:
    print(f"[MAJOR-B] useCallback not applied: {len(major_b)} pages")
    print(f"  {major_b}\n")

if major_d:
    print(f"[MAJOR-D] 'any' type used: {major_d}\n")

if minor_e:
    print(f"[MINOR-E] try-catch but no setError: {minor_e}\n")

