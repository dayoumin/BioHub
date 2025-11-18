"""
Python Worker JSON 직렬화 테스트 헬퍼 스크립트

사용법:
  python test-worker-json.py worker_num function_name args_json

예시:
  python test-worker-json.py 1 normality_test "[1,2,3,4,5]"
  python test-worker-json.py 2 levene_test "[[1,2,3],[2,3,4]]"
"""

import sys
import json
import os

def main():
    if len(sys.argv) < 4:
        print("Usage: python test-worker-json.py worker_num function_name args_json", file=sys.stderr)
        sys.exit(1)

    worker_num = sys.argv[1]
    function_name = sys.argv[2]
    args_json = sys.argv[3]

    # Worker 경로 추가
    test_dir = os.path.dirname(__file__)
    project_root = os.path.dirname(os.path.dirname(test_dir))
    worker_dir = os.path.join(project_root, 'public/workers/python')
    sys.path.insert(0, worker_dir)

    # Worker 파일 로드
    worker_file = f'worker{worker_num}-*.py'
    worker_files = {
        '1': 'worker1-descriptive.py',
        '2': 'worker2-hypothesis.py',
        '3': 'worker3-nonparametric-anova.py',
        '4': 'worker4-regression-advanced.py'
    }

    worker_path = os.path.join(worker_dir, worker_files[worker_num])

    with open(worker_path, 'r', encoding='utf-8') as f:
        exec(f.read(), globals())

    # 함수 실행
    args = json.loads(args_json)

    # args가 리스트의 리스트인 경우 (예: [[1,2,3],[2,3,4]])
    if function_name in ['levene_test', 'bartlett_test', 'mcnemar_test']:
        result = globals()[function_name](args)
    # args가 단일 리스트인 경우 (예: [1,2,3,4,5])
    elif function_name in ['normality_test', 'kolmogorov_smirnov_test']:
        result = globals()[function_name](args)
    # discriminant_analysis: X, y
    elif function_name == 'discriminant_analysis':
        result = globals()[function_name](args[0], args[1])
    else:
        result = globals()[function_name](args)

    # Boolean 필드 찾기
    bool_field = None
    bool_value = None

    if 'isNormal' in result:
        bool_field = 'isNormal'
        bool_value = result['isNormal']
    elif 'equalVariance' in result:
        bool_field = 'equalVariance'
        bool_value = result['equalVariance']
    elif 'continuityCorrection' in result:
        bool_field = 'continuityCorrection'
        bool_value = result['continuityCorrection']
    elif 'classificationResults' in result and len(result['classificationResults']) > 0:
        bool_field = 'correct'
        bool_value = result['classificationResults'][0]['correct']

    # 출력
    if bool_value is not None:
        print(f'TYPE:{type(bool_value).__name__}')
    print(f'JSON:{json.dumps(result)}')

if __name__ == '__main__':
    main()
