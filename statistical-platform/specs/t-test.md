# t-test Page - Comprehensive Test Plan

## Application Overview

The t-test page (`/statistics/t-test`) is a statistical analysis tool that performs three types of t-tests:
- **One-Sample t-test**: Compare sample mean to a known value
- **Independent Samples t-test**: Compare means of two independent groups
- **Paired Samples t-test**: Compare means of paired/matched samples

### Page Structure (4 Steps)

1. **Step 1**: Test Type Selection (검정 유형 선택)
2. **Step 2**: Data Upload (데이터 업로드) - Raw data OR Summary statistics
3. **Step 3**: Variable Selection (변수 선택)
4. **Step 4**: Results (결과 확인)

### Input Modes

- **Raw Data (원시데이터)**: Upload CSV/Excel file (max 100,000 rows)
- **Summary Statistics (요약통계)**: Enter mean, SD, N directly

---

## Test Scenarios

### 1. Test Type Selection

**Seed:** `e2e/seed.spec.ts`

#### 1.1 Select One-Sample t-test
**Steps:**
1. Navigate to `/statistics/t-test`
2. Wait for page to load completely
3. Click on "일표본 t-검정" card

**Expected Results:**
- Page navigates to Step 2
- Left sidebar shows Step 1 as completed (checkmark)
- Step 2 "데이터 업로드" is highlighted

#### 1.2 Select Independent Samples t-test
**Steps:**
1. Navigate to `/statistics/t-test`
2. Click on "독립표본 t-검정" card

**Expected Results:**
- Page navigates to Step 2
- Data upload form shows two-group input options

#### 1.3 Select Paired Samples t-test
**Steps:**
1. Navigate to `/statistics/t-test`
2. Click on "대응표본 t-검정" card

**Expected Results:**
- Page navigates to Step 2
- Data upload form shows paired data options

---

### 2. Data Upload - Raw Data Mode

#### 2.1 Upload Valid CSV File
**Steps:**
1. Complete Step 1 (select Independent Samples)
2. Ensure "원시데이터" tab is selected
3. Click "파일 선택" button
4. Select `test-data/e2e/t-test.csv`
5. Wait for file processing

**Expected Results:**
- File uploads successfully
- Data preview is shown
- "Next" or auto-advance to Step 3

**Test Data:** `test-data/e2e/t-test.csv`
```csv
group,value
A,23.5
A,25.1
...
B,28.3
B,29.5
...
```

#### 2.2 Upload Excel File
**Steps:**
1. Complete Step 1
2. Upload `.xlsx` file

**Expected Results:**
- Excel file is parsed correctly
- Sheet selection appears if multiple sheets exist

#### 2.3 Drag and Drop Upload
**Steps:**
1. Complete Step 1
2. Drag CSV file to dropzone area

**Expected Results:**
- Dropzone highlights on drag-over
- File uploads on drop

#### 2.4 Invalid File Type
**Steps:**
1. Complete Step 1
2. Attempt to upload `.pdf` or `.txt` file

**Expected Results:**
- Error message: "지원하지 않는 파일 형식입니다"
- File is rejected

#### 2.5 File Too Large
**Steps:**
1. Complete Step 1
2. Attempt to upload file with >100,000 rows

**Expected Results:**
- Error message about row limit
- Suggestion to use sampling

---

### 3. Data Upload - Summary Statistics Mode

#### 3.1 Enter Valid Summary Statistics (Independent)
**Steps:**
1. Select Independent Samples t-test
2. Click "요약통계" tab
3. Enter Group 1: Mean=25, SD=2, N=10
4. Enter Group 2: Mean=29, SD=2, N=10
5. Click "t-검정 실행"

**Expected Results:**
- Inputs are validated
- Analysis runs
- Results displayed in Step 4

#### 3.2 Toggle Equal Variance Assumption
**Steps:**
1. Enter summary statistics
2. Toggle "등분산 가정 (Student t)" switch OFF

**Expected Results:**
- Welch's t-test is performed instead of Student's t
- Results show appropriate degrees of freedom

#### 3.3 Missing Required Fields
**Steps:**
1. Select summary statistics mode
2. Leave Group 1 N empty
3. Click "t-검정 실행"

**Expected Results:**
- Validation error on empty field
- Button remains disabled or shows error

#### 3.4 Invalid Statistics (Negative SD)
**Steps:**
1. Enter SD = -2 for Group 1

**Expected Results:**
- Validation error: "표준편차는 0보다 커야 합니다"

---

### 4. Variable Selection (Raw Data Path)

#### 4.1 Select Group and Value Variables
**Steps:**
1. Upload valid CSV with group and value columns
2. In Step 3, select "group" as grouping variable
3. Select "value" as analysis variable

