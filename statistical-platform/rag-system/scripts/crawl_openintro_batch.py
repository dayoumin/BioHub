#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
OpenIntro Statistics 크롤링 스크립트
- 대학 교재급 통계 이론 문서
- 라이선스: CC BY-SA 3.0 (상업적 사용 가능)
- 크롤링 대상: 주요 챕터 (통계 이론/모형/실험설계)
- 코드 블록 제거 옵션 포함
"""

import sys
import io
import asyncio
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List

# Windows UTF-8 encoding fix
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from crawl4ai import AsyncWebCrawler


# ===== Introduction to Modern Statistics (IMS) 챕터 목록 (통계 이론 중심) =====
# 출처: https://openintro-ims.netlify.app/
# 라이선스: CC BY-SA 3.0 (상업적 사용 가능)
OPENINTRO_CHAPTERS = {
    # 1. 실험 설계 및 데이터 수집
    "ch2-data-design": {
        "title": "Study Design and Sampling",
        "url": "https://openintro-ims.netlify.app/data-design",
        "description": "실험 설계, 관찰 연구 vs 실험 연구, 무작위 배정, 표본 추출 방법"
    },

    # 2. 단순 선형 회귀
    "ch7-model-slr": {
        "title": "Linear Regression with a Single Predictor",
        "url": "https://openintro-ims.netlify.app/model-slr",
        "description": "단순 선형 회귀, 최소제곱법, 잔차 분석, 결정계수 R²"
    },

    # 3. 다중 선형 회귀
    "ch8-model-mlr": {
        "title": "Linear Regression with Multiple Predictors",
        "url": "https://openintro-ims.netlify.app/model-mlr",
        "description": "다중 선형 회귀, 다중공선성, 모형 선택, 조정된 R²"
    },

    # 4. 가설검정 기초 (Randomization)
    "ch11-foundations-randomization": {
        "title": "Hypothesis Testing with Randomization",
        "url": "https://openintro-ims.netlify.app/foundations-randomization",
        "description": "가설검정 원리, p-value, 무작위화 검정, 부트스트랩"
    },

    # 5. 가설검정 기초 (Mathematical)
    "ch13-foundations-mathematical": {
        "title": "Hypothesis Testing with Mathematical Models",
        "url": "https://openintro-ims.netlify.app/foundations-mathematical",
        "description": "정규분포 기반 가설검정, t-분포, 신뢰구간, Type I/II Error"
    },

    # 6. ANOVA (여러 평균 비교)
    "ch22-inference-many-means": {
        "title": "Inference for Comparing Many Means",
        "url": "https://openintro-ims.netlify.app/inference-many-means",
        "description": "일원 ANOVA, F-검정, 사후 검정, 다중 비교 문제"
    },

    # 7. 회귀 추론 (단순)
    "ch24-inference-one-mean": {
        "title": "Inference for Linear Regression with a Single Predictor",
        "url": "https://openintro-ims.netlify.app/inference-one-mean",
        "description": "회귀 계수 검정, 신뢰구간, 회귀 진단, 모형 가정 확인"
    },

    # 8. 회귀 추론 (다중)
    "ch25-inference-many-means-mlr": {
        "title": "Inference for Linear Regression with Multiple Predictors",
        "url": "https://openintro-ims.netlify.app/inference-many-means",
        "description": "다중 회귀 추론, F-검정, 부분 검정, 모형 진단"
    },

    # 9. 로지스틱 회귀
    "ch9-model-logistic": {
        "title": "Logistic Regression",
        "url": "https://openintro-ims.netlify.app/model-logistic",
        "description": "이항 로지스틱 회귀, Odds Ratio, 모형 해석, 분류 정확도"
    },
}


def remove_code_blocks(markdown_content: str) -> str:
    """
    Markdown에서 R/Python 코드 블록 제거
    통계 이론 및 수식만 유지

    제거 대상:
    - ```r ... ```
    - ```python ... ```
    - ```R ... ```
    - > [R 코드] ... (인용 블록 코드)

    유지 대상:
    - 수식 (LaTeX)
    - 표 (Markdown table)
    - 텍스트 설명
    """
    # 1. R 코드 블록 제거
    markdown_content = re.sub(
        r'```[rR]\n.*?```',
        '\n[코드 생략: 통계 이론만 제공]\n',
        markdown_content,
        flags=re.DOTALL
    )

    # 2. Python 코드 블록 제거
    markdown_content = re.sub(
        r'```python\n.*?```',
        '\n[코드 생략: 통계 이론만 제공]\n',
        markdown_content,
        flags=re.DOTALL
    )

    # 3. 일반 코드 블록 (언어 지정 없음) 중 통계 코드로 보이는 것 제거
    # 예: t.test(), lm(), summary() 등이 포함된 블록
    def is_stats_code(code_block):
        """통계 함수 호출이 있는지 확인"""
        stats_keywords = [
            't.test', 'lm(', 'glm(', 'anova(', 'summary(',
            'import scipy', 'from scipy', 'import numpy',
            '<-', 'library(', 'require('
        ]
        return any(keyword in code_block for keyword in stats_keywords)

    # 코드 블록 찾아서 통계 코드면 제거
    def replace_stats_code(match):
        code_content = match.group(1)
        if is_stats_code(code_content):
            return '\n[코드 생략: 통계 이론만 제공]\n'
        return match.group(0)  # 통계 코드 아니면 유지

    markdown_content = re.sub(
        r'```\n(.*?)```',
        replace_stats_code,
        markdown_content,
        flags=re.DOTALL
    )

    # 4. 인용 블록 내 코드 힌트 제거 (예: "> [R 코드]")
    markdown_content = re.sub(
        r'>\s*\[.*?코드.*?\].*?\n',
        '',
        markdown_content,
        flags=re.MULTILINE
    )

    return markdown_content


def create_markdown_header(chapter_id: str, chapter_info: Dict, crawled_date: str) -> str:
    """Generate YAML frontmatter metadata header"""
    header = f"""---
