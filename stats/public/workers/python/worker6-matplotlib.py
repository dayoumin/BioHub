"""
Worker 6: matplotlib 논문용 Export 렌더러

ChartSpec + 데이터 → matplotlib figure → base64 이미지/문서

I/O 규칙: 파라미터 + 반환 키 = camelCase, 내부 변수 = snake_case
"""

import matplotlib
matplotlib.use('Agg')  # Non-interactive backend (Pyodide 필수)

import matplotlib.pyplot as plt
import numpy as np
import json
import base64
from io import BytesIO

# ── SciencePlots 설치 (top-level await, handleLoadWorker의 runPythonAsync에서 실행) ──
_scienceplots_available = False
try:
    import micropip
    await micropip.install('SciencePlots')
    import scienceplots  # noqa: F401 — plt.style에 스타일 등록
    _scienceplots_available = True
    print('[Worker6] matplotlib + SciencePlots loaded')
except Exception as e:
    print(f'[Worker6] SciencePlots 설치 실패 (오프라인?): {e}. rcParams 폴백 사용.')
    print('[Worker6] matplotlib loaded (SciencePlots 없이)')

# ── 상수 ──────────────────────────────────────────────────────

# SciencePlots 사용 가능 시 스타일시트 사용, 불가 시 빈 리스트 (rcParams로 폴백)
if _scienceplots_available:
    STYLE_MAP = {
        'default': [],
        'science': ['science', 'no-latex'],
        'ieee': ['science', 'ieee', 'no-latex'],
    }
else:
    # SciencePlots 없을 때 rcParams 직접 적용으로 근사
    STYLE_MAP = {
        'default': [],
        'science': [],  # _render_with_style에서 rcParams 폴백
        'ieee': [],
    }

# SciencePlots 미설치 시 rcParams 폴백 값
_SCIENCE_RCPARAMS = {
    'font.family': 'serif',
    'font.size': 10,
    'axes.linewidth': 0.5,
    'xtick.direction': 'in',
    'ytick.direction': 'in',
    'xtick.major.width': 0.5,
    'ytick.major.width': 0.5,
    'lines.linewidth': 1.0,
}

_IEEE_RCPARAMS = {
    **_SCIENCE_RCPARAMS,
    'font.size': 8,
}

MIME_MAP = {
    'png': 'image/png',
    'pdf': 'application/pdf',
    'svg': 'image/svg+xml',
    'tiff': 'image/tiff',
    'eps': 'application/postscript',
}

# 저널 팔레트 (chart-spec-defaults.ts와 동일)
PALETTE_MAP = {
    'OkabeIto': ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7'],
    'NPG':      ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4', '#91D1C2'],
    'AAAS':     ['#3B4992', '#EE0000', '#008B45', '#631879', '#008280', '#BB0021', '#5F559B', '#A20056'],
    'NEJM':     ['#BC3C29', '#0072B5', '#E18727', '#20854E', '#7876B1', '#6F99AD', '#FFDC91', '#EE4C97'],
    'Lancet':   ['#00468B', '#ED0000', '#42B540', '#0099B4', '#925E9F', '#FDAF91', '#AD002A'],
    'JAMA':     ['#374E55', '#DF8F44', '#00A1D5', '#B24745', '#79AF97', '#6A6599', '#80796B'],
    'Set1':     ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628', '#f781bf'],
    'Set2':     ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494'],
    'Dark2':    ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d'],
}

# IEEE grayscale
IEEE_COLORS = ['#000000', '#555555', '#999999', '#cccccc']


# ── 유틸 ──────────────────────────────────────────────────────

def _resolve_colors(chart_spec):
    """ChartSpec의 style에서 색상 팔레트를 해석하여 리스트 반환."""
    style = chart_spec.get('style', {})

    # 1) 직접 지정된 colors 배열
    if style.get('colors'):
        return style['colors']

    # 2) scheme 이름으로 팔레트 조회
    scheme = style.get('scheme', 'OkabeIto')
    return PALETTE_MAP.get(scheme, PALETTE_MAP['OkabeIto'])


