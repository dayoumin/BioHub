/**
 * Pyodide 기반 Plotly 시각화 서비스
 * 모든 차트는 Python Plotly를 통해 생성됩니다
 * 
 * Plotly는 MIT 라이선스로 상업적 사용이 완전히 자유롭습니다.
 * 인터랙티브하고 현대적인 차트를 생성합니다.
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

export interface PlotlyChart {
  type: string
  data: any
  layout: any
  config?: any
}

/**
 * 인터랙티브 히스토그램
 */
export async function createInteractiveHistogram(
  data: number[], 
  title: string = 'Histogram',
  xlabel: string = 'Value',
  ylabel: string = 'Frequency',
  bins: number = 20
): Promise<PlotlyChart> {
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import plotly.graph_objects as go
    from scipy import stats
    import json
    
    data = np.array(${JSON.stringify(data)})
    
    # 정규분포 피팅
    mu, std = data.mean(), data.std()
    x_range = np.linspace(data.min(), data.max(), 100)
    normal_curve = stats.norm.pdf(x_range, mu, std)
    
    # 히스토그램 생성
    fig = go.Figure()
    
    # 히스토그램 추가
    fig.add_trace(go.Histogram(
        x=data.tolist(),
        nbinsx=${bins},
        name='Data',
        histnorm='probability density',
        opacity=0.7,
        marker_color='steelblue',
        hovertemplate='Range: %{x}<br>Density: %{y}<extra></extra>'
    ))
    
    # 정규분포 곡선 추가
    fig.add_trace(go.Scatter(
        x=x_range.tolist(),
        y=normal_curve.tolist(),
        mode='lines',
        name=f'Normal (μ={mu:.2f}, σ={std:.2f})',
        line=dict(color='red', width=2),
        hovertemplate='Value: %{x:.2f}<br>Density: %{y:.4f}<extra></extra>'
    ))
    
    # 레이아웃 설정
    fig.update_layout(
        title='${title}',
        xaxis_title='${xlabel}',
        yaxis_title='${ylabel}',
        template='plotly_white',
        hovermode='x unified',
        showlegend=True,
        height=500,
        font=dict(size=12)
    )
    
    # JSON으로 변환
    result = {
        'type': 'histogram',
        'data': fig.to_dict()['data'],
        'layout': fig.to_dict()['layout']
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 인터랙티브 박스플롯
 */
export async function createInteractiveBoxplot(
  groups: number[][], 
  groupNames?: string[],
  title: string = 'Box Plot',
  ylabel: string = 'Values'
): Promise<PlotlyChart> {
  const pyodide = await ensurePyodideReady()
  const names = groupNames || groups.map((_, i) => `Group ${i + 1}`)
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import plotly.graph_objects as go
    import json
    
    groups_data = ${JSON.stringify(groups)}
    group_names = ${JSON.stringify(names)}
    
    fig = go.Figure()
    
    # 각 그룹에 대한 박스플롯 추가
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f']
    
    for i, (group, name) in enumerate(zip(groups_data, group_names)):
        group_array = np.array(group)
        fig.add_trace(go.Box(
            y=group,
            name=name,
            marker_color=colors[i % len(colors)],
            boxmean='sd',  # 평균과 표준편차 표시
            hovertemplate=
                '<b>%{text}</b><br>' +
                'Median: %{median}<br>' +
                'Q1: %{q1}<br>' +
                'Q3: %{q3}<br>' +
                'Mean: %{mean}<br>' +
                'SD: %{sd}<br>' +
                '<extra></extra>',
            text=[name] * len(group)
        ))
    
    # 레이아웃 설정
    fig.update_layout(
        title='${title}',
        yaxis_title='${ylabel}',
        template='plotly_white',
        showlegend=True,
        height=500,
        hovermode='closest',
        font=dict(size=12)
    )
    
    result = {
        'type': 'boxplot',
        'data': fig.to_dict()['data'],
        'layout': fig.to_dict()['layout']
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 인터랙티브 산점도 (회귀선 포함)
 */
export async function createInteractiveScatterPlot(
  x: number[], 
  y: number[],
  title: string = 'Scatter Plot',
  xlabel: string = 'X',
  ylabel: string = 'Y',
  showRegression: boolean = true
): Promise<PlotlyChart> {
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import plotly.graph_objects as go
    from scipy import stats
    import json
    
    x_data = np.array(${JSON.stringify(x)})
    y_data = np.array(${JSON.stringify(y)})
    
    fig = go.Figure()
    
    # 산점도 추가
    fig.add_trace(go.Scatter(
        x=x_data.tolist(),
        y=y_data.tolist(),
        mode='markers',
        name='Data points',
        marker=dict(
            size=8,
            color='steelblue',
            opacity=0.7,
            line=dict(width=1, color='darkblue')
        ),
        hovertemplate=
            'X: %{x:.2f}<br>' +
            'Y: %{y:.2f}<br>' +
            '<extra></extra>'
    ))
    
    # 회귀선 추가
    if ${showRegression}:
        slope, intercept, r_value, pValue, std_err = stats.linregress(x_data, y_data)
        x_line = np.array([x_data.min(), x_data.max()])
        y_line = slope * x_line + intercept
        
        fig.add_trace(go.Scatter(
            x=x_line.tolist(),
            y=y_line.tolist(),
            mode='lines',
            name=f'Regression (R²={r_value**2:.3f})',
            line=dict(color='red', width=2, dash='dash'),
            hovertemplate=
                f'y = {slope:.3f}x + {intercept:.3f}<br>' +
                f'R² = {r_value**2:.3f}<br>' +
                f'p-value = {pValue:.4f}<br>' +
                '<extra></extra>'
        ))
        
        # 신뢰구간 추가 (선택적)
        from scipy.stats import t
        n = len(x_data)
        predict_mean_se = np.sqrt(std_err**2 * (1/n + (x_line - x_data.mean())**2 / ((x_data - x_data.mean())**2).sum()))
        margin = t.ppf(0.975, n-2) * predict_mean_se
        
        fig.add_trace(go.Scatter(
            x=np.concatenate([x_line, x_line[::-1]]).tolist(),
            y=np.concatenate([y_line + margin, (y_line - margin)[::-1]]).tolist(),
            fill='toself',
            fillcolor='rgba(255,0,0,0.1)',
            line=dict(color='rgba(255,0,0,0)'),
            showlegend=False,
            hoverinfo='skip'
        ))
    
    # 레이아웃 설정
    fig.update_layout(
        title='${title}',
        xaxis_title='${xlabel}',
        yaxis_title='${ylabel}',
        template='plotly_white',
        hovermode='closest',
        height=500,
        font=dict(size=12)
    )
    
    result = {
        'type': 'scatter',
        'data': fig.to_dict()['data'],
        'layout': fig.to_dict()['layout']
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 인터랙티브 히트맵 (상관계수 행렬)
 */
export async function createInteractiveHeatmap(
  matrix: number[][], 
  labels?: string[],
  title: string = 'Correlation Heatmap'
): Promise<PlotlyChart> {
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import plotly.graph_objects as go
    import json
    
    matrix = np.array(${JSON.stringify(matrix)})
    labels = ${labels ? JSON.stringify(labels) : 'None'}
    
    if labels is None:
        labels = [f'Var{i+1}' for i in range(len(matrix))]
    
    # 히트맵 생성
    fig = go.Figure(data=go.Heatmap(
        z=matrix.tolist(),
        x=labels,
        y=labels,
        colorscale='RdBu',
        zmid=0,
        text=matrix.round(2),
        texttemplate='%{text}',
        textfont={"size": 10},
        colorbar=dict(title='Correlation'),
        hovertemplate='%{x} - %{y}<br>Correlation: %{z:.3f}<extra></extra>'
    ))
    
    # 레이아웃 설정
    fig.update_layout(
        title='${title}',
        template='plotly_white',
        height=500,
        width=600,
        font=dict(size=12),
        hovermode='closest',
        xaxis=dict(side='bottom'),
        yaxis=dict(autorange='reversed')
    )
    
    result = {
        'type': 'heatmap',
        'data': fig.to_dict()['data'],
        'layout': fig.to_dict()['layout']
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 인터랙티브 바이올린 플롯 (분포 비교)
 */
export async function createInteractiveViolinPlot(
  groups: number[][], 
  groupNames?: string[],
  title: string = 'Violin Plot',
  ylabel: string = 'Values'
): Promise<PlotlyChart> {
  const pyodide = await ensurePyodideReady()
  const names = groupNames || groups.map((_, i) => `Group ${i + 1}`)
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import plotly.graph_objects as go
    import json
    
    groups_data = ${JSON.stringify(groups)}
    group_names = ${JSON.stringify(names)}
    
    fig = go.Figure()
    
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']
    
    for i, (group, name) in enumerate(zip(groups_data, group_names)):
        fig.add_trace(go.Violin(
            y=group,
            name=name,
            box_visible=True,
            meanline_visible=True,
            fillcolor=colors[i % len(colors)],
            opacity=0.6,
            line_color='black',
            hovertemplate=
                '<b>%{text}</b><br>' +
                'Value: %{y:.2f}<br>' +
                '<extra></extra>',
            text=[name] * len(group)
        ))
    
    fig.update_layout(
        title='${title}',
        yaxis_title='${ylabel}',
        template='plotly_white',
        showlegend=True,
        height=500,
        font=dict(size=12),
        violinmode='group'
    )
    
    result = {
        'type': 'violin',
        'data': fig.to_dict()['data'],
        'layout': fig.to_dict()['layout']
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 3D 산점도 (다변량 데이터)
 */
export async function create3DScatterPlot(
  x: number[],
  y: number[],
  z: number[],
  title: string = '3D Scatter Plot',
  xlabel: string = 'X',
  ylabel: string = 'Y',
  zlabel: string = 'Z'
): Promise<PlotlyChart> {
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import plotly.graph_objects as go
    import json
    
    x_data = np.array(${JSON.stringify(x)})
    y_data = np.array(${JSON.stringify(y)})
    z_data = np.array(${JSON.stringify(z)})
    
    fig = go.Figure(data=[go.Scatter3d(
        x=x_data.tolist(),
        y=y_data.tolist(),
        z=z_data.tolist(),
        mode='markers',
        marker=dict(
            size=5,
            color=z_data.tolist(),
            colorscale='Viridis',
            showscale=True,
            colorbar=dict(title='Z Value'),
            opacity=0.8
        ),
        hovertemplate=
            'X: %{x:.2f}<br>' +
            'Y: %{y:.2f}<br>' +
            'Z: %{z:.2f}<br>' +
            '<extra></extra>'
    )])
    
    fig.update_layout(
        title='${title}',
        scene=dict(
            xaxis_title='${xlabel}',
            yaxis_title='${ylabel}',
            zaxis_title='${zlabel}',
            camera=dict(
                eye=dict(x=1.5, y=1.5, z=1.5)
            )
        ),
        template='plotly_white',
        height=600,
        font=dict(size=12)
    )
    
    result = {
        'type': '3d-scatter',
        'data': fig.to_dict()['data'],
        'layout': fig.to_dict()['layout']
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * Q-Q Plot (정규성 검정 시각화)
 */
export async function createInteractiveQQPlot(
  data: number[], 
  title: string = 'Q-Q Plot'
): Promise<PlotlyChart> {
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import plotly.graph_objects as go
    from scipy import stats
    import json
    
    data = np.array(${JSON.stringify(data)})
    
    # Q-Q plot 데이터 계산
    theoretical_quantiles = stats.probplot(data, dist="norm")[0][0]
    sample_quantiles = stats.probplot(data, dist="norm")[0][1]
    
    # 이상적인 선 (y=x)
    min_val = min(theoretical_quantiles.min(), sample_quantiles.min())
    max_val = max(theoretical_quantiles.max(), sample_quantiles.max())
    
    fig = go.Figure()
    
    # Q-Q 점들
    fig.add_trace(go.Scatter(
        x=theoretical_quantiles.tolist(),
        y=sample_quantiles.tolist(),
        mode='markers',
        name='Data',
        marker=dict(
            size=6,
            color='steelblue',
            opacity=0.7
        ),
        hovertemplate=
            'Theoretical: %{x:.2f}<br>' +
            'Sample: %{y:.2f}<br>' +
            '<extra></extra>'
    ))
    
    # 참조선 (y=x)
    fig.add_trace(go.Scatter(
        x=[min_val, max_val],
        y=[min_val, max_val],
        mode='lines',
        name='Normal Line',
        line=dict(color='red', width=2, dash='dash'),
        hoverinfo='skip'
    ))
    
    # Shapiro-Wilk 검정 결과 추가
    statistic, pValue = stats.shapiro(data)
    
    fig.update_layout(
        title={
            'text': f'{title}<br><sub>Shapiro-Wilk: W={statistic:.4f}, p={pValue:.4f}</sub>',
            'x': 0.5,
            'xanchor': 'center'
        },
        xaxis_title='Theoretical Quantiles',
        yaxis_title='Sample Quantiles',
        template='plotly_white',
        height=500,
        font=dict(size=12),
        hovermode='closest'
    )
    
    result = {
        'type': 'qq-plot',
        'data': fig.to_dict()['data'],
        'layout': fig.to_dict()['layout']
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}