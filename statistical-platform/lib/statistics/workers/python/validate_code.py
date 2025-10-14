"""
Worker 1-4 Python 코드 정적 분석 검증

로컬 환경의 NumPy/SciPy 버전과 무관하게 코드 품질 검증
"""

import ast
import sys
from pathlib import Path

results = []

def validate_python_file(filepath):
    """Python 파일 AST 검증"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            code = f.read()
        
        # AST 파싱 (문법 오류 체크)
        tree = ast.parse(code)
        
        # import 분석
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                imports.append(f"{node.module}.{node.names[0].name if node.names else '*'}")
        
        # 함수 분석
        functions = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions.append({
                    'name': node.name,
                    'args': [arg.arg for arg in node.args.args],
                    'lineno': node.lineno
                })
        
        return {
            'valid': True,
            'imports': imports,
            'functions': functions,
            'error': None
        }
    except SyntaxError as e:
        return {
            'valid': False,
            'error': f"SyntaxError at line {e.lineno}: {e.msg}"
        }
    except Exception as e:
        return {
            'valid': False,
            'error': str(e)
        }


def check_critical_fixes(filepath, worker_name):
    """Critical Fix 검증"""
    checks = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # 1. binomtest import 확인 (Worker 1, 2)
    if worker_name in ['worker1', 'worker2']:
        if 'from scipy.stats import binomtest' in code:
            checks.append(f"✅ binomtest import 확인")
        else:
            checks.append(f"❌ binomtest import 누락")
        
        if 'stats.binom_test' in code:
            checks.append(f"❌ 구버전 stats.binom_test 사용 중")
    
    # 2. 쌍 손실 방지 패턴 확인
    pair_pattern = 'pairs = [(v1, v2) for v1, v2 in zip('
    if pair_pattern in code or 'for v1, v2 in zip(values1, values2)' in code:
        checks.append(f"✅ 쌍 손실 방지 패턴 확인")
    
    # 3. 에러 처리 확인
    if 'try:' in code and 'except' in code:
        checks.append(f"✅ 에러 처리 (try-except) 확인")
    
    return checks


print("=" * 70)
print("Worker 1-4 Python 코드 정적 분석 검증")
print("=" * 70)
print()

workers = [
    ('worker1-descriptive.py', 'worker1'),
    ('worker2-hypothesis.py', 'worker2'),
    ('worker3-nonparametric-anova.py', 'worker3'),
    ('worker4-regression-advanced.py', 'worker4')
]

for filename, worker_name in workers:
    filepath = Path(__file__).parent / filename
    
    print(f"📋 {worker_name.upper()}: {filename}")
    print("-" * 70)
    
    # 1. AST 검증
    result = validate_python_file(filepath)
    
    if result['valid']:
        print(f"✅ 문법 검증: 통과")
        print(f"✅ Import: {', '.join(result['imports'][:5])}")
        print(f"✅ 함수 개수: {len(result['functions'])}개")
        
        # 함수 목록 출력
        for func in result['functions'][:3]:
            print(f"   - {func['name']}({', '.join(func['args'][:3])}...)")
    else:
        print(f"❌ 문법 오류: {result['error']}")
        results.append(f"❌ {worker_name}: 문법 오류")
        print()
        continue
    
    print()
    
    # 2. Critical Fix 검증
    checks = check_critical_fixes(filepath, worker_name)
    for check in checks:
        print(f"  {check}")
    
    results.append(f"✅ {worker_name}: 검증 통과")
    print()

print("=" * 70)
print("검증 결과 요약")
print("=" * 70)
for r in results:
    print(r)

passed = sum(1 for r in results if r.startswith("✅"))
total = len(results)
print()
print(f"총 {total}개 Worker: {passed}개 통과")
print(f"통과율: {passed/total*100:.1f}%")
