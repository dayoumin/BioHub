"""
Unit tests for Worker 4: Regression & Advanced Analysis

Tests regression and advanced statistical analysis functions.
"""

import sys
import os
import importlib.util

worker_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../public/workers/python'))
spec = importlib.util.spec_from_file_location(
    "worker4_regression_advanced",
    os.path.join(worker_path, "worker4-regression-advanced.py")
)
worker4 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker4)

linear_regression = worker4.linear_regression
pca_analysis = worker4.pca_analysis


class TestLinearRegression:
    """Test linear_regression function"""

    def test_basic_regression(self):
        """Test basic linear regression"""
        x = [1, 2, 3, 4, 5]
        y = [2, 4, 6, 8, 10]
        result = linear_regression(x, y)

        assert 'slope' in result
        assert 'intercept' in result
        assert 'rSquared' in result
        assert 'pValue' in result
        assert 'nPairs' in result
        assert abs(result['slope'] - 2.0) < 0.01
        assert abs(result['intercept']) < 0.01
        assert abs(result['rSquared'] - 1.0) < 0.01


class TestPCAAnalysis:
    """Test pca_analysis function"""

    def test_basic_pca(self):
        """Test basic PCA"""
        import numpy as np

        np.random.seed(42)
        data = np.random.randn(10, 5)  # 10 samples, 5 features
        result = pca_analysis(data.tolist(), n_components=2)

        assert 'components' in result
        assert 'explainedVariance' in result
        assert 'explainedVarianceRatio' in result
        assert len(result['components']) == 10
        assert len(result['explainedVarianceRatio']) == 2


class TestMultipleRegression:
    """Test multiple_regression function"""

    def test_basic_multiple_regression(self):
        """Test basic multiple regression - requires statsmodels"""
        pytest = __import__('pytest')

        try:
            import statsmodels
        except ImportError:
            pytest.skip("statsmodels not installed")

        X = [
            [1, 2],
            [2, 3],
            [3, 4],
            [4, 5],
            [5, 6]
        ]
        y = [3, 5, 7, 9, 11]
        result = worker4.multiple_regression(X, y)

        assert 'coefficients' in result
        assert 'rSquared' in result
        assert 'pValues' in result
        assert 'nPredictors' in result
        assert result['nPredictors'] == 2


class TestLogisticRegression:
    """Test logistic_regression function"""

    def test_basic_logistic(self):
        """Test basic logistic regression - requires statsmodels"""
        pytest = __import__('pytest')

        try:
            import statsmodels
        except ImportError:
            pytest.skip("statsmodels not installed")

        # More realistic data to avoid perfect separation
        X = [
            [1, 2],
            [2, 3],
            [2, 2],
            [3, 4],
            [4, 5],
            [4, 4],
            [5, 6],
            [6, 7]
        ]
        y = [0, 0, 0, 0, 1, 1, 1, 1]
        result = worker4.logistic_regression(X, y)

        assert 'coefficients' in result
        assert 'predictions' in result
        assert 'accuracy' in result
        assert 'pseudoRSquared' in result


class TestCurveEstimation:
    """Test curve_estimation function"""

    def test_linear_curve(self):
        """Test linear curve estimation"""
        x = [1, 2, 3, 4, 5]
        y = [2, 4, 6, 8, 10]
        result = worker4.curve_estimation(x, y, model_type='linear')

        assert 'modelType' in result
        assert 'coefficients' in result
        assert 'rSquared' in result
        assert result['modelType'] == 'linear'
        assert abs(result['rSquared'] - 1.0) < 0.01
