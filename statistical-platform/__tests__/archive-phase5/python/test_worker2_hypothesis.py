"""
Unit tests for Worker 2: Hypothesis Testing

Tests hypothesis testing functions using SciPy/statsmodels.
"""

import sys
import os
import numpy as np
import importlib.util

worker_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../public/workers/python'))
spec = importlib.util.spec_from_file_location(
    "worker2_hypothesis",
    os.path.join(worker_path, "worker2-hypothesis.py")
)
worker2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker2)

t_test_two_sample = worker2.t_test_two_sample
t_test_paired = worker2.t_test_paired
correlation_test = worker2.correlation_test
z_test = worker2.z_test


class TestTTestTwoSample:
    """Test t_test_two_sample function"""

    def test_basic_t_test(self):
        """Test basic two-sample t-test"""
        group1 = [1, 2, 3, 4, 5]
        group2 = [2, 3, 4, 5, 6]
        result = t_test_two_sample(group1, group2)

        assert 'statistic' in result
        assert 'pValue' in result
        assert 'cohensD' in result
        assert 'mean1' in result
        assert 'mean2' in result
        assert 'n1' in result
        assert 'n2' in result
        assert result['n1'] == 5
        assert result['n2'] == 5

    def test_unequal_variances(self):
        """Test with unequal variances (Welch's t-test)"""
        group1 = [1, 2, 3, 4, 5]
        group2 = [10, 20, 30, 40, 50]
        result = t_test_two_sample(group1, group2, equal_var=False)

        assert 'pValue' in result
        assert result['pValue'] is not None


class TestTTestPaired:
    """Test t_test_paired function"""

    def test_basic_paired_test(self):
        """Test basic paired t-test"""
        before = [1, 2, 3, 4, 5]
        after = [2, 3, 4, 5, 6]
        result = t_test_paired(before, after)

        assert 'statistic' in result
        assert 'pValue' in result
        assert 'meanDiff' in result
        assert 'nPairs' in result
        assert result['nPairs'] == 5

    def test_with_none_values(self):
        """Test handling of None values in paired test"""
        before = [1, None, 3, 4, 5]
        after = [2, 3, None, 5, 6]
        result = t_test_paired(before, after)

        # Should have 3 valid pairs: (1,2), (4,5), (5,6)
        assert result['nPairs'] == 3


class TestCorrelationTest:
    """Test correlation_test function"""

    def test_pearson_correlation(self):
        """Test Pearson correlation"""
        x = [1, 2, 3, 4, 5]
        y = [2, 4, 6, 8, 10]
        result = correlation_test(x, y, method='pearson')

        assert 'correlation' in result
        assert 'pValue' in result
        assert 'method' in result
        assert result['method'] == 'pearson'
        assert abs(result['correlation'] - 1.0) < 0.01  # Perfect positive correlation

    def test_spearman_correlation(self):
        """Test Spearman correlation"""
        x = [1, 2, 3, 4, 5]
        y = [1, 4, 9, 16, 25]  # Non-linear but monotonic
        result = correlation_test(x, y, method='spearman')

        assert result['method'] == 'spearman'
        assert abs(result['correlation']) > 0.9


class TestZTest:
    """Test z_test function"""

    def test_basic_z_test(self):
        """Test basic z-test"""
        np.random.seed(42)
        data = np.random.normal(100, 15, 100).tolist()
        result = z_test(data, popmean=100, popstd=15)

        assert 'statistic' in result
        assert 'pValue' in result
        assert result['pValue'] is not None


class TestChiSquareTest:
    """Test chi_square_test function"""

    def test_basic_chi_square(self):
        """Test basic chi-square test"""
        observed_matrix = [
            [10, 20, 30],
            [15, 25, 35]
        ]
        result = worker2.chi_square_test(observed_matrix)

        assert 'statistic' in result
        assert 'pValue' in result
        assert 'df' in result
        assert 'expectedMatrix' in result


class TestBinomialTest:
    """Test binomial_test function"""

    def test_basic_binomial(self):
        """Test basic binomial test"""
        result = worker2.binomial_test(
            success_count=60,
            total_count=100,
            probability=0.5
        )

        assert 'pValue' in result
        assert 'successCount' in result
        assert 'totalCount' in result


class TestLeveneTest:
    """Test levene_test function"""

    def test_variance_homogeneity(self):
        """Test Levene's test for variance homogeneity"""
        group1 = [1, 2, 3, 4, 5]
        group2 = [2, 3, 4, 5, 6]
        group3 = [3, 4, 5, 6, 7]
        result = worker2.levene_test([group1, group2, group3])

        assert 'statistic' in result
        assert 'pValue' in result
        assert 'equalVariance' in result


class TestChiSquareGoodnessTest:
    """Test chi_square_goodness_test function"""

    def test_goodness_of_fit(self):
        """Test chi-square goodness of fit"""
        observed = [10, 20, 30, 40]
        expected = [25, 25, 25, 25]
        result = worker2.chi_square_goodness_test(observed, expected)

        assert 'chiSquare' in result
        assert 'pValue' in result
        assert 'degreesOfFreedom' in result
        assert 'reject' in result
