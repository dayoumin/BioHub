"""
Unit tests for Worker 3: Nonparametric & ANOVA

Tests nonparametric tests and ANOVA functions.
"""

import sys
import os
import importlib.util

worker_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../public/workers/python'))
spec = importlib.util.spec_from_file_location(
    "worker3_nonparametric_anova",
    os.path.join(worker_path, "worker3-nonparametric-anova.py")
)
worker3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker3)

mann_whitney_test = worker3.mann_whitney_test
wilcoxon_test = worker3.wilcoxon_test
one_way_anova = worker3.one_way_anova


class TestMannWhitneyTest:
    """Test mann_whitney_test function"""

    def test_basic_test(self):
        """Test basic Mann-Whitney U test"""
        group1 = [1, 2, 3, 4, 5]
        group2 = [3, 4, 5, 6, 7]
        result = mann_whitney_test(group1, group2)

        assert 'statistic' in result
        assert 'pValue' in result


class TestWilcoxonTest:
    """Test wilcoxon_test function"""

    def test_basic_test(self):
        """Test basic Wilcoxon signed-rank test"""
        before = [1, 2, 3, 4, 5]
        after = [2, 3, 4, 5, 6]
        result = wilcoxon_test(before, after)

        assert 'statistic' in result
        assert 'pValue' in result
        assert 'nPairs' in result


class TestOneWayANOVA:
    """Test one_way_anova function"""

    def test_basic_anova(self):
        """Test basic one-way ANOVA"""
        group1 = [1, 2, 3, 4, 5]
        group2 = [3, 4, 5, 6, 7]
        group3 = [5, 6, 7, 8, 9]
        result = one_way_anova([group1, group2, group3])

        assert 'fStatistic' in result
        assert 'pValue' in result
        assert 'df1' in result
        assert 'df2' in result


class TestKruskalWallisTest:
    """Test kruskal_wallis_test function"""

    def test_basic_kruskal(self):
        """Test basic Kruskal-Wallis test"""
        group1 = [1, 2, 3, 4, 5]
        group2 = [3, 4, 5, 6, 7]
        group3 = [5, 6, 7, 8, 9]
        result = worker3.kruskal_wallis_test([group1, group2, group3])

        assert 'statistic' in result
        assert 'pValue' in result
        assert 'df' in result


class TestFriedmanTest:
    """Test friedman_test function"""

    def test_basic_friedman(self):
        """Test basic Friedman test"""
        group1 = [1, 2, 3, 4, 5]
        group2 = [2, 3, 4, 5, 6]
        group3 = [3, 4, 5, 6, 7]
        result = worker3.friedman_test([group1, group2, group3])

        assert 'statistic' in result
        assert 'pValue' in result


class TestSignTest:
    """Test sign_test function"""

    def test_basic_sign_test(self):
        """Test basic sign test"""
        before = [10, 12, 14, 16, 18, 20, 22]
        after = [12, 14, 15, 18, 20, 22, 24]
        result = worker3.sign_test(before, after)

        assert 'nPositive' in result
        assert 'nNegative' in result
        assert 'nTies' in result
        assert 'pValue' in result
