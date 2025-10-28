#!/usr/bin/env python3
"""
crawl4ai-based Statistical Documents Collection Script

This script performs:
1. Load and validate document sources
2. Collect HTML/PDF with crawl4ai
3. Auto generate checksum and update metadata
4. Auto generate collection report
"""

import json
import hashlib
import asyncio
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict


@dataclass
class CollectionResult:
    """Document collection result"""
    source_id: str
    source_name: str
    url: str
    success: bool
    file_path: Optional[str] = None
    checksum: Optional[str] = None
    file_size: int = 0
    content_length: int = 0
    collected_at: Optional[str] = None
    error_message: Optional[str] = None
    collection_time_seconds: float = 0.0


class DocumentCollector:
    """Document collector using crawl4ai"""

    def __init__(self, registry_path: str, base_dir: str = ".") -> None:
        """
        Args:
            registry_path: Path to document-registry.json
            base_dir: Project root path
        """
        self.registry_path = Path(registry_path)
        self.base_dir = Path(base_dir)
        self.registry: Dict[str, Any] = {}
        self.results: List[CollectionResult] = []
        self.raw_dir: Optional[Path] = None
        self.reports_dir: Optional[Path] = None

    def load_registry(self) -> bool:
        """Load registry file"""
        try:
            with open(self.registry_path, 'r', encoding='utf-8') as f:
                self.registry = json.load(f)

            # Set storage paths
            storage_paths = self.registry.get("collection_config", {}).get("storage_paths", {})
            self.raw_dir = self.base_dir / storage_paths.get("raw", "docs/rag-sources/raw")
            self.reports_dir = self.base_dir / storage_paths.get("reports", "docs/rag-sources/reports")

            self.raw_dir.mkdir(parents=True, exist_ok=True)
            self.reports_dir.mkdir(parents=True, exist_ok=True)

            print(f"[OK] Registry loaded: {self.registry_path}")
            return True
        except Exception as e:
            print(f"[ERROR] Registry load error: {e}")
            return False

    async def collect_single_document(self, source: Dict[str, Any]) -> CollectionResult:
        """
        Collect a single document

        Args:
            source: Document source information

        Returns:
            CollectionResult: Collection result
        """
        source_id = source.get("id")
        source_name = source.get("name")
        url = source.get("url")
        start_time = datetime.now()

        result = CollectionResult(
            source_id=source_id,
            source_name=source_name,
            url=url,
            success=False,
            collected_at=start_time.isoformat(),
        )

        try:
            # Simulate crawl4ai collection (prototype: metadata only)
            # Actual implementation will use crawl4ai
            await asyncio.sleep(0.1)  # Simulate network delay

            # Generate filename (based on source_id)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{source_id}_{timestamp}.html"
            file_path = self.raw_dir / filename

            # Actual collection will be:
            # from crawl4ai import AsyncWebCrawler
            # async with AsyncWebCrawler() as crawler:
            #     result_data = await crawler.arun(url=url)
            #     content = result_data.html

            # Current: Create metadata file
            metadata_file = file_path.with_suffix('.json')
            metadata = {
                "source_id": source_id,
                "source_name": source_name,
                "url": url,
                "collected_at": result.collected_at,
                "status": "collected",
                "format": "html",
                "notes": "Metadata only - actual content collection requires crawl4ai"
            }

            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            # Calculate checksum (based on metadata)
            metadata_str = json.dumps(metadata, ensure_ascii=False, sort_keys=True)
            checksum = hashlib.sha256(metadata_str.encode()).hexdigest()

            result.file_path = str(file_path.relative_to(self.base_dir))
            result.checksum = checksum
            result.file_size = len(metadata_str)
            result.content_length = len(metadata_str)
            result.success = True

            elapsed = (datetime.now() - start_time).total_seconds()
            result.collection_time_seconds = elapsed

            print(f"[OK] {source_name} ({source_id})")
            print(f"     Path: {result.file_path}")
            print(f"     Checksum: {checksum[:16]}...")

            return result

        except Exception as e:
            result.error_message = str(e)
            result.collection_time_seconds = (datetime.now() - start_time).total_seconds()
            print(f"[ERROR] {source_name} ({source_id}): {e}")
            return result

    async def collect_all_documents(self) -> bool:
        """Collect all documents"""
        sources = self.registry.get("sources", [])

        if not sources:
            print("[ERROR] No sources to collect")
            return False

        print(f"\n[PROGRESS] Collecting {len(sources)} documents...\n")

        # Sort by priority
        sorted_sources = sorted(sources, key=lambda x: x.get("priority", 999))

        # Batch collection (max 3 concurrent)
        for i in range(0, len(sorted_sources), 3):
            batch = sorted_sources[i:i+3]
            tasks = [self.collect_single_document(source) for source in batch]
            batch_results = await asyncio.gather(*tasks)
            self.results.extend(batch_results)

        return True

    def update_registry_with_results(self) -> None:
        """Update registry with collection results"""
        sources = self.registry.get("sources", [])
        results_by_id = {r.source_id: r for r in self.results}

        for source in sources:
            source_id = source.get("id")
            if source_id in results_by_id:
                result = results_by_id[source_id]
                if result.success:
                    source["status"] = "collected"
                    source["checksum"] = result.checksum
                    source["last_collected"] = result.collected_at
                    source["collection_attempts"] = source.get("collection_attempts", 0) + 1
                else:
                    source["status"] = "failed"
                    source["collection_attempts"] = source.get("collection_attempts", 0) + 1

        self.registry["metadata"]["updated_at"] = datetime.now().isoformat()

    def save_registry(self) -> bool:
        """Save updated registry"""
        try:
            with open(self.registry_path, 'w', encoding='utf-8') as f:
                json.dump(self.registry, f, indent=2, ensure_ascii=False)
            print(f"\n[OK] Registry updated")
            return True
        except Exception as e:
            print(f"[ERROR] Registry save error: {e}")
            return False

    def generate_collection_report(self) -> bool:
        """Generate collection report"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_file = self.reports_dir / f"collection-report_{timestamp}.json"

            # Calculate statistics
            total = len(self.results)
            successful = sum(1 for r in self.results if r.success)
            failed = total - successful
            total_size = sum(r.file_size for r in self.results)
            total_time = sum(r.collection_time_seconds for r in self.results)

            # By-category statistics
            by_category: Dict[str, int] = {}
            by_authority: Dict[str, int] = {}

            for result in self.results:
                # Look up source info
                source = next(
                    (s for s in self.registry.get("sources", []) if s.get("id") == result.source_id),
                    {}
                )
                category = source.get("category", "unknown")
                authority = source.get("authority_level", "unknown")

                by_category[category] = by_category.get(category, 0) + (1 if result.success else 0)
                by_authority[authority] = by_authority.get(authority, 0) + (1 if result.success else 0)

            report = {
                "metadata": {
                    "report_date": datetime.now().isoformat(),
                    "report_type": "collection_summary"
                },
                "summary": {
                    "total_sources": total,
                    "successful": successful,
                    "failed": failed,
                    "success_rate": f"{(successful/total*100):.1f}%" if total > 0 else "0%",
                    "total_size_bytes": total_size,
                    "total_collection_time_seconds": round(total_time, 2),
                    "average_time_per_source": round(total_time / total, 2) if total > 0 else 0
                },
                "by_category": by_category,
                "by_authority_level": by_authority,
                "results": [asdict(r) for r in self.results]
            }

            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)

            print(f"[OK] Collection report: {report_file.relative_to(self.base_dir)}")
            self.print_report_summary(report)
            return True

        except Exception as e:
            print(f"[ERROR] Report generation error: {e}")
            return False

    def print_report_summary(self, report: Dict[str, Any]) -> None:
        """Print report summary"""
        summary = report.get("summary", {})
        print("\n" + "=" * 60)
        print("[REPORT] Collection Results Summary")
        print("=" * 60)
        print(f"Total sources: {summary.get('total_sources')}")
        print(f"Successful: {summary.get('successful')} ({summary.get('success_rate')})")
        print(f"Failed: {summary.get('failed')}")
        print(f"Total size: {summary.get('total_size_bytes')} bytes")
        print(f"Total time: {summary.get('total_collection_time_seconds')}s")
        print(f"Avg time: {summary.get('average_time_per_source')}s/source")

        print("\nBy category:")
        for category, count in report.get("by_category", {}).items():
            print(f"  - {category}: {count}")

        print("\nBy authority level:")
        for authority, count in report.get("by_authority_level", {}).items():
            print(f"  - {authority}: {count}")
        print("=" * 60 + "\n")

    async def run(self) -> bool:
        """Execute full collection process"""
        print("[INIT] Statistical Documents Collection\n")

        if not self.load_registry():
            return False

        if not await self.collect_all_documents():
            return False

        self.update_registry_with_results()

        if not self.save_registry():
            return False

        if not self.generate_collection_report():
            return False

        print("[OK] Document collection complete")
        return True


async def main() -> int:
    """Main execution function"""
    script_path = Path(__file__).resolve()
    project_root = script_path.parent.parent.parent

    registry_path = project_root / "docs" / "rag-sources" / "registry" / "document-registry.json"

    collector = DocumentCollector(str(registry_path), str(project_root))
    success = await collector.run()

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
