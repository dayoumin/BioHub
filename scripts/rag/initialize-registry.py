#!/usr/bin/env python3
"""
RAG Document Registry Initialization Script

This script performs:
1. Registry structure validation
2. Directory creation
3. Collection status initialization
4. Metadata validity check
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any


class RegistryInitializer:
    """Document registry initialization and management"""

    def __init__(self, registry_path: str, base_dir: str = ".") -> None:
        """
        Args:
            registry_path: Path to document-registry.json
            base_dir: Project root path
        """
        self.registry_path = Path(registry_path)
        self.base_dir = Path(base_dir)
        self.registry: Dict[str, Any] = {}

    def load_registry(self) -> bool:
        """Load registry file"""
        try:
            with open(self.registry_path, 'r', encoding='utf-8') as f:
                self.registry = json.load(f)
            print(f"[OK] Registry loaded: {self.registry_path}")
            return True
        except FileNotFoundError:
            print(f"[ERROR] Registry file not found: {self.registry_path}")
            return False
        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON parse error: {e}")
            return False

    def validate_registry(self) -> bool:
        """Validate registry structure"""
        errors: List[str] = []

        # Check required sections
        required_sections = ["metadata", "sources", "categories", "collection_config"]
        for section in required_sections:
            if section not in self.registry:
                errors.append(f"Missing section: {section}")

        # Validate metadata
        metadata = self.registry.get("metadata", {})
        if "version" not in metadata:
            errors.append("Missing 'version' field in metadata")
        if "total_sources" not in metadata:
            errors.append("Missing 'total_sources' field in metadata")

        # Validate source data
        sources = self.registry.get("sources", [])
        required_fields = ["id", "name", "url", "authority_level", "category", "status"]

        for idx, source in enumerate(sources):
            for field in required_fields:
                if field not in source:
                    errors.append(
                        f"Source {idx} ({source.get('id', 'unknown')}) missing field: {field}"
                    )

            # Validate authority_level
            if source.get("authority_level") not in ["primary", "secondary"]:
                errors.append(
                    f"Source {source.get('id')} has invalid authority_level: "
                    f"{source.get('authority_level')}"
                )

        # Validate categories
        categories = self.registry.get("categories", {})
        for source in sources:
            category = source.get("category")
            if category not in categories:
                errors.append(
                    f"Source {source.get('id')} references undefined category: {category}"
                )

        if errors:
            print("\n[ERROR] Registry validation failed:")
            for error in errors:
                print(f"  - {error}")
            return False

        print("[OK] Registry structure validation successful")
        return True

    def create_directories(self) -> bool:
        """Create required directories"""
        try:
            storage_paths = self.registry.get("collection_config", {}).get("storage_paths", {})

            for path_key, path_value in storage_paths.items():
                full_path = self.base_dir / path_value
                full_path.mkdir(parents=True, exist_ok=True)
                print(f"[OK] Directory created/verified: {full_path}")

            return True
        except Exception as e:
            print(f"[ERROR] Directory creation error: {e}")
            return False

    def initialize_status(self) -> None:
        """Initialize collection status"""
        now = datetime.now().isoformat()

        # Set all sources status to 'pending'
        for source in self.registry.get("sources", []):
            if source.get("status") != "pending":
                source["status"] = "pending"

        # Update metadata
        self.registry["metadata"]["updated_at"] = now
        self.registry["metadata"]["initialization_date"] = now
        self.registry["metadata"]["total_sources"] = len(self.registry.get("sources", []))

        sources_count = self.registry['metadata']['total_sources']
        print(f"[OK] Collection status initialized ({sources_count} sources)")

    def save_registry(self) -> bool:
        """Save updated registry"""
        try:
            with open(self.registry_path, 'w', encoding='utf-8') as f:
                json.dump(self.registry, f, indent=2, ensure_ascii=False)
            print(f"[OK] Registry saved: {self.registry_path}")
            return True
        except Exception as e:
            print(f"[ERROR] Registry save error: {e}")
            return False

    def print_summary(self) -> None:
        """Print initialization completion summary"""
        sources = self.registry.get("sources", [])
        primary_sources = [s for s in sources if s.get("authority_level") == "primary"]
        secondary_sources = [s for s in sources if s.get("authority_level") == "secondary"]

        print("\n" + "=" * 60)
        print("[SUMMARY] RAG Document Registry Initialization Complete")
        print("=" * 60)
        print(f"Total sources: {len(sources)}")
        print(f"  - Primary (Authoritative): {len(primary_sources)}")
        print(f"  - Secondary (Educational): {len(secondary_sources)}")

        # By category
        categories = self.registry.get("categories", {})
        print(f"\nCategories: {len(categories)}")
        for cat_id, cat_info in categories.items():
            count = sum(1 for s in sources if s.get("category") == cat_id)
            print(f"  - {cat_info['name']}: {count}")

        # By priority
        print("\nCollection priority order:")
        sorted_sources = sorted(sources, key=lambda x: x.get("priority", 999))
        for source in sorted_sources[:3]:
            print(f"  {source['priority']}. {source['name']}")

        storage_paths = self.registry.get("collection_config", {}).get("storage_paths", {})
        print(f"\nStorage locations:")
        for path_type, path_value in storage_paths.items():
            print(f"  - {path_type}: {path_value}")

        print("\nNext steps:")
        print("  1. python scripts/rag/collect-statistical-docs.py")
        print("  2. Document collection and processing (Docling parsing)")
        print("  3. Vector DB indexing")
        print("=" * 60 + "\n")

    def run(self) -> bool:
        """Execute full initialization process"""
        print("[INIT] RAG Document Registry Initialization\n")

        steps = [
            ("Registry Load", self.load_registry),
            ("Registry Validation", self.validate_registry),
            ("Directory Creation", self.create_directories),
        ]

        for idx, (step_name, step_func) in enumerate(steps, 1):
            print(f"\n[Step {idx}] {step_name}...")
            if not step_func():
                print(f"[ERROR] {step_name} failed. Initialization cancelled.")
                return False

        self.initialize_status()
        if not self.save_registry():
            print("[ERROR] Failed to save registry")
            return False

        self.print_summary()
        return True


def main() -> int:
    """Main execution function"""
    # Determine project root path
    script_path = Path(__file__).resolve()
    project_root = script_path.parent.parent.parent  # scripts/rag/ -> project root

    registry_path = project_root / "docs" / "rag-sources" / "registry" / "document-registry.json"

    initializer = RegistryInitializer(str(registry_path), str(project_root))

    success = initializer.run()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