title: {chapter_info['title']}
description: {chapter_info['description']}
source: {chapter_info['url']}
library: OpenIntro
category: statistics-theory
license: CC BY-SA 3.0
copyright: OpenIntro Project (www.openintro.org)
crawled_date: {crawled_date}
note: 통계 이론 및 개념만 포함. R/Python 코드는 제거되었습니다.
---

# {chapter_info['title']}

**설명**: {chapter_info['description']}

**원본 출처**: [OpenIntro Statistics]({chapter_info['url']})

**라이선스**: CC BY-SA 3.0 (상업적 사용 가능)

---

"""
    return header


async def crawl_single_chapter(
    chapter_id: str,
    chapter_info: Dict,
    output_dir: Path,
    crawled_date: str,
    remove_code: bool = True
) -> Dict:
    """
    단일 챕터 크롤링

    Args:
        chapter_id: 챕터 ID (파일명)
        chapter_info: 챕터 정보 (title, url, description)
        output_dir: 저장 디렉토리
        crawled_date: 크롤링 날짜
        remove_code: 코드 블록 제거 여부 (기본 True)

    Returns:
        dict: {"success": bool, "chapter": str, "chars": int, "error": str}
    """
    url = chapter_info['url']
    output_path = output_dir / f"{chapter_id}.md"

    try:
        print(f"[CRAWL] {chapter_id} ({chapter_info['title']})")

        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(url=url)
            markdown_content = result.markdown

            # 코드 블록 제거 (옵션)
            if remove_code:
                markdown_content = remove_code_blocks(markdown_content)

            # Add metadata header
            header = create_markdown_header(chapter_id, chapter_info, crawled_date)
            full_content = header + markdown_content

            # Save to file
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(full_content)

            chars = len(full_content)
            print(f"[OK] {chapter_id}: {chars:,} characters")

            return {
                "success": True,
                "chapter": chapter_id,
                "chars": chars,
                "error": None
            }

    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] {chapter_id}: {error_msg}")

        return {
            "success": False,
            "chapter": chapter_id,
            "chars": 0,
            "error": error_msg
        }


async def crawl_openintro_batch(delay_seconds: float = 2.0, remove_code: bool = True):
    """
    OpenIntro Statistics 배치 크롤링

    Args:
        delay_seconds: 크롤링 간 대기 시간 (기본 2초)
        remove_code: R/Python 코드 블록 제거 여부 (기본 True)
    """
    # Setup
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_dir = project_root / "data" / "openintro"
    output_dir.mkdir(parents=True, exist_ok=True)

    crawled_date = datetime.now().strftime("%Y-%m-%d")

    print("=" * 70)
    print("OpenIntro Statistics Batch Crawler")
    print("=" * 70)
    print(f"Total chapters: {len(OPENINTRO_CHAPTERS)}")
    print(f"Output directory: {output_dir}")
    print(f"Crawled date: {crawled_date}")
    print(f"Delay: {delay_seconds}s")
    print(f"Remove code blocks: {remove_code}")
    print("=" * 70)
    print()

    # Crawl
    results: List[Dict] = []

    for i, (chapter_id, chapter_info) in enumerate(OPENINTRO_CHAPTERS.items(), 1):
        print(f"[{i}/{len(OPENINTRO_CHAPTERS)}] ", end="")

        result = await crawl_single_chapter(
            chapter_id,
            chapter_info,
            output_dir,
            crawled_date,
            remove_code
        )
        results.append(result)

        # Delay between requests (except last one)
        if i < len(OPENINTRO_CHAPTERS):
            await asyncio.sleep(delay_seconds)

    # Summary
    print()
    print("=" * 70)
    print("Crawling Summary")
    print("=" * 70)

    success_count = sum(1 for r in results if r["success"])
    failed_count = len(results) - success_count
    total_chars = sum(r["chars"] for r in results)

    print(f"Total: {len(results)}")
    print(f"Success: {success_count} ({success_count/len(results)*100:.1f}%)")
    print(f"Failed: {failed_count}")
    print(f"Total characters: {total_chars:,}")
    print()

    # Failed chapters
    if failed_count > 0:
        print("Failed chapters:")
        for result in results:
            if not result["success"]:
                print(f"  - {result['chapter']}: {result['error']}")
        print()

    # Save log
    log_path = project_root / "data" / f"crawl_log_openintro_{crawled_date}.txt"
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"OpenIntro Statistics Crawling Log - {crawled_date}\n")
        f.write("=" * 70 + "\n\n")

        for result in results:
            status = "SUCCESS" if result["success"] else "FAILED"
            f.write(f"[{status}] {result['chapter']}: {result['chars']:,} chars\n")
            if result["error"]:
                f.write(f"  Error: {result['error']}\n")

        f.write(f"\n" + "=" * 70 + "\n")
        f.write(f"Total: {len(results)}\n")
        f.write(f"Success: {success_count}\n")
        f.write(f"Failed: {failed_count}\n")
        f.write(f"Total characters: {total_chars:,}\n")
        f.write(f"Code blocks removed: {remove_code}\n")

    print(f"Log saved: {log_path}")
    print("=" * 70)

    return results


if __name__ == "__main__":
    print("Starting OpenIntro Statistics batch crawler...")
    print(f"Python: {sys.version}")
    print(f"Platform: {sys.platform}")
    print()

    # Run crawler (코드 블록 제거 활성화)
    results = asyncio.run(crawl_openintro_batch(
        delay_seconds=2.0,
        remove_code=True  # ← 통계 이론만 추출
    ))

    # Exit code
    failed_count = sum(1 for r in results if not r["success"])
    sys.exit(0 if failed_count == 0 else 1)
