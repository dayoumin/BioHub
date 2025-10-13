import ast
from pathlib import Path

workers = [
    'worker1-descriptive.py',
    'worker2-hypothesis.py',
    'worker3-nonparametric-anova.py',
    'worker4-regression-advanced.py'
]

print('Worker 1-4 Validation')
print('=' * 60)

for filename in workers:
    with open(filename, 'r', encoding='utf-8') as f:
        code = f.read()
    ast.parse(code)
    
    has_binomtest = 'from scipy.stats import binomtest' in code
    has_old_binom = 'stats.binom_test' in code
    has_pair = 'for v1, v2 in zip(' in code
    has_try = 'try:' in code
    
    print(filename)
    print('  Syntax: OK')
    if 'worker1' in filename or 'worker2' in filename:
        print('  binomtest:', 'OK' if has_binomtest else 'MISS')
        if has_old_binom:
            print('  OLD binom_test FOUND!')
    if 'worker' in filename:
        print('  Pair pattern:', 'OK' if has_pair else 'NONE')
        print('  Error handling:', 'OK' if has_try else 'NONE')
    print()
