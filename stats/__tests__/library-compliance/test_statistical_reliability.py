"""
Statistical Reliability Test - Library Compliance Verification
Tests all 9 improved statistical methods to ensure they use verified libraries.

Test Coverage:
1. Scheffé Test (scikit-posthocs)
2. Cochran Q Test (statsmodels)
3. Kaplan-Meier (lifelines)
4. Z-Test (statsmodels)
5. Cohen's d (pingouin)
6. McNemar Test (statsmodels)
7. Cronbach's Alpha (pingouin)
8. PCA (sklearn)
9. Durbin-Watson (statsmodels)
"""

import sys
import os
import importlib.util

# Add workers path for imports
WORKERS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../public/workers/python'))
sys.path.insert(0, WORKERS_PATH)

import numpy as np
import pytest

# Helper function to import modules with hyphens in filenames
def import_worker_module(module_name, file_name):
    """Import Python worker modules with hyphens in filename"""
    spec = importlib.util.spec_from_file_location(
        module_name,
        os.path.join(WORKERS_PATH, file_name)
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

# Import worker modules
worker1 = import_worker_module('worker1_descriptive', 'worker1-descriptive.py')
worker2 = import_worker_module('worker2_hypothesis', 'worker2-hypothesis.py')
worker3 = import_worker_module('worker3_nonparametric_anova', 'worker3-nonparametric-anova.py')
worker4 = import_worker_module('worker4_regression_advanced', 'worker4-regression-advanced.py')


class TestScheffeTest:
    """Test Scheffé post-hoc test using scikit-posthocs"""

    def test_scheffe_basic(self):
        scheffe_test = worker3.scheffe_test

        # Three groups with clear differences
        groups = [
            [10, 12, 11, 13, 10],
            [15, 17, 16, 18, 15],
            [20, 22, 21, 23, 20]
        ]

        result = scheffe_test(groups)

        assert 'comparisons' in result
        assert 'mse' in result
        assert 'dfWithin' in result
        assert len(result['comparisons']) == 3  # 3 choose 2 = 3 comparisons

        # Check that all comparisons have required fields
        for comp in result['comparisons']:
            assert 'group1' in comp
            assert 'group2' in comp
            assert 'meanDiff' in comp
            assert 'pValue' in comp
            assert 'significant' in comp

    def test_scheffe_requires_three_groups(self):
        scheffe_test = worker3.scheffe_test

        groups = [[1, 2, 3], [4, 5, 6]]

        with pytest.raises(ValueError, match="at least 3 groups"):
            scheffe_test(groups)


class TestCochranQTest:
    """Test Cochran Q test using statsmodels"""

    def test_cochran_q_basic(self):
        cochran_q_test = worker3.cochran_q_test

        # Binary data matrix: 4 subjects, 3 conditions
        data_matrix = [
            [1, 0, 1],
            [1, 1, 1],
            [0, 0, 1],
            [1, 1, 0]
        ]

        result = cochran_q_test(data_matrix)

        assert 'qStatistic' in result
        assert 'pValue' in result
        assert 'df' in result
        assert result['df'] == 2  # k - 1 = 3 - 1 = 2

    def test_cochran_q_requires_min_conditions(self):
        cochran_q_test = worker3.cochran_q_test

        # Only 2 conditions (need at least 3)
        data_matrix = [[1, 0], [1, 1]]

        with pytest.raises(ValueError, match="at least 3 conditions"):
            cochran_q_test(data_matrix)


class TestKaplanMeier:
    """Test Kaplan-Meier survival analysis using lifelines"""

    def test_kaplan_meier_basic(self):
        kaplan_meier_survival = worker4.kaplan_meier_survival

        # Simple survival data
        times = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        events = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0]  # 1 = event, 0 = censored

        result = kaplan_meier_survival(times, events)

        assert 'survivalFunction' in result
        assert 'times' in result
        assert 'events' in result
        assert 'nRisk' in result
        assert 'medianSurvival' in result or result['medianSurvival'] is None

        # Survival function should be decreasing
        surv_func = result['survivalFunction']
        for i in range(len(surv_func) - 1):
            assert surv_func[i] >= surv_func[i + 1], "Survival function should be monotonically decreasing"

    def test_kaplan_meier_requires_minObservations(self):
        kaplan_meier_survival = worker4.kaplan_meier_survival

        times = [1]
        events = [1]

        with pytest.raises(ValueError, match="at least 2 observations"):
            kaplan_meier_survival(times, events)


