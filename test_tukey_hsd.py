"""
Test script for Tukey HSD implementation
"""
import numpy as np
from scipy.stats import tukey_hsd as scipy_tukey
from itertools import combinations
import json

def _to_float_list(val):
    """Convert various array types to plain Python list of floats."""
    if val is None:
        return []
    try:
        arr = np.asarray(val)
        if hasattr(arr, 'mask'):
            arr = arr.data
        return [float(x) for x in arr.ravel()]
    except (TypeError, ValueError):
        return []

def clean_groups_helper(groups):
    """Remove NaN/None values from each group."""
    cleaned = []
    for group in groups:
        arr = np.asarray(group, dtype=float)
        valid = arr[~np.isnan(arr)]
        cleaned.append(valid)
    return cleaned

def tukey_hsd(groups):
    """Tukey HSD test implementation matching the worker."""
    clean_groups = clean_groups_helper(groups)

    for idx, group in enumerate(clean_groups):
        if len(group) == 0:
            raise ValueError(f"Group {idx} has no valid observations")

    try:
        result = scipy_tukey(*clean_groups)

        statistic_values = _to_float_list(getattr(result, 'statistic', None))
        p_values = _to_float_list(getattr(result, 'pvalue', None))

        ci_lower = []
        ci_upper = []
        confidence_level = None
        if hasattr(result, 'confidence_interval'):
            try:
                ci_result = result.confidence_interval()
            except Exception:
                ci_result = None
            if ci_result is not None:
                ci_lower = _to_float_list(getattr(ci_result, 'low', None))
                ci_upper = _to_float_list(getattr(ci_result, 'high', None))
                conf_attr = getattr(ci_result, 'confidence_level', None)
                if conf_attr is None:
                    conf_attr = getattr(ci_result, 'confidencelevel', None)
                if conf_attr is not None:
                    try:
                        confidence_level = float(conf_attr)
                    except (TypeError, ValueError):
                        confidence_level = None

        alpha_threshold = 0.05
        if confidence_level is not None:
            try:
                alpha_threshold = max(0.0, min(1.0, 1 - confidence_level))
            except TypeError:
                alpha_threshold = 0.05

        comparisons = []
        pairs = list(combinations(range(len(clean_groups)), 2))
        for idx, (group_i, group_j) in enumerate(pairs):
            mean_diff = float(np.mean(clean_groups[group_i]) - np.mean(clean_groups[group_j]))
            comparison = {
                'group1': int(group_i),
                'group2': int(group_j),
                'meanDiff': mean_diff
            }

            if idx < len(statistic_values):
                stat_val = statistic_values[idx]
                if isinstance(stat_val, (list, tuple)):
                    stat_val = stat_val[0] if len(stat_val) > 0 else 0.0
                comparison['statistic'] = float(stat_val)

            if idx < len(p_values):
                p_val = p_values[idx]
                if isinstance(p_val, (list, tuple)):
                    p_val = p_val[0] if len(p_val) > 0 else 1.0
                p_val = float(p_val)
                comparison['pValue'] = p_val
                comparison['pAdjusted'] = p_val
                comparison['significant'] = p_val < alpha_threshold
            else:
                comparison['pValue'] = None
                comparison['significant'] = False

            if idx < len(ci_lower) and idx < len(ci_upper):
                lower_val = ci_lower[idx]
                upper_val = ci_upper[idx]
                if isinstance(lower_val, (list, tuple)):
                    lower_val = lower_val[0] if len(lower_val) > 0 else 0.0
                if isinstance(upper_val, (list, tuple)):
                    upper_val = upper_val[0] if len(upper_val) > 0 else 0.0
                lower_val = float(lower_val)
                upper_val = float(upper_val)
                comparison['ci_lower'] = lower_val
                comparison['ci_upper'] = upper_val
                comparison['lower'] = lower_val
                comparison['upper'] = upper_val

            comparisons.append(comparison)

        aggregated_statistic = None
        if statistic_values:
            aggregated_statistic = statistic_values if len(statistic_values) > 1 else float(statistic_values[0])

        aggregated_pvalue = None
        if p_values:
            aggregated_pvalue = p_values if len(p_values) > 1 else float(p_values[0])

        confidence_interval = None
        if ci_lower and ci_upper:
            confidence_interval = {
                'lower': ci_lower,
                'upper': ci_upper,
            }

        return {
            'statistic': aggregated_statistic,
            'pvalue': aggregated_pvalue,
            'confidence_interval': confidence_interval,
            'comparisons': comparisons,
        }

    except Exception as e:
        raise RuntimeError(f"Tukey HSD calculation failed: {str(e)}")


# Sample data: 3 groups
group1 = [23, 25, 27, 24, 26]
group2 = [30, 32, 31, 33, 29]
group3 = [35, 37, 36, 38, 34]

print("Testing Tukey HSD with sample data...")
print(f"Group 1: {group1} (mean={np.mean(group1):.2f})")
print(f"Group 2: {group2} (mean={np.mean(group2):.2f})")
print(f"Group 3: {group3} (mean={np.mean(group3):.2f})")
print()

try:
    result = tukey_hsd([group1, group2, group3])

    print("[OK] Tukey HSD executed successfully!")
    print()
    print("Result structure:")
    print(json.dumps(result, indent=2, default=str))
    print()

    # Verify comparisons
    if 'comparisons' in result:
        print(f"Number of comparisons: {len(result['comparisons'])}")
        print()

        for i, comp in enumerate(result['comparisons']):
            print(f"Comparison {i+1}:")
            print(f"  Group {comp['group1']} vs Group {comp['group2']}")
            print(f"  Mean Difference: {comp.get('meanDiff', 'N/A'):.4f}")
            print(f"  P-value: {comp.get('pValue', 'N/A')}")
            print(f"  Significant: {comp.get('significant', 'N/A')}")
            if 'lower' in comp and 'upper' in comp:
                print(f"  95% CI: [{comp['lower']:.4f}, {comp['upper']:.4f}]")
            print()

    # Check required fields
    required_fields = ['comparisons']
    missing = [f for f in required_fields if f not in result]
    if missing:
        print(f"[WARNING] Missing fields: {missing}")
    else:
        print("[OK] All required fields present")

    # Check comparison fields
    if result.get('comparisons'):
        comp_fields = ['group1', 'group2', 'meanDiff', 'pValue', 'significant', 'lower', 'upper']
        first_comp = result['comparisons'][0]
        missing_comp = [f for f in comp_fields if f not in first_comp]
        if missing_comp:
            print(f"[WARNING] Missing comparison fields: {missing_comp}")
        else:
            print("[OK] All comparison fields present")

except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