def _get_column_values(data, field):
    """column-oriented 데이터에서 필드값 추출. 누락 시 빈 리스트."""
    return data.get(field, [])


def _to_numeric(values):
    """값 리스트를 float 배열로 변환. 변환 불가 값은 NaN."""
    result = []
    for v in values:
        try:
            result.append(float(v))
        except (TypeError, ValueError):
            result.append(float('nan'))
    return np.array(result)


# ── 차트 렌더러 ──────────────────────────────────────────────

def _render_bar(fig, ax, data, chart_spec, colors):
    """bar, grouped-bar, stacked-bar 렌더링."""
    encoding = chart_spec.get('encoding', {})
    x_field = encoding.get('x', {}).get('field', '')
    y_field = encoding.get('y', {}).get('field', '')
    color_field = encoding.get('color', {}).get('field')
    chart_type = chart_spec.get('chartType', 'bar')

    x_values = _get_column_values(data, x_field)
    y_values = _to_numeric(_get_column_values(data, y_field))

    if not color_field:
        # 단순 bar
        categories = list(dict.fromkeys(x_values))  # 순서 유지 unique
        cat_means = {}
        for xv, yv in zip(x_values, y_values):
            if not np.isnan(yv):
                cat_means.setdefault(xv, []).append(yv)
        means = [np.mean(cat_means[c]) if c in cat_means else float('nan') for c in categories]
        bar_colors = [colors[i % len(colors)] for i in range(len(categories))]
        ax.bar(categories, means, color=bar_colors)
    else:
        # grouped-bar / stacked-bar
        color_values = _get_column_values(data, color_field)
        categories = list(dict.fromkeys(x_values))
        groups = list(dict.fromkeys(color_values))

        # 그룹별 평균 계산
        group_data = {}
        for xv, yv, cv in zip(x_values, y_values, color_values):
            if not np.isnan(yv):
                group_data.setdefault((xv, cv), []).append(yv)

        x_indices = np.arange(len(categories))
        bar_width = 0.8 / max(len(groups), 1)
        is_stacked = chart_type == 'stacked-bar'

        bottom_acc = np.zeros(len(categories))
        for gi, group in enumerate(groups):
            vals = [np.mean(group_data.get((c, group), [0])) for c in categories]
            color = colors[gi % len(colors)]
            if is_stacked:
                ax.bar(x_indices, vals, bar_width * len(groups), bottom=bottom_acc,
                       label=str(group), color=color)
                bottom_acc += np.array(vals)
            else:
                offset = (gi - len(groups) / 2 + 0.5) * bar_width
                ax.bar(x_indices + offset, vals, bar_width, label=str(group), color=color)

        ax.set_xticks(x_indices)
        ax.set_xticklabels(categories)
        if len(groups) > 1:
            ax.legend(frameon=False)


def _render_line(fig, ax, data, chart_spec, colors):
    """line 차트 렌더링 (다중 시리즈 지원)."""
    encoding = chart_spec.get('encoding', {})
    x_field = encoding.get('x', {}).get('field', '')
    y_field = encoding.get('y', {}).get('field', '')
    color_field = encoding.get('color', {}).get('field')

    x_values = _get_column_values(data, x_field)
    y_values = _to_numeric(_get_column_values(data, y_field))

    if not color_field:
        # 정렬 후 플롯
        pairs = sorted(zip(x_values, y_values), key=lambda p: p[0] if isinstance(p[0], (int, float)) else 0)
        xs = [p[0] for p in pairs]
        ys = [p[1] for p in pairs]
        ax.plot(xs, ys, '-o', color=colors[0], markersize=4, linewidth=1.2)
    else:
        color_values = _get_column_values(data, color_field)
        groups = list(dict.fromkeys(color_values))
        for gi, group in enumerate(groups):
            mask = [cv == group for cv in color_values]
            xs = [xv for xv, m in zip(x_values, mask) if m]
            ys = [yv for yv, m in zip(y_values, mask) if m]
            pairs = sorted(zip(xs, ys), key=lambda p: p[0] if isinstance(p[0], (int, float)) else 0)
            ax.plot([p[0] for p in pairs], [p[1] for p in pairs],
                    '-o', color=colors[gi % len(colors)], markersize=4, linewidth=1.2,
                    label=str(group))
        ax.legend(frameon=False)