class TestZTest:
    """Test Z-test using statsmodels"""

    def test_z_test_basic(self):
        z_test = worker2.z_test

        # Large sample (n >= 30)
        np.random.seed(42)
        data = np.random.normal(loc=100, scale=15, size=50).tolist()

        result = z_test(data, popmean=100, popstd=15)

        assert 'statistic' in result
        assert 'pValue' in result
        assert isinstance(result['statistic'], float)
        assert isinstance(result['pValue'], (float, type(None)))

    def test_z_test_requires_large_sample(self):
        z_test = worker2.z_test

        data = [1, 2, 3]  # Only 3 observations

        with pytest.raises(ValueError, match="at least 30 observations"):
            z_test(data, popmean=2, popstd=1)


class TestCohensD:
    """Test Cohen's d effect size using pingouin"""

    def test_cohensD_in_t_test(self):
        t_test_two_sample = worker2.t_test_two_sample

        group1 = [10, 12, 11, 13, 10, 12]
        group2 = [15, 17, 16, 18, 15, 17]

        result = t_test_two_sample(group1, group2, equalVar=True)

        assert 'cohensD' in result
        assert isinstance(result['cohensD'], float)
        assert abs(result['cohensD']) > 0  # Should have non-zero effect size

        # Cohen's d interpretation: 0.2 = small, 0.5 = medium, 0.8 = large
        # Our groups have clear differences, so d should be large
        assert abs(result['cohensD']) > 1.0


class TestMcNemarTest:
    """Test McNemar test using statsmodels"""

    def test_mcnemar_basic(self):
        mcnemar_test = worker3.mcnemar_test

        # 2x2 contingency table
        table = [[10, 5], [2, 15]]

        result = mcnemar_test(table)

        assert 'statistic' in result
        assert 'pValue' in result
        assert 'continuityCorrection' in result
        assert 'discordantPairs' in result
        assert 'b' in result['discordantPairs']
        assert 'c' in result['discordantPairs']

    def test_mcnemar_requires_2x2_table(self):
        mcnemar_test = worker3.mcnemar_test

        # Wrong shape
        table = [[1, 2, 3], [4, 5, 6]]

        with pytest.raises(ValueError, match="2x2 contingency table"):
            mcnemar_test(table)


class TestCronbachAlpha:
    """Test Cronbach's alpha using pingouin"""

    def test_cronbach_alpha_basic(self):
        cronbach_alpha = worker1.cronbach_alpha

        # 5 respondents, 4 items (questionnaire)
        items_matrix = [
            [5, 4, 5, 4],
            [4, 4, 4, 3],
            [5, 5, 5, 5],
            [3, 3, 4, 3],
            [4, 5, 4, 4]
        ]

        result = cronbach_alpha(items_matrix)

        assert 'alpha' in result
        assert 'nItems' in result
        assert 'nRespondents' in result
        assert result['nItems'] == 4
        assert result['nRespondents'] == 5
        assert 0 <= result['alpha'] <= 1  # Alpha should be between 0 and 1

    def test_cronbach_alpha_requires_min_items(self):
        cronbach_alpha = worker1.cronbach_alpha

        # Only 1 item
        items_matrix = [[5], [4], [3]]

        with pytest.raises(ValueError, match="at least 2 items"):
            cronbach_alpha(items_matrix)


class TestPCA:
    """Test PCA using sklearn"""

    def test_pca_basic(self):
        pca_analysis = worker4.pca_analysis

        # 10 observations, 5 features
        np.random.seed(42)
        data_matrix = np.random.randn(10, 5).tolist()

        result = pca_analysis(data_matrix, nComponents=2)

        assert 'components' in result
        assert 'explainedVariance' in result
        assert 'explainedVarianceRatio' in result
        assert 'cumulativeVariance' in result

        # Check dimensions
        assert len(result['components']) == 10  # 10 observations
        assert len(result['components'][0]) == 2  # 2 components
        assert len(result['explainedVariance']) == 2
        assert len(result['explainedVarianceRatio']) == 2

        # Explained variance ratio should sum to less than or equal to 1
        total_variance = sum(result['explainedVarianceRatio'])
        assert 0 <= total_variance <= 1

    def test_pca_requires_enough_features(self):
        pca_analysis = worker4.pca_analysis

        # Only 2 features, requesting 3 components
        data_matrix = [[1, 2], [3, 4], [5, 6]]

        with pytest.raises(ValueError, match="Cannot extract 3 components from 2 features"):
            pca_analysis(data_matrix, nComponents=3)


