# scipy.stats.ttest_ind

Independent t-test for two samples.

## Description

The independent t-test compares the means of two independent groups to determine whether there is statistical evidence that the associated population means are significantly different.

## Parameters

- `a`: array_like - First sample
- `b`: array_like - Second sample
- `equal_var`: bool (default=True) - If True, performs standard independent t-test assuming equal population variances

## Returns

- `statistic`: float - The t-statistic
- `pvalue`: float - The two-tailed p-value

## Example

```python
from scipy import stats
import numpy as np

# Generate two samples
sample1 = np.random.normal(100, 10, 30)
sample2 = np.random.normal(105, 10, 30)

# Perform t-test
statistic, pvalue = stats.ttest_ind(sample1, sample2)

print(f"T-statistic: {statistic}")
print(f"P-value: {pvalue}")
```

## Interpretation

- If p-value < 0.05: Reject null hypothesis (means are significantly different)
- If p-value >= 0.05: Fail to reject null hypothesis (no significant difference)

## References

- SciPy Documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html
- Statistical Methods: Student's t-test