**Expected Results:**
- Variables appear in dropdown/selector
- Selection is confirmed visually
- Can proceed to analysis

#### 4.2 Automatic Variable Detection
**Steps:**
1. Upload CSV with clear group/value structure

**Expected Results:**
- System suggests appropriate variables
- User can accept or modify

#### 4.3 Wrong Variable Type Selected
**Steps:**
1. Select numeric column as grouping variable (with many unique values)

**Expected Results:**
- Warning about too many groups
- Or automatic type detection

---

### 5. Results Verification

#### 5.1 Verify Statistical Output
**Steps:**
1. Complete full workflow with known test data
2. Check displayed results

**Expected Results:**
- t-statistic is displayed
- p-value is shown (0 ≤ p ≤ 1)
- Degrees of freedom shown
- Effect size (Cohen's d) displayed
- 95% Confidence interval shown

**Verification Data:**
```
Group A: [23.5, 25.1, 24.8, 26.2, 23.9, 25.5, 24.3, 26.0, 23.7, 25.8]
Mean A = 24.88, SD A = 0.98

Group B: [28.3, 29.5, 27.8, 30.1, 28.9, 29.2, 27.5, 30.3, 28.5, 29.8]
Mean B = 28.99, SD B = 0.95

Expected: t ≈ -9.2, p < 0.001, significant difference
```

#### 5.2 Verify Assumption Tests
**Steps:**
1. Run analysis
2. Check assumption test results

**Expected Results:**
- Normality test results (Shapiro-Wilk)
- Homogeneity of variance test (Levene's)
- Clear pass/fail indicators

#### 5.3 Verify Interpretation Text
**Steps:**
1. Run analysis
2. Read AI-generated interpretation

**Expected Results:**
- Interpretation matches statistical results
- Language is in Korean
- Conclusion is clear (significant/not significant)

#### 5.4 Results Export
**Steps:**
1. Complete analysis
2. Click export/download button

**Expected Results:**
- Results can be exported (CSV/Excel/Image)
- All statistics included in export

---

### 6. Navigation and UI

#### 6.1 Step Navigation - Forward
**Steps:**
1. Complete each step sequentially

**Expected Results:**
- Can progress through all 4 steps
- Previous steps show completion status

#### 6.2 Step Navigation - Backward
**Steps:**
1. Complete Steps 1-3
2. Click on Step 1 in sidebar

**Expected Results:**
- Can go back to previous steps
- Previous selections are preserved

#### 6.3 Reset/Start Over
**Steps:**
1. Complete analysis
2. Click "새 분석" or navigate back to Step 1

**Expected Results:**
- Form is reset
- Can start new analysis

---

### 7. Error Handling

#### 7.1 Network Error During Analysis
**Steps:**
1. Start analysis
2. Simulate network interruption

**Expected Results:**
- Error message displayed
- Option to retry

#### 7.2 Pyodide Loading Failure
**Steps:**
1. Block Pyodide CDN
2. Navigate to page

**Expected Results:**
- Graceful error message
- Retry option

#### 7.3 Insufficient Data
**Steps:**
1. Upload CSV with only 1 row per group

**Expected Results:**
- Error: "각 그룹에 최소 2개 이상의 데이터가 필요합니다"

---

### 8. Edge Cases

#### 8.1 Equal Means (No Difference)
**Steps:**
1. Upload data where Group A mean ≈ Group B mean

**Expected Results:**
- t ≈ 0, p ≈ 1
- Interpretation: "유의한 차이가 없습니다"

#### 8.2 Very Large Effect Size
**Steps:**
1. Upload data with very different group means

**Expected Results:**
- Large Cohen's d displayed
- Clear "significant" result

#### 8.3 Non-Normal Data Warning
**Steps:**
1. Upload highly skewed data

**Expected Results:**
- Normality test fails
- Recommendation for non-parametric alternative (Mann-Whitney)

---

## Test Data Files

| File | Purpose | Location |
|------|---------|----------|
| `t-test.csv` | Standard two-group data | `test-data/e2e/t-test.csv` |
| `welch-t.csv` | Unequal variance groups | `test-data/e2e/welch-t.csv` |
| `wilcoxon.csv` | Paired samples data | `test-data/e2e/wilcoxon.csv` |

---

## Success Criteria

- [ ] All happy path scenarios pass
- [ ] Error messages are user-friendly (Korean)
- [ ] Results match R/Python reference calculations
- [ ] Page loads within 5 seconds
- [ ] Pyodide initializes within 10 seconds
- [ ] No console errors during normal operation

---

**Created:** 2026-01-30
**Author:** Playwright Test Planner
**Status:** Ready for Generator