def _render_scatter(fig, ax, data, chart_spec, colors):
    """scatter 차트 렌더링 (color 그룹 + trendline 지원)."""
    encoding = chart_spec.get('encoding', {})
    x_field = encoding.get('x', {}).get('field', '')
    y_field = encoding.get('y', {}).get('field', '')
    color_field = encoding.get('color', {}).get('field')

    x_values = _to_numeric(_get_column_values(data, x_field))
    y_values = _to_numeric(_get_column_values(data, y_field))

    if not color_field:
        ax.scatter(x_values, y_values, c=colors[0], s=20, alpha=0.7, edgecolors='none')
    else:
        color_values = _get_column_values(data, color_field)
        groups = list(dict.fromkeys(color_values))
        for gi, group in enumerate(groups):
            mask = [cv == group for cv in color_values]
            xs = x_values[mask] if isinstance(x_values, np.ndarray) else [xv for xv, m in zip(x_values, mask) if m]
            ys = y_values[mask] if isinstance(y_values, np.ndarray) else [yv for yv, m in zip(y_values, mask) if m]
            ax.scatter(xs, ys, c=colors[gi % len(colors)], s=20, alpha=0.7,
                       edgecolors='none', label=str(group))
        ax.legend(frameon=False)

    # Trendline — TrendlineSpec에는 'enabled' 없음, type 존재 여부로 판단
    trendline = chart_spec.get('trendline')
    if trendline and trendline.get('type'):
        valid = ~(np.isnan(x_values) | np.isnan(y_values))
        xv = x_values[valid]
        yv = y_values[valid]
        if len(xv) >= 2:
            coeffs = np.polyfit(xv, yv, 1)
            x_line = np.linspace(xv.min(), xv.max(), 100)
            y_line = np.polyval(coeffs, x_line)
            ax.plot(x_line, y_line, '--', color='#333333', linewidth=1.0, alpha=0.8)


# ── 공통 요소 적용 ──────────────────────────────────────────

def _apply_common(fig, ax, chart_spec):
    """title, axis labels, grid 등 공통 요소 적용."""
    encoding = chart_spec.get('encoding', {})

    # Title
    title = chart_spec.get('title')
    if title:
        ax.set_title(title)

    # Axis labels
    x_title = encoding.get('x', {}).get('title')
    y_title = encoding.get('y', {}).get('title')
    if x_title:
        ax.set_xlabel(x_title)
    if y_title:
        ax.set_ylabel(y_title)

    # Grid
    x_grid = encoding.get('x', {}).get('grid', False)
    y_grid = encoding.get('y', {}).get('grid', False)
    if x_grid or y_grid:
        ax.grid(True, axis='both' if (x_grid and y_grid) else ('x' if x_grid else 'y'),
                alpha=0.3, linewidth=0.5)

    fig.tight_layout()


# ── 메인 렌더러 (dispatch) ────────────────────────────────────

RENDERER_MAP = {
    'bar': _render_bar,
    'grouped-bar': _render_bar,
    'stacked-bar': _render_bar,
    'line': _render_line,
    'scatter': _render_scatter,
}

# 지원 차트 타입 (향후 확장)
SUPPORTED_CHART_TYPES = set(RENDERER_MAP.keys())


