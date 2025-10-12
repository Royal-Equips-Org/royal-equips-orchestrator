#!/usr/bin/env python3
"""
Autonomous Repository Improvement Agent

This script implements the autonomous scanning and improvement capabilities
for the Royal Equips Empire. It continuously scans the repository for:
- Outdated dependencies and security vulnerabilities
- Code quality issues and technical debt
- Missing documentation and tests
- Performance optimization opportunities
- Infrastructure improvements

The agent automatically creates PRs with fixes and improvements.
"""

import argparse
import asyncio
import json
import logging
import os
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional


class AutonomousImprovementAgent:
    """Agent that scans repository and creates improvement PRs."""

    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path).resolve()
        self.logger = self._setup_logging()
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.improvements_found: List[Dict[str, Any]] = []

    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        return logging.getLogger(__name__)

    async def scan_repository(self) -> Dict[str, Any]:
        """Comprehensive repository scan for improvement opportunities."""
        self.logger.info("🔍 Starting comprehensive repository scan...")

        scan_results = {
            "timestamp": datetime.utcnow().isoformat(),
            "scan_duration": 0,
            "improvements": {
                "security": [],
                "dependencies": [],
                "code_quality": [],
                "performance": [],
                "documentation": [],
                "infrastructure": [],
                "testing": []
            }
        }

        start_time = time.time()

        try:
            # Security vulnerability scan
            await self._scan_security_vulnerabilities(scan_results["improvements"]["security"])

            # Dependency analysis
            await self._scan_dependencies(scan_results["improvements"]["dependencies"])

            # Code quality analysis
            await self._scan_code_quality(scan_results["improvements"]["code_quality"])

            # Performance analysis
            await self._scan_performance_issues(scan_results["improvements"]["performance"])

            # Documentation gaps
            await self._scan_documentation(scan_results["improvements"]["documentation"])

            # Infrastructure improvements
            await self._scan_infrastructure(scan_results["improvements"]["infrastructure"])

            # Testing coverage
            await self._scan_testing(scan_results["improvements"]["testing"])

            scan_results["scan_duration"] = time.time() - start_time

            # Count total improvements
            total_improvements = sum(len(improvements) for improvements in scan_results["improvements"].values())
            self.logger.info(f"✅ Repository scan completed: {total_improvements} improvements identified")

            return scan_results

        except Exception as exc:
            self.logger.error(f"Repository scan failed: {exc}")
            raise

    async def _scan_security_vulnerabilities(self, security_issues: List[Dict[str, Any]]) -> None:
        """Scan for security vulnerabilities."""
        try:
            self.logger.info("🔒 Scanning for security vulnerabilities...")

            # Run safety check for Python dependencies
            try:
                result = subprocess.run(
                    ["safety", "check", "--json"],
                    cwd=self.repo_path,
                    capture_output=True,
                    text=True,
                    timeout=60
                )

                if result.returncode != 0 and result.stdout:
                    safety_data = json.loads(result.stdout)
                    for vuln in safety_data:
                        security_issues.append({
                            "type": "dependency_vulnerability",
                            "severity": "high",
                            "package": vuln.get("package_name"),
                            "version": vuln.get("installed_version"),
                            "vulnerability": vuln.get("vulnerability"),
                            "fix": f"Update {vuln.get('package_name')} to version {vuln.get('fixed_in', 'latest')}",
                            "auto_fixable": True
                        })
            except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
                pass

            # Run bandit for Python SAST
            try:
                result = subprocess.run(
                    ["bandit", "-r", ".", "-f", "json"],
                    cwd=self.repo_path,
                    capture_output=True,
                    text=True,
                    timeout=60
                )

                if result.stdout:
                    bandit_data = json.loads(result.stdout)
                    for issue in bandit_data.get("results", []):
                        security_issues.append({
                            "type": "static_analysis_security",
                            "severity": issue.get("issue_severity").lower(),
                            "file": issue.get("filename"),
                            "line": issue.get("line_number"),
                            "issue": issue.get("issue_text"),
                            "confidence": issue.get("issue_confidence"),
                            "auto_fixable": False
                        })
            except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
                pass

            # Check for hardcoded secrets
            await self._scan_secrets(security_issues)

            self.logger.info(f"Security scan completed: {len(security_issues)} issues found")

        except Exception as exc:
            self.logger.error(f"Security scan failed: {exc}")

    async def _scan_secrets(self, security_issues: List[Dict[str, Any]]) -> None:
        """Scan for hardcoded secrets and credentials."""
        try:
            secret_patterns = [
                (r"password\s*=\s*['\"][^'\"]+['\"]", "hardcoded_password"),
                (r"api_key\s*=\s*['\"][^'\"]+['\"]", "hardcoded_api_key"),
                (r"secret_key\s*=\s*['\"][^'\"]+['\"]", "hardcoded_secret_key"),
                (r"token\s*=\s*['\"][^'\"]+['\"]", "hardcoded_token"),
            ]

            import re

            for file_path in self.repo_path.rglob("*.py"):
                if "test" in str(file_path) or ".venv" in str(file_path):
                    continue

                try:
                    content = file_path.read_text(encoding='utf-8')
                    for pattern, secret_type in secret_patterns:
                        matches = re.finditer(pattern, content, re.IGNORECASE)
                        for match in matches:
                            line_num = content[:match.start()].count('\n') + 1
                            security_issues.append({
                                "type": "hardcoded_secret",
                                "severity": "high",
                                "file": str(file_path.relative_to(self.repo_path)),
                                "line": line_num,
                                "issue": f"Potential {secret_type} found",
                                "fix": "Move to environment variables or secrets management",
                                "auto_fixable": False
                            })
                except Exception:
                    continue

        except Exception as exc:
            self.logger.error(f"Secret scanning failed: {exc}")

    async def _scan_dependencies(self, dependency_issues: List[Dict[str, Any]]) -> None:
        """Scan for outdated dependencies."""
        try:
            self.logger.info("📦 Scanning dependencies...")

            # Check Python dependencies
            if (self.repo_path / "requirements.txt").exists():
                try:
                    result = subprocess.run(
                        ["pip", "list", "--outdated", "--format=json"],
                        cwd=self.repo_path,
                        capture_output=True,
                        text=True,
                        timeout=60
                    )

                    if result.stdout:
                        outdated = json.loads(result.stdout)
                        for package in outdated:
                            dependency_issues.append({
                                "type": "outdated_python_package",
                                "package": package["name"],
                                "current_version": package["version"],
                                "latest_version": package["latest_version"],
                                "fix": f"Update {package['name']} from {package['version']} to {package['latest_version']}",
                                "auto_fixable": True
                            })
                except (subprocess.TimeoutExpired, json.JSONDecodeError):
                    pass

            # Check Node.js dependencies
            if (self.repo_path / "package.json").exists():
                try:
                    result = subprocess.run(
                        ["npm", "outdated", "--json"],
                        cwd=self.repo_path,
                        capture_output=True,
                        text=True,
                        timeout=60
                    )

                    if result.stdout:
                        outdated = json.loads(result.stdout)
                        for package, info in outdated.items():
                            dependency_issues.append({
                                "type": "outdated_npm_package",
                                "package": package,
                                "current_version": info.get("current"),
                                "latest_version": info.get("latest"),
                                "fix": f"Update {package} from {info.get('current')} to {info.get('latest')}",
                                "auto_fixable": True
                            })
                except (subprocess.TimeoutExpired, json.JSONDecodeError):
                    pass

            self.logger.info(f"Dependency scan completed: {len(dependency_issues)} outdated packages found")

        except Exception as exc:
            self.logger.error(f"Dependency scan failed: {exc}")

    async def _scan_code_quality(self, quality_issues: List[Dict[str, Any]]) -> None:
        """Scan for code quality issues."""
        try:
            self.logger.info("🧹 Scanning code quality...")

            # Run flake8 for Python
            try:
                result = subprocess.run(
                    ["flake8", "--format=json", "."],
                    cwd=self.repo_path,
                    capture_output=True,
                    text=True,
                    timeout=60
                )

                if result.stdout:
                    for line in result.stdout.strip().split('\n'):
                        if line:
                            try:
                                issue = json.loads(line)
                                quality_issues.append({
                                    "type": "code_style",
                                    "file": issue.get("filename"),
                                    "line": issue.get("line_number"),
                                    "column": issue.get("column_number"),
                                    "issue": issue.get("text"),
                                    "rule": issue.get("code"),
                                    "auto_fixable": issue.get("code", "").startswith(("E", "W"))
                                })
                            except json.JSONDecodeError:
                                continue
            except (subprocess.TimeoutExpired, FileNotFoundError):
                pass

            # Check for TODO/FIXME comments
            await self._scan_todos(quality_issues)

            self.logger.info(f"Code quality scan completed: {len(quality_issues)} issues found")

        except Exception as exc:
            self.logger.error(f"Code quality scan failed: {exc}")

    async def _scan_todos(self, quality_issues: List[Dict[str, Any]]) -> None:
        """Scan for TODO/FIXME comments that should be addressed."""
        try:
            import re

            todo_pattern = re.compile(r'#\s*(TODO|FIXME|HACK|XXX):?\s*(.+)', re.IGNORECASE)

            for file_path in self.repo_path.rglob("*.py"):
                if ".venv" in str(file_path) or "__pycache__" in str(file_path):
                    continue

                try:
                    content = file_path.read_text(encoding='utf-8')
                    lines = content.split('\n')

                    for line_num, line in enumerate(lines, 1):
                        match = todo_pattern.search(line)
                        if match:
                            todo_type = match.group(1).upper()
                            todo_text = match.group(2).strip()

                            quality_issues.append({
                                "type": "todo_comment",
                                "file": str(file_path.relative_to(self.repo_path)),
                                "line": line_num,
                                "todo_type": todo_type,
                                "issue": f"{todo_type}: {todo_text}",
                                "auto_fixable": False
                            })
                except Exception:
                    continue

        except Exception as exc:
            self.logger.error(f"TODO scanning failed: {exc}")

    async def _scan_performance_issues(self, performance_issues: List[Dict[str, Any]]) -> None:
        """Scan for performance optimization opportunities."""
        try:
            self.logger.info("⚡ Scanning for performance issues...")

            # Look for common performance anti-patterns
            await self._scan_performance_patterns(performance_issues)

            self.logger.info(f"Performance scan completed: {len(performance_issues)} issues found")

        except Exception as exc:
            self.logger.error(f"Performance scan failed: {exc}")

    async def _scan_performance_patterns(self, performance_issues: List[Dict[str, Any]]) -> None:
        """Scan for performance anti-patterns in code."""
        try:
            import re

            patterns = [
                (r'for\s+\w+\s+in\s+range\(len\([^)]+\)\):', "Use enumerate() instead of range(len())"),
                (r'\.append\([^)]+\)\s*\n\s*for\s+', "Consider list comprehension instead of append in loop"),
                (r'time\.sleep\(\d+\)', "Long sleep() calls may impact performance"),
            ]

            for file_path in self.repo_path.rglob("*.py"):
                if ".venv" in str(file_path) or "__pycache__" in str(file_path):
                    continue

                try:
                    content = file_path.read_text(encoding='utf-8')

                    for pattern, suggestion in patterns:
                        matches = re.finditer(pattern, content, re.MULTILINE)
                        for match in matches:
                            line_num = content[:match.start()].count('\n') + 1
                            performance_issues.append({
                                "type": "performance_pattern",
                                "file": str(file_path.relative_to(self.repo_path)),
                                "line": line_num,
                                "issue": suggestion,
                                "code_snippet": match.group(0),
                                "auto_fixable": False
                            })
                except Exception:
                    continue

        except Exception as exc:
            self.logger.error(f"Performance pattern scanning failed: {exc}")

    async def _scan_documentation(self, doc_issues: List[Dict[str, Any]]) -> None:
        """Scan for missing or outdated documentation."""
        try:
            self.logger.info("📚 Scanning documentation...")

            # Check for missing docstrings
            await self._scan_missing_docstrings(doc_issues)

            # Check for outdated README
            await self._scan_readme_freshness(doc_issues)

            self.logger.info(f"Documentation scan completed: {len(doc_issues)} issues found")

        except Exception as exc:
            self.logger.error(f"Documentation scan failed: {exc}")

    async def _scan_missing_docstrings(self, doc_issues: List[Dict[str, Any]]) -> None:
        """Scan for missing docstrings in Python files."""
        try:
            import ast

            for file_path in self.repo_path.rglob("*.py"):
                if ".venv" in str(file_path) or "__pycache__" in str(file_path):
                    continue

                try:
                    content = file_path.read_text(encoding='utf-8')
                    tree = ast.parse(content)

                    for node in ast.walk(tree):
                        if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                            if not ast.get_docstring(node):
                                doc_issues.append({
                                    "type": "missing_docstring",
                                    "file": str(file_path.relative_to(self.repo_path)),
                                    "line": node.lineno,
                                    "item_type": "class" if isinstance(node, ast.ClassDef) else "function",
                                    "item_name": node.name,
                                    "issue": f"Missing docstring for {node.name}",
                                    "auto_fixable": True
                                })
                except Exception:
                    continue

        except Exception as exc:
            self.logger.error(f"Docstring scanning failed: {exc}")

    async def _scan_readme_freshness(self, doc_issues: List[Dict[str, Any]]) -> None:
        """Check if README needs updating."""
        try:
            readme_path = self.repo_path / "README.md"
            if readme_path.exists():
                stat = readme_path.stat()
                last_modified = datetime.fromtimestamp(stat.st_mtime)

                if datetime.now() - last_modified > timedelta(days=90):
                    doc_issues.append({
                        "type": "outdated_readme",
                        "file": "README.md",
                        "issue": f"README last updated {last_modified.strftime('%Y-%m-%d')} (over 90 days ago)",
                        "auto_fixable": False
                    })
        except Exception as exc:
            self.logger.error(f"README freshness check failed: {exc}")

    async def _scan_infrastructure(self, infra_issues: List[Dict[str, Any]]) -> None:
        """Scan for infrastructure improvements."""
        try:
            self.logger.info("🏗️ Scanning infrastructure...")

            # Check Docker configuration
            await self._scan_docker_config(infra_issues)

            # Check GitHub Actions workflows
            await self._scan_github_workflows(infra_issues)

            self.logger.info(f"Infrastructure scan completed: {len(infra_issues)} issues found")

        except Exception as exc:
            self.logger.error(f"Infrastructure scan failed: {exc}")

    async def _scan_docker_config(self, infra_issues: List[Dict[str, Any]]) -> None:
        """Scan Docker configuration for improvements."""
        try:
            dockerfile_path = self.repo_path / "Dockerfile"
            if dockerfile_path.exists():
                content = dockerfile_path.read_text()

                # Check for best practices
                if "FROM python:" in content and "FROM python:3.12-slim" not in content:
                    infra_issues.append({
                        "type": "docker_optimization",
                        "file": "Dockerfile",
                        "issue": "Consider using slim Python base image for smaller size",
                        "fix": "Use python:3.12-slim instead of python:3.12",
                        "auto_fixable": True
                    })

                if "apt-get update" in content and "rm -rf /var/lib/apt/lists/*" not in content:
                    infra_issues.append({
                        "type": "docker_optimization",
                        "file": "Dockerfile",
                        "issue": "Missing apt cache cleanup",
                        "fix": "Add 'rm -rf /var/lib/apt/lists/*' after apt-get install",
                        "auto_fixable": True
                    })
        except Exception as exc:
            self.logger.error(f"Docker config scan failed: {exc}")

    async def _scan_github_workflows(self, infra_issues: List[Dict[str, Any]]) -> None:
        """Scan GitHub Actions workflows for improvements."""
        try:
            workflows_dir = self.repo_path / ".github" / "workflows"
            if workflows_dir.exists():
                for workflow_file in workflows_dir.glob("*.yml"):
                    content = workflow_file.read_text()

                    # Check for outdated actions
                    if "actions/checkout@v3" in content:
                        infra_issues.append({
                            "type": "outdated_github_action",
                            "file": str(workflow_file.relative_to(self.repo_path)),
                            "issue": "Using outdated checkout action",
                            "fix": "Update actions/checkout@v3 to actions/checkout@v5",
                            "auto_fixable": True
                        })

                    if "actions/setup-python@v4" in content:
                        infra_issues.append({
                            "type": "outdated_github_action",
                            "file": str(workflow_file.relative_to(self.repo_path)),
                            "issue": "Using outdated setup-python action",
                            "fix": "Update actions/setup-python@v4 to actions/setup-python@v6",
                            "auto_fixable": True
                        })
        except Exception as exc:
            self.logger.error(f"GitHub workflows scan failed: {exc}")

    async def _scan_testing(self, test_issues: List[Dict[str, Any]]) -> None:
        """Scan for testing improvements."""
        try:
            self.logger.info("🧪 Scanning testing coverage...")

            # Check test coverage
            try:
                result = subprocess.run(
                    ["python", "-m", "pytest", "--cov=.", "--cov-report=json", "--tb=no", "-q"],
                    cwd=self.repo_path,
                    capture_output=True,
                    text=True,
                    timeout=120
                )

                coverage_file = self.repo_path / "coverage.json"
                if coverage_file.exists():
                    coverage_data = json.loads(coverage_file.read_text())
                    total_coverage = coverage_data.get("totals", {}).get("percent_covered", 0)

                    if total_coverage < 80:
                        test_issues.append({
                            "type": "low_test_coverage",
                            "coverage_percent": total_coverage,
                            "issue": f"Test coverage is {total_coverage:.1f}% (target: 80%)",
                            "auto_fixable": False
                        })

                    # Find files with low coverage
                    for file_path, file_data in coverage_data.get("files", {}).items():
                        file_coverage = file_data.get("summary", {}).get("percent_covered", 0)
                        if file_coverage < 60 and not file_path.startswith("test"):
                            test_issues.append({
                                "type": "file_low_coverage",
                                "file": file_path,
                                "coverage_percent": file_coverage,
                                "issue": f"File has {file_coverage:.1f}% test coverage",
                                "auto_fixable": False
                            })
            except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
                pass

            self.logger.info(f"Testing scan completed: {len(test_issues)} issues found")

        except Exception as exc:
            self.logger.error(f"Testing scan failed: {exc}")

    async def create_improvement_pr(self, improvements: Dict[str, Any]) -> Optional[str]:
        """Create a PR with automated improvements."""
        if not self.github_token:
            self.logger.warning("No GitHub token provided, skipping PR creation")
            return None

        try:
            self.logger.info("🚀 Creating improvement PR...")

            # Determine which improvements can be auto-fixed
            auto_fixable = []
            for category, issues in improvements["improvements"].items():
                auto_fixable.extend([issue for issue in issues if issue.get("auto_fixable", False)])

            if not auto_fixable:
                self.logger.info("No auto-fixable improvements found")
                return None

            # Create a new branch
            branch_name = f"autonomous-improvements-{int(time.time())}"

            # Apply fixes
            fixes_applied = await self._apply_automated_fixes(auto_fixable)

            if not fixes_applied:
                self.logger.info("No fixes could be applied automatically")
                return None

            # Create PR description
            pr_description = self._generate_pr_description(auto_fixable, fixes_applied)

            # Create PR using GitHub CLI (if available)
            try:
                subprocess.run([
                    "gh", "pr", "create",
                    "--title", f"🤖 Autonomous Improvements - {datetime.now().strftime('%Y-%m-%d')}",
                    "--body", pr_description,
                    "--head", branch_name,
                    "--base", "main"
                ], cwd=self.repo_path, check=True)

                self.logger.info(f"✅ Improvement PR created on branch {branch_name}")
                return branch_name

            except subprocess.CalledProcessError:
                self.logger.error("Failed to create PR with GitHub CLI")
                return None

        except Exception as exc:
            self.logger.error(f"PR creation failed: {exc}")
            return None

    async def _apply_automated_fixes(self, auto_fixable: List[Dict[str, Any]]) -> List[str]:
        """Apply automated fixes to the repository."""
        fixes_applied = []

        for issue in auto_fixable:
            try:
                if issue["type"] == "outdated_python_package":
                    # Update Python package
                    package = issue["package"]
                    subprocess.run([
                        "pip", "install", "--upgrade", package
                    ], cwd=self.repo_path, check=True)
                    fixes_applied.append(f"Updated {package} to latest version")

                elif issue["type"] == "outdated_github_action":
                    # Update GitHub Action version
                    file_path = self.repo_path / issue["file"]
                    content = file_path.read_text()

                    if "actions/checkout@v3" in content:
                        content = content.replace("actions/checkout@v3", "actions/checkout@v5")
                        file_path.write_text(content)
                        fixes_applied.append("Updated checkout action to v5")

                    if "actions/setup-python@v4" in content:
                        content = content.replace("actions/setup-python@v4", "actions/setup-python@v6")
                        file_path.write_text(content)
                        fixes_applied.append("Updated setup-python action to v6")

                elif issue["type"] == "docker_optimization":
                    # Apply Docker optimizations
                    dockerfile_path = self.repo_path / "Dockerfile"
                    content = dockerfile_path.read_text()

                    if "python:3.12" in content and "slim" not in content:
                        content = content.replace("FROM python:3.12", "FROM python:3.12-slim")
                        dockerfile_path.write_text(content)
                        fixes_applied.append("Updated to slim Python base image")

                elif issue["type"] == "missing_docstring":
                    # Add basic docstring template
                    await self._add_basic_docstring(issue)
                    fixes_applied.append(f"Added docstring to {issue['item_name']}")

            except Exception as exc:
                self.logger.error(f"Failed to apply fix for {issue['type']}: {exc}")
                continue

        return fixes_applied

    async def _add_basic_docstring(self, issue: Dict[str, Any]) -> None:
        """Add a basic docstring template."""
        try:
            file_path = self.repo_path / issue["file"]
            content = file_path.read_text()
            lines = content.split('\n')

            # Find the function/class definition line
            target_line = issue["line"] - 1  # Convert to 0-based index

            if target_line < len(lines):
                # Insert basic docstring
                indent = len(lines[target_line]) - len(lines[target_line].lstrip())
                indent_str = ' ' * (indent + 4)

                if issue["item_type"] == "function":
                    docstring = f'{indent_str}"""TODO: Add function description."""'
                else:
                    docstring = f'{indent_str}"""TODO: Add class description."""'

                lines.insert(target_line + 1, docstring)
                file_path.write_text('\n'.join(lines))

        except Exception as exc:
            self.logger.error(f"Failed to add docstring: {exc}")

    def _generate_pr_description(self, auto_fixable: List[Dict[str, Any]], fixes_applied: List[str]) -> str:
        """Generate PR description for improvements."""
        description = """🤖 **Autonomous Repository Improvements**

This PR contains automated improvements identified by the Royal Equips Empire autonomous improvement agent.

## 🔧 Fixes Applied

"""

        for fix in fixes_applied:
            description += f"- ✅ {fix}\n"

        description += f"""

## 📊 Improvement Summary

- **Total issues identified**: {len(auto_fixable)}
- **Auto-fixes applied**: {len(fixes_applied)}
- **Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

## 🎯 Categories Addressed

"""

        categories = {}
        for issue in auto_fixable:
            category = issue["type"]
            if category not in categories:
                categories[category] = 0
            categories[category] += 1

        for category, count in categories.items():
            description += f"- **{category.replace('_', ' ').title()}**: {count} issues\n"

        description += """

---
*This PR was automatically generated by the Royal Equips Empire autonomous improvement system. 🚀*
"""

        return description


async def main():
    """Main entry point for the autonomous improvement agent."""
    parser = argparse.ArgumentParser(description="Autonomous Repository Improvement Agent")
    parser.add_argument("--scan", action="store_true", help="Run repository scan")
    parser.add_argument("--create-pr", action="store_true", help="Create improvement PR")
    parser.add_argument("--repo-path", default=".", help="Repository path")

    args = parser.parse_args()

    agent = AutonomousImprovementAgent(args.repo_path)

    if args.scan:
        scan_results = await agent.scan_repository()

        # Print scan results
        print(json.dumps(scan_results, indent=2))

        if args.create_pr:
            pr_branch = await agent.create_improvement_pr(scan_results)
            if pr_branch:
                print(f"✅ Improvement PR created on branch: {pr_branch}")
            else:
                print("ℹ️ No PR created (no auto-fixable improvements or no GitHub token)")


if __name__ == "__main__":
    asyncio.run(main())
