#!/usr/bin/env python3
"""
pyodide-statistics.ts 파일의 모든 runPythonAsync 호출에 필수 import 문 추가
"""
import re

# 파일 읽기
with open('lib/services/pyodide-statistics.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# runPythonAsync 패턴 찾기 (백틱 사이의 Python 코드)
# 패턴: runPythonAsync(`...`)
pattern = r'(runPythonAsync\(`\s*\n)((?:(?!`\)).)*)'

def add_imports(match):
    prefix = match.group(1)
    python_code = match.group(2)

    # 이미 import가 있는지 확인
    has_numpy = 'import numpy' in python_code or 'import np' in python_code
    has_scipy = 'from scipy import' in python_code
    has_json = 'import json' in python_code

    # import 문 구성
    imports = []
    if not has_numpy:
        imports.append('import numpy as np')
    if not has_scipy:
        imports.append('from scipy import stats')
    if not has_json:
        imports.append('import json')

    # import가 필요한 경우에만 추가
    if imports:
        import_block = '\n      '.join(imports) + '\n\n      '
        return prefix + import_block + python_code
    else:
        return prefix + python_code

# 모든 runPythonAsync 호출에 import 추가
new_content = re.sub(pattern, add_imports, content, flags=re.DOTALL)

# 파일 쓰기
with open('lib/services/pyodide-statistics.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Python import added successfully!")
print(f"Total {content.count('runPythonAsync')} runPythonAsync calls processed")