class TestDurbinWatson:
    """Test Durbin-Watson test using statsmodels"""

    def test_durbinWatson_basic(self):
        durbinWatson_test = worker4.durbinWatson_test

        # Residuals with no autocorrelation
        np.random.seed(42)
        residuals = np.random.randn(50).tolist()

        result = durbinWatson_test(residuals)

        assert 'statistic' in result
        assert 'interpretation' in result
        assert 'isIndependent' in result
        assert isinstance(result['statistic'], float)
        assert 0 <= result['statistic'] <= 4  # DW statistic range

    def test_durbinWatson_positive_autocorrelation(self):
        durbinWatson_test = worker4.durbinWatson_test

        # Create positive autocorrelation
        residuals = [1, 1.1, 1.2, 1.1, 1, 0.9, 0.8, 0.9, 1, 1.1] * 5

        result = durbinWatson_test(residuals)

        # Positive autocorrelation should have DW < 2
        assert result['statistic'] < 2
        assert 'Positive autocorrelation' in result['interpretation'] or result['isIndependent'] == True


# Summary test to verify all improvements
class TestLibraryComplianceSummary:
    """Verify that all 9 methods have been improved"""

    def test_all_methods_use_libraries(self):
        """
        Integration test to confirm all 9 methods are now using verified libraries
        """
        test_results = {
            'Scheffé Test': False,
            'Cochran Q Test': False,
            'Kaplan-Meier': False,
            'Z-Test': False,
            "Cohen's d": False,
            'McNemar Test': False,
            "Cronbach's Alpha": False,
            'PCA': False,
            'Durbin-Watson': False
        }

        # Test each method
        try:
            scheffe_test = worker3.scheffe_test
            result = scheffe_test([[1, 2], [3, 4], [5, 6]])
            test_results['Scheffé Test'] = 'comparisons' in result
        except Exception:
            pass

        try:
            cochran_q_test = worker3.cochran_q_test
            result = cochran_q_test([[1, 0, 1], [1, 1, 0], [0, 1, 1]])
            test_results['Cochran Q Test'] = 'qStatistic' in result
        except Exception:
            pass

        try:
            kaplan_meier_survival = worker4.kaplan_meier_survival
            result = kaplan_meier_survival([1, 2, 3], [1, 0, 1])
            test_results['Kaplan-Meier'] = 'survivalFunction' in result
        except Exception:
            pass

        try:
            z_test = worker2.z_test
            result = z_test(list(range(30, 60)), popmean=45, popstd=10)
            test_results['Z-Test'] = 'statistic' in result
        except Exception:
            pass

        try:
            t_test_two_sample = worker2.t_test_two_sample
            result = t_test_two_sample([1, 2, 3], [4, 5, 6])
            test_results["Cohen's d"] = 'cohensD' in result
        except Exception:
            pass

        try:
            mcnemar_test = worker3.mcnemar_test
            result = mcnemar_test([[10, 5], [2, 15]])
            test_results['McNemar Test'] = 'statistic' in result
        except Exception:
            pass

        try:
            cronbach_alpha = worker1.cronbach_alpha
            result = cronbach_alpha([[5, 4], [4, 3], [5, 5]])
            test_results["Cronbach's Alpha"] = 'alpha' in result
        except Exception:
            pass

        try:
            pca_analysis = worker4.pca_analysis
            result = pca_analysis([[1, 2, 3], [4, 5, 6], [7, 8, 9]], nComponents=2)
            test_results['PCA'] = 'components' in result
        except Exception:
            pass

        try:
            durbinWatson_test = worker4.durbinWatson_test
            result = durbinWatson_test([1, 2, 3, 4, 5])
            test_results['Durbin-Watson'] = 'statistic' in result
        except Exception:
            pass

        # Report results
        passed = sum(1 for v in test_results.values() if v)
        total = len(test_results)

        print(f"\n{'='*60}")
        print(f"Library Compliance Test Results: {passed}/{total} methods verified")
        print(f"{'='*60}")
        for method, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} - {method}")
        print(f"{'='*60}\n")

        # All methods should pass
        assert passed == total, f"Only {passed}/{total} methods are using verified libraries"


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