def render_chart(chartSpec, data, exportConfig):
    """
    ChartSpec + 데이터 → matplotlib figure → base64 인코딩된 이미지/문서.

    Parameters (camelCase — Python I/O 규칙):
        chartSpec: dict — ChartSpec JSON
        data: dict — column-oriented { colName: [values...] }
        exportConfig: dict — { format, dpi, physicalWidthMm, physicalHeightMm, style, transparentBackground }

    Returns: dict { base64Data, mimeType, extension } 또는 { error: str }
    """
    chart_type = chartSpec.get('chartType', 'bar')

    # 지원 여부 확인
    renderer = RENDERER_MAP.get(chart_type)
    if renderer is None:
        return {
            'error': f'Unsupported chart type for matplotlib export: {chart_type}. '
                     f'Supported: {", ".join(sorted(SUPPORTED_CHART_TYPES))}'
        }

    # 미지원 옵션 경고 (조용히 무시하지 않고 명시)
    warnings = []
    if chartSpec.get('orientation') == 'horizontal':
        warnings.append('horizontal orientation은 아직 미지원 (세로 막대로 출력)')
    aggregate = chartSpec.get('aggregate', {})
    agg_y = aggregate.get('y') if isinstance(aggregate, dict) else None
    if agg_y and agg_y not in ('mean', None):
        warnings.append(f'aggregate.y={agg_y}는 아직 미지원 (mean으로 대체)')
    if chartSpec.get('facet'):
        warnings.append('facet은 아직 미지원 (단일 패널로 출력)')
    if chartSpec.get('significance'):
        warnings.append('significance marks는 아직 미지원')

    # 1. 스타일 적용 (context manager로 전역 오염 방지)
    style_key = exportConfig.get('style', 'science')
    styles = STYLE_MAP.get(style_key, [])

    return _render_with_style(styles, chartSpec, data, exportConfig, renderer, warnings)


def _render_with_style(styles, chartSpec, data, exportConfig, renderer, warnings):
    """스타일 context manager 안에서 렌더링 수행. plt.rcParams 전역 오염 방지."""
    with plt.rc_context(), plt.style.context(styles if styles else ['default']):
        # SciencePlots 미설치 시 rcParams 폴백 적용
        if not _scienceplots_available:
            style_key = exportConfig.get('style', 'science')
            if style_key == 'ieee':
                plt.rcParams.update(_IEEE_RCPARAMS)
            elif style_key == 'science':
                plt.rcParams.update(_SCIENCE_RCPARAMS)

        # 2. Figure 생성 (물리 크기)
        width_mm = exportConfig.get('physicalWidthMm', 86)
        height_mm = exportConfig.get('physicalHeightMm', 60)
        width_in = width_mm / 25.4
        height_in = height_mm / 25.4
        dpi = exportConfig.get('dpi', 300)

        fig, ax = plt.subplots(figsize=(width_in, height_in))

        # 3. 폰트 (ChartSpec style에서 가져오기, SciencePlots 기본값 우선)
        style_spec = chartSpec.get('style', {})
        font_config = style_spec.get('font', {})
        if font_config.get('family'):
            font_family = font_config['family'].split(',')[0].strip()
            plt.rcParams['font.family'] = font_family

        # 4. 색상 해석
        chart_colors = _resolve_colors(chartSpec)

        # ieee 프리셋이면 grayscale 강제
        style_key = exportConfig.get('style', 'science')
        if style_key == 'ieee':
            chart_colors = IEEE_COLORS

        # 5. 차트 렌더링 + Export (try/finally로 figure leak 방지)
        try:
            renderer(fig, ax, data, chartSpec, chart_colors)

            # 6. 공통 요소
            _apply_common(fig, ax, chartSpec)

            # 7. Export
            fmt = exportConfig.get('format', 'png')
            buf = BytesIO()
            save_kwargs = {'dpi': dpi, 'bbox_inches': 'tight'}

            if fmt == 'png' and exportConfig.get('transparentBackground'):
                save_kwargs['transparent'] = True
            elif fmt == 'png':
                save_kwargs['facecolor'] = 'white'

            fig.savefig(buf, format=fmt, **save_kwargs)

            buf.seek(0)
            b64 = base64.b64encode(buf.read()).decode('ascii')

            mime_type = MIME_MAP.get(fmt, 'application/octet-stream')

            result = {
                'base64Data': b64,
                'mimeType': mime_type,
                'extension': fmt,
            }
            if warnings:
                result['warnings'] = warnings
            return result
        finally:
            plt.close(fig)
