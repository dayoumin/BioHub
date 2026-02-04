/**
 * Pyodide 기반 matplotlib 시각화 서비스
 * 모든 차트는 Python matplotlib를 통해 생성됩니다
 */

import { getPyodideInstance, isPyodideReady, loadPyodideRuntime } from './pyodide-runtime-loader'

/**
 * Pyodide가 준비될 때까지 대기하고 인스턴스 반환
 */
async function ensurePyodideReady() {
  if (!isPyodideReady()) {
    await loadPyodideRuntime()
  }
  const pyodide = getPyodideInstance()
  if (!pyodide) {
    throw new Error('Pyodide failed to load')
  }
  return pyodide
}

/**
 * 히스토그램 시각화
 */
export async function createHistogram(
  data: number[], 
  title: string = 'Histogram',
  xlabel: string = 'Value',
  ylabel: string = 'Frequency',
  bins: number = 20
): Promise<string> {
  const pyodide = await ensurePyodideReady()
  
  const imageData = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import matplotlib.pyplot as plt
    from scipy import stats
    import io
    import base64
    
    # Set up plot style
    plt.style.use('seaborn-v0_8-darkgrid')
    
    data = np.array(${JSON.stringify(data)})
    
    # Create figure
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Create histogram
    n, bins_arr, patches = ax.hist(data, bins=${bins}, density=True, 
                                   alpha=0.7, color='steelblue', edgecolor='black')
    
    # Fit normal distribution
    mu, std = data.mean(), data.std()
    xmin, xmax = ax.get_xlim()
    x = np.linspace(xmin, xmax, 100)
    p = stats.norm.pdf(x, mu, std)
    ax.plot(x, p, 'r-', linewidth=2, label=f'Normal Fit\\nμ={mu:.2f}, σ={std:.2f}')
    
    # Labels and title
    ax.set_xlabel('${xlabel}', fontsize=12)
    ax.set_ylabel('${ylabel}', fontsize=12)
    ax.set_title('${title}', fontsize=14, fontweight='bold')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    # Save to base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    plt.close()
    
    image_base64
  `)
  
  return `data:image/png;base64,${imageData}`
}

/**
 * 박스플롯 시각화
 */
export async function createBoxplot(
  groups: number[][], 
  groupNames?: string[],
  title: string = 'Box Plot',
  xlabel: string = 'Groups',
  ylabel: string = 'Values'
): Promise<string> {
  const pyodide = await ensurePyodideReady()
  const names = groupNames || groups.map((_, i) => `Group ${i + 1}`)
  
  const imageData = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import matplotlib.pyplot as plt
    import io
    import base64
    
    plt.style.use('seaborn-v0_8-darkgrid')
    
    groups_data = ${JSON.stringify(groups)}
    group_names = ${JSON.stringify(names)}
    
    # Create figure
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Create box plot
    bp = ax.boxplot(groups_data, labels=group_names, patch_artist=True,
                     showmeans=True, meanline=True,
                     medianprops={'color': 'red', 'linewidth': 2},
                     meanprops={'color': 'blue', 'linewidth': 2, 'linestyle': '--'})
    
    # Color the boxes
    colors = plt.cm.Set3(np.linspace(0, 1, len(groups_data)))
    for patch, color in zip(bp['boxes'], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.7)
    
    # Labels and title
    ax.set_xlabel('${xlabel}', fontsize=12)
    ax.set_ylabel('${ylabel}', fontsize=12)
    ax.set_title('${title}', fontsize=14, fontweight='bold')
    ax.grid(True, alpha=0.3)
    
    # Add legend
    ax.plot([], [], 'r-', linewidth=2, label='Median')
    ax.plot([], [], 'b--', linewidth=2, label='Mean')
    ax.legend()
    
    # Save to base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    plt.close()
    
    image_base64
  `)
  
  return `data:image/png;base64,${imageData}`
}

/**
 * 산점도 시각화
 */
export async function createScatterPlot(
  x: number[], 
  y: number[],
  title: string = 'Scatter Plot',
  xlabel: string = 'X',
  ylabel: string = 'Y',
  showRegression: boolean = true
): Promise<string> {
  const pyodide = await ensurePyodideReady()
  
  const imageData = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import matplotlib.pyplot as plt
    from scipy import stats
    import io
    import base64
    
    plt.style.use('seaborn-v0_8-darkgrid')
    
    x_data = np.array(${JSON.stringify(x)})
    y_data = np.array(${JSON.stringify(y)})
    
    # Create figure
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Create scatter plot
    ax.scatter(x_data, y_data, alpha=0.6, s=50, color='steelblue', edgecolors='black', linewidth=0.5)
    
    # Add regression line if requested
    if ${showRegression}:
        slope, intercept, r_value, pValue, std_err = stats.linregress(x_data, y_data)
        line_x = np.array([x_data.min(), x_data.max()])
        line_y = slope * line_x + intercept
        ax.plot(line_x, line_y, 'r-', linewidth=2, 
                label=f'y = {slope:.3f}x + {intercept:.3f}\\nR² = {r_value**2:.3f}')
        ax.legend()
    
    # Labels and title
    ax.set_xlabel('${xlabel}', fontsize=12)
    ax.set_ylabel('${ylabel}', fontsize=12)
    ax.set_title('${title}', fontsize=14, fontweight='bold')
    ax.grid(True, alpha=0.3)
    
    # Save to base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    plt.close()
    
    image_base64
  `)
  
  return `data:image/png;base64,${imageData}`
}

/**
 * Q-Q Plot (정규성 검정 시각화)
 */
export async function createQQPlot(
  data: number[], 
  title: string = 'Q-Q Plot'
): Promise<string> {
  const pyodide = await ensurePyodideReady()
  
  const imageData = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import matplotlib.pyplot as plt
    from scipy import stats
    import io
    import base64
    
    plt.style.use('seaborn-v0_8-darkgrid')
    
    data = np.array(${JSON.stringify(data)})
    
    # Create figure
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Create Q-Q plot
    stats.probplot(data, dist="norm", plot=ax)
    
    # Customize
    ax.set_title('${title}', fontsize=14, fontweight='bold')
    ax.set_xlabel('Theoretical Quantiles', fontsize=12)
    ax.set_ylabel('Sample Quantiles', fontsize=12)
    ax.grid(True, alpha=0.3)
    
    # Save to base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    plt.close()
    
    image_base64
  `)
  
  return `data:image/png;base64,${imageData}`
}

/**
 * 히트맵 시각화 (상관계수 행렬)
 */
export async function createHeatmap(
  matrix: number[][], 
  labels?: string[],
  title: string = 'Correlation Heatmap'
): Promise<string> {
  const pyodide = await ensurePyodideReady()
  
  const imageData = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import matplotlib.pyplot as plt
    import seaborn as sns
    import io
    import base64
    
    plt.style.use('seaborn-v0_8-darkgrid')
    
    matrix = np.array(${JSON.stringify(matrix)})
    labels = ${labels ? JSON.stringify(labels) : 'None'}
    
    # Create figure
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Create heatmap
    sns.heatmap(matrix, annot=True, fmt='.2f', cmap='coolwarm', 
                center=0, square=True, linewidths=1,
                cbar_kws={"shrink": 0.8},
                xticklabels=labels if labels else False,
                yticklabels=labels if labels else False,
                ax=ax)
    
    # Title
    ax.set_title('${title}', fontsize=14, fontweight='bold')
    
    # Save to base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    plt.close()
    
    image_base64
  `)
  
  return `data:image/png;base64,${imageData}`
}

/**
 * 막대 그래프
 */
export async function createBarChart(
  categories: string[],
  values: number[],
  title: string = 'Bar Chart',
  xlabel: string = 'Categories',
  ylabel: string = 'Values',
  errorBars?: number[]
): Promise<string> {
  const pyodide = await ensurePyodideReady()
  
  const imageData = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import matplotlib.pyplot as plt
    import io
    import base64
    
    plt.style.use('seaborn-v0_8-darkgrid')
    
    categories = ${JSON.stringify(categories)}
    values = np.array(${JSON.stringify(values)})
    error_bars = ${errorBars ? JSON.stringify(errorBars) : 'None'}
    
    # Create figure
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Create bar chart
    colors = plt.cm.Set3(np.linspace(0, 1, len(categories)))
    bars = ax.bar(categories, values, color=colors, alpha=0.7, edgecolor='black')
    
    # Add error bars if provided
    if error_bars is not None:
        ax.errorbar(categories, values, yerr=error_bars, 
                   fmt='none', color='black', capsize=5)
    
    # Add value labels on bars
    for bar, value in zip(bars, values):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{value:.2f}', ha='center', va='bottom', fontsize=10)
    
    # Labels and title
    ax.set_xlabel('${xlabel}', fontsize=12)
    ax.set_ylabel('${ylabel}', fontsize=12)
    ax.set_title('${title}', fontsize=14, fontweight='bold')
    ax.grid(True, alpha=0.3, axis='y')
    
    # Rotate x labels if many categories
    if len(categories) > 5:
        plt.xticks(rotation=45, ha='right')
    
    # Save to base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    plt.close()
    
    image_base64
  `)
  
  return `data:image/png;base64,${imageData}`
}

/**
 * 선 그래프 (시계열 데이터)
 */
export async function createLineChart(
  x: number[],
  ySeries: number[][] | number[],
  labels?: string[],
  title: string = 'Line Chart',
  xlabel: string = 'X',
  ylabel: string = 'Y'
): Promise<string> {
  const pyodide = await ensurePyodideReady()
  
  // Ensure ySeries is always a 2D array
  const series = Array.isArray(ySeries[0]) ? ySeries : [ySeries]
  const seriesLabels = labels || series.map((_, i) => `Series ${i + 1}`)
  
  const imageData = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import matplotlib.pyplot as plt
    import io
    import base64
    
    plt.style.use('seaborn-v0_8-darkgrid')
    
    x_data = np.array(${JSON.stringify(x)})
    y_series = ${JSON.stringify(series)}
    labels = ${JSON.stringify(seriesLabels)}
    
    # Create figure
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Plot each series
    colors = plt.cm.tab10(np.linspace(0, 1, len(y_series)))
    for i, (y_data, label, color) in enumerate(zip(y_series, labels, colors)):
        ax.plot(x_data, y_data, marker='o', markersize=4, 
               linewidth=2, label=label, color=color)
    
    # Labels and title
    ax.set_xlabel('${xlabel}', fontsize=12)
    ax.set_ylabel('${ylabel}', fontsize=12)
    ax.set_title('${title}', fontsize=14, fontweight='bold')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    # Save to base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    plt.close()
    
    image_base64
  `)
  
  return `data:image/png;base64,${imageData}`
}