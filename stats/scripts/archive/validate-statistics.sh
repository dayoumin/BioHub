#!/bin/bash

# TESTING_GUIDE 자동 검증 스크립트
# Group 1-4 통계 페이지 L1-L3 검증 자동화

BASE_URL="http://localhost:3000"
REPORT_FILE="VALIDATION_REPORT.txt"

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 카운터
TOTAL_TESTS=0
PASSED_TESTS=0

# 통계 페이지 메타데이터
declare -A STATISTICS=(
    ["anova"]="ANOVA (분산 분석)"
    ["t-test"]="t-test (독립표본 t 검정)"
    ["one-sample-t"]="One-Sample t-test"
    ["normality-test"]="Normality Test (정규성 검정)"
    ["means-plot"]="Means Plot (평균 플롯)"
    ["ks-test"]="KS Test (Kolmogorov-Smirnov)"
    ["friedman"]="Friedman Test"
    ["kruskal-wallis"]="Kruskal-Wallis Test"
    ["mann-kendall"]="Mann-Kendall Trend Test"
    ["reliability"]="Reliability (Cronbach's Alpha)"
    ["regression"]="Regression (선형/로지스틱 회귀)"
)

# L1 검증: UI 렌더링 체크
validate_l1() {
    local stat_id=$1
    local stat_name=$2

    echo -e "${BLUE}▶️ $stat_name${NC}"
    echo -n "  [L1] UI 렌더링 체크... "

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # URL 확인
    local url="$BASE_URL/dashboard/statistics/$stat_id"
    local response=$(curl -sL -w "\n%{http_code}" "$url" -m 5)
    local http_code=$(echo "$response" | tail -n 1)
    local html=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        # 필수 엘리먼트 체크 (기본)
        if echo "$html" | grep -q "Analyze\|analyze\|분석"; then
            echo -e "${GREEN}✅ 통과${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            echo -e "${YELLOW}⚠️ 경고: Analyze 버튼 없음${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ 실패 (HTTP $http_code)${NC}"
        return 1
    fi
}

# 보고서 헤더 출력
print_header() {
    echo "================================================================================"
    echo "📊 통계 페이지 자동 검증 보고서"
    echo "================================================================================"
    echo ""
    echo "생성 시간: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "테스트 대상: Group 1-4 (11개 통계)"
    echo "테스트 레벨: L1 (UI 렌더링)"
    echo ""
}

# Group별 검증
validate_group() {
    local group_name=$1
    shift
    local -a stats=("$@")

    echo ""
    echo -e "${BLUE}${group_name}${NC}"
    echo "---"

    for stat_id in "${stats[@]}"; do
        validate_l1 "$stat_id" "${STATISTICS[$stat_id]}"
    done
}

# 최종 보고서
print_summary() {
    local percentage=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        percentage=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi

    echo ""
    echo "================================================================================"
    echo -e "${GREEN}📈 최종 결과: $PASSED_TESTS/$TOTAL_TESTS 통과 ($percentage%)${NC}"
    echo "================================================================================"
}

# 메인 실행
main() {
    print_header | tee $REPORT_FILE

    # Group 1: Quick Wins (6개)
    validate_group "Group 1: Quick Wins (6개)" \
        "anova" "t-test" "one-sample-t" "normality-test" "means-plot" "ks-test" | tee -a $REPORT_FILE

    # Group 2: Medium Complexity (2개)
    validate_group "Group 2: Medium Complexity (2개)" \
        "friedman" "kruskal-wallis" | tee -a $REPORT_FILE

    # Group 3: Complex Analysis (2개)
    validate_group "Group 3: Complex Analysis (2개)" \
        "mann-kendall" "reliability" | tee -a $REPORT_FILE

    # Group 4: Critical Complexity (1개)
    validate_group "Group 4: Critical Complexity (1개)" \
        "regression" | tee -a $REPORT_FILE

    # 최종 요약
    print_summary | tee -a $REPORT_FILE

    echo ""
    echo "📄 보고서 저장: $REPORT_FILE"
}

# 실행
main
