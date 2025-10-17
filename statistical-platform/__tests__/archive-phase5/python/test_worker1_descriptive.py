"""
Unit tests for Worker 1: Descriptive Statistics

Tests basic functionality of descriptive statistics functions
using SciPy/NumPy libraries.
"""

import sys
import os

# Add worker directory to path
worker_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../public/workers/python'))
sys.path.insert(0, worker_path)

# Import worker module with hyphen in filename
import importlib.util
spec = importlib.util.spec_from_file_location(
    "worker1_descriptive",
    os.path.join(worker_path, "worker1-descriptive.py")
)
worker1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker1)

descriptive_stats = worker1.descriptive_stats
normality_test = worker1.normality_test
outlier_detection = worker1.outlier_detection
frequency_analysis = worker1.frequency_analysis


class TestDescriptiveStats:
    """Test descriptive_stats function"""

    def test_basic_stats(self):
        """Test basic descriptive statistics with valid data"""
        data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        result = descriptive_stats(data)

        assert result['n'] == 10
        assert result['mean'] == 5.5
        assert result['median'] == 5.5
        assert result['min'] == 1
        assert result['max'] == 10
        assert 'std' in result
        assert 'variance' in result
        assert 'skewness' in result
        assert 'kurtosis' in result

    def test_with_none_values(self):
        """Test handling of None values"""
        data = [1, 2, None, 4, 5, None, 7, 8, 9, 10]
        result = descriptive_stats(data)

        assert result['n'] == 8  # Should exclude 2 None values
        assert result['min'] == 1
        assert result['max'] == 10

    def test_empty_data(self):
        """Test error handling for empty data"""
        import pytest

        with pytest.raises(ValueError, match="No valid data"):
            descriptive_stats([])

    def test_all_none(self):
        """Test error handling when all values are None"""
        import pytest

        with pytest.raises(ValueError, match="No valid data"):
            descriptive_stats([None, None, None])


class TestNormalityTest:
    """Test normality_test function"""

    def test_normal_distribution(self):
        """Test with normally distributed data"""
        import numpy as np
        np.random.seed(42)
        data = np.random.normal(0, 1, 100).tolist()

        result = normality_test(data)

        assert 'statistic' in result
        assert 'pValue' in result
        assert 'isNormal' in result
        assert 'alpha' in result
        assert result['alpha'] == 0.05

    def test_minimum_sample_size(self):
        """Test minimum sample size requirement"""
        import pytest

        with pytest.raises(ValueError, match="at least 3 observations"):
            normality_test([1, 2])


class TestOutlierDetection:
    """Test outlier_detection function"""

    def test_iqr_method(self):
        """Test IQR method for outlier detection"""
        data = [1, 2, 3, 4, 5, 100]  # 100 is an outlier
        result = outlier_detection(data, method='iqr')

        assert 'outlierIndices' in result
        assert 'outlierCount' in result
        assert 'method' in result
        assert result['method'] == 'iqr'
        assert result['outlierCount'] > 0

    def test_zscore_method(self):
        """Test z-score method for outlier detection"""
        data = [1, 2, 3, 4, 5, 100]
        result = outlier_detection(data, method='zscore')

        assert result['method'] == 'zscore'
        assert 'outlierIndices' in result


class TestFrequencyAnalysis:
    """Test frequency_analysis function"""

    def test_basic_frequency(self):
        """Test basic frequency analysis"""
        values = ['A', 'B', 'A', 'C', 'B', 'A']
        result = frequency_analysis(values)

        assert 'categories' in result
        assert 'frequencies' in result
        assert 'percentages' in result
        assert 'cumulativePercentages' in result
        assert 'total' in result
        assert result['total'] == 6
        assert result['uniqueCount'] == 3

    def test_numeric_values(self):
        """Test frequency analysis with numbers"""
        values = [1, 2, 1, 3, 2, 1]
        result = frequency_analysis(values)

        assert result['total'] == 6
        assert len(result['categories']) == 3


class TestCrosstabAnalysis:
    """Test crosstab_analysis function"""

    def test_basic_crosstab(self):
        """Test basic crosstab analysis"""
        row_values = ['A', 'A', 'B', 'B', 'C', 'C']
        col_values = ['X', 'Y', 'X', 'Y', 'X', 'Y']
        result = worker1.crosstab_analysis(row_values, col_values)

        assert 'rowCategories' in result
        assert 'colCategories' in result
        assert 'observedMatrix' in result
        assert 'grandTotal' in result
        assert result['grandTotal'] == 6


class TestOneSampleProportionTest:
    """Test one_sample_proportion_test function"""

    def test_basic_proportion_test(self):
        """Test basic one-sample proportion test"""
        result = worker1.one_sample_proportion_test(
            success_count=60,
            total_count=100,
            null_proportion=0.5
        )

        assert 'sampleProportion' in result
        assert 'zStatistic' in result
        assert 'pValueExact' in result
        assert 'significant' in result
        assert result['sampleProportion'] == 0.6


class TestCronbachAlpha:
    """Test cronbach_alpha function"""

    def test_basic_reliability(self):
        """Test basic reliability analysis"""
        # 5 respondents, 3 items
        items_matrix = [
            [5, 4, 5],
            [4, 4, 4],
            [3, 3, 3],
            [5, 5, 5],
            [4, 3, 4]
        ]
        result = worker1.cronbach_alpha(items_matrix)

        assert 'alpha' in result
        assert 'nItems' in result
        assert 'nRespondents' in result
        assert result['nItems'] == 3
        assert result['nRespondents'] == 5


class TestKolmogorovSmirnovTest:
    """Test kolmogorov_smirnov_test function"""

    def test_ks_test(self):
        """Test K-S normality test"""
        import numpy as np
        np.random.seed(42)
        data = np.random.normal(0, 1, 100).tolist()
        result = worker1.kolmogorov_smirnov_test(data)

        assert 'statistic' in result
        assert 'pValue' in result
        assert 'isNormal' in result
