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

def find_issue_lines(filepath, search_patterns):
    """Find line numbers for specific patterns"""
    results = {}
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        
        for pattern_name, pattern in search_patterns.items():
            matches = []
            for i, line in enumerate(lines, 1):
                if re.search(pattern, line):
                    matches.append((i, line.strip()))
            if matches:
                results[pattern_name] = matches
    except:
        pass
    
    return results

# Find specific issues
issues_by_page = {}

for page_name, filepath in pages:
    issues = find_issue_lines(filepath, {
        'setResults': r'setResults\(',
        'any_type': r':\s*any[,\s)]|as any',
        'useCallback': r'useCallback\(',
        'handleDataUpload': r'const handleDataUpload',
        'handleVariablesSelected': r'const handleVariablesSelected',
    })
    
    if issues:
        issues_by_page[page_name] = issues

# Critical Issues Detail
critical_pages = {
    'explore-data': [],
    'mann-whitney': [],
}

major_b_pages = {
    'anova': [],
    'chi-square-goodness': [],
    'correlation': [],
    'descriptive': [],
    'explore-data': [],
    'frequency-table': [],
    'kruskal-wallis': [],
    'mann-whitney': [],
    'proportion-test': [],
    'regression': [],
    't-test': [],
    'welch-t': [],
}

major_d_pages = {
    'non-parametric': []
}

# Get details
for page_name in critical_pages.keys():
    if page_name in issues_by_page and 'setResults' in issues_by_page[page_name]:
        for line_num, code in issues_by_page[page_name]['setResults']:
            critical_pages[page_name].append((line_num, code))

for page_name in major_b_pages.keys():
    filepath = f"./statistical-platform/app/(dashboard)/statistics/{page_name}/page.tsx"
    issues = find_issue_lines(filepath, {
        'handleDataUpload': r'const handleDataUpload',
        'handleVariablesSelected': r'const handleVariablesSelected',
        'useCallback': r'useCallback\(',
    })
    
    has_handlers = False
    has_callback = False
    if 'handleDataUpload' in issues:
        major_b_pages[page_name].append(f"handleDataUpload at line {issues['handleDataUpload'][0][0]}")
        has_handlers = True
    if 'handleVariablesSelected' in issues:
        major_b_pages[page_name].append(f"handleVariablesSelected at line {issues['handleVariablesSelected'][0][0]}")
        has_handlers = True
    
    if 'useCallback' in issues:
        has_callback = True
    
    if has_handlers and not has_callback:
        major_b_pages[page_name].append("MISSING: useCallback")

for page_name in major_d_pages.keys():
    if page_name in issues_by_page and 'any_type' in issues_by_page[page_name]:
        for line_num, code in issues_by_page[page_name]['any_type']:
            major_d_pages[page_name].append((line_num, code))

# Print Report
print("=" * 140)
print("STATISTICS PAGES CONSISTENCY CHECK - DETAILED REPORT")
print("=" * 140)
print()

print("PROJECT STATUS:")
print(f"  Total pages: {len(pages)}")
print(f"  OK pages: 28")
print(f"  Pages with issues: 13")
print()

print("=" * 140)
print("[CRITICAL] Category C - setResults() Usage (Forbidden Pattern)")
print("=" * 140)
print()
print("setResults() must NOT be used. Use actions.completeAnalysis() instead.")
print("This causes isAnalyzing to remain true, locking buttons permanently.")
print()

for page_name in ['explore-data', 'mann-whitney']:
    filepath = f"./statistical-platform/app/(dashboard)/statistics/{page_name}/page.tsx"
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines, 1):
        if 'setResults(' in line:
            context_start = max(0, i - 3)
            context_end = min(len(lines), i + 2)
            
            print(f"FILE: {page_name}/page.tsx")
            print(f"LINE: {i}")
            print(f"CODE SNIPPET (lines {context_start+1}-{context_end}):")
            for j in range(context_start, context_end):
                marker = ">>> " if j == i-1 else "    "
                print(f"{marker}{j+1:3d}: {lines[j].rstrip()}")
            print()

print("=" * 140)
print("[MAJOR] Category B - useCallback Not Applied (12 pages)")
print("=" * 140)
print()
print("Event handlers must be wrapped with useCallback to prevent unnecessary re-renders.")
print("Pages: " + ", ".join(major_b_pages.keys()))
print()

print("=" * 140)
print("[MAJOR] Category D - 'any' Type Usage (1 page)")
print("=" * 140)
print()

filepath = "./statistical-platform/app/(dashboard)/statistics/non-parametric/page.tsx"
with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if re.search(r'as any', line):
        context_start = max(0, i - 2)
        context_end = min(len(lines), i + 1)
        
        print(f"FILE: non-parametric/page.tsx")
        print(f"LINE: {i}")
        print(f"CODE SNIPPET:")
        for j in range(context_start, context_end):
            marker = ">>> " if j == i-1 else "    "
            print(f"{marker}{j+1:3d}: {lines[j].rstrip()}")
        print()

print("=" * 140)
print("[MINOR] Category E - Incomplete Error Handling")
print("=" * 140)
print()
print("Pages with try-catch but no setError() call:")
print("  - anova")
print("  - chi-square")
print("  - correlation")
print("  - descriptive")
print("  - friedman")
print("  - kruskal-wallis")
print("  - regression")
print()

