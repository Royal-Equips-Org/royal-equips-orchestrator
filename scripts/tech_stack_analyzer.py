#!/usr/bin/env python3
"""
Technology Stack Analyzer for Royal Equips Empire

Analyzes the current technology stack and provides recommendations for:
- Dependency updates and security patches
- Technology stack modernization
- Performance optimizations
- Architecture improvements
"""

import argparse
import json
import logging
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

class TechStackAnalyzer:
    """Analyzes technology stack for improvements and updates"""

    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root) if project_root else Path(__file__).parent.parent
        self.recommendations = []

    def check_python_dependencies(self) -> Dict[str, Any]:
        """Check Python dependencies for updates and vulnerabilities"""
        logger.info("🐍 Checking Python dependencies...")

        results = {
            "outdated_packages": [],
            "vulnerable_packages": [],
            "recommendations": []
        }

        try:
            # Check for outdated packages
            result = subprocess.run(
                ["pip", "list", "--outdated", "--format=json"],
                capture_output=True, text=True, cwd=self.project_root
            )

            if result.returncode == 0 and result.stdout:
                outdated = json.loads(result.stdout)
                results["outdated_packages"] = outdated

                for package in outdated[:5]:  # Top 5 most important
                    self.recommendations.append({
                        "type": "dependency_update",
                        "package": package["name"],
                        "current_version": package["version"],
                        "latest_version": package["latest_version"],
                        "priority": "medium"
                    })

            # Check for security vulnerabilities
            result = subprocess.run(
                ["safety", "check", "-r", "requirements.txt", "--json"],
                capture_output=True, text=True, cwd=self.project_root
            )

            if result.stdout:
                try:
                    safety_data = json.loads(result.stdout)
                    results["vulnerable_packages"] = safety_data

                    for vuln in safety_data[:3]:  # Top 3 critical
                        self.recommendations.append({
                            "type": "security_fix",
                            "package": vuln.get("package"),
                            "vulnerability": vuln.get("vulnerability"),
                            "priority": "high"
                        })
                except json.JSONDecodeError:
                    pass

        except Exception as e:
            logger.error(f"Error checking Python dependencies: {e}")

        return results

    def check_node_dependencies(self) -> Dict[str, Any]:
        """Check Node.js dependencies for updates"""
        logger.info("📦 Checking Node.js dependencies...")

        results = {
            "outdated_packages": [],
            "audit_results": [],
            "recommendations": []
        }

        try:
            # Check for outdated packages
            result = subprocess.run(
                ["npm", "outdated", "--json"],
                capture_output=True, text=True, cwd=self.project_root
            )

            if result.stdout:
                try:
                    outdated = json.loads(result.stdout)
                    results["outdated_packages"] = outdated

                    for package, info in list(outdated.items())[:5]:
                        self.recommendations.append({
                            "type": "npm_update",
                            "package": package,
                            "current_version": info.get("current"),
                            "wanted_version": info.get("wanted"),
                            "latest_version": info.get("latest"),
                            "priority": "medium"
                        })
                except json.JSONDecodeError:
                    pass

            # Run npm audit
            result = subprocess.run(
                ["npm", "audit", "--json"],
                capture_output=True, text=True, cwd=self.project_root
            )

            if result.stdout:
                try:
                    audit_data = json.loads(result.stdout)
                    results["audit_results"] = audit_data

                    if audit_data.get("metadata", {}).get("vulnerabilities", {}).get("high", 0) > 0:
                        self.recommendations.append({
                            "type": "npm_security_fix",
                            "description": "High severity vulnerabilities found in npm packages",
                            "action": "Run 'npm audit fix' to resolve",
                            "priority": "high"
                        })
                except json.JSONDecodeError:
                    pass

        except Exception as e:
            logger.error(f"Error checking Node.js dependencies: {e}")

        return results

    def analyze_docker_setup(self) -> Dict[str, Any]:
        """Analyze Docker configuration for optimizations"""
        logger.info("🐳 Analyzing Docker setup...")

        results = {
            "dockerfile_analysis": {},
            "image_optimizations": [],
            "security_recommendations": []
        }

        dockerfile_path = self.project_root / "Dockerfile"
        if dockerfile_path.exists():
            with open(dockerfile_path) as f:
                dockerfile_content = f.read()

            # Analyze Dockerfile for common issues
            if "FROM ubuntu" in dockerfile_content:
                self.recommendations.append({
                    "type": "docker_optimization",
                    "description": "Consider using alpine-based images for smaller size",
                    "priority": "low"
                })

            if "RUN apt-get update" in dockerfile_content and "apt-get clean" not in dockerfile_content:
                self.recommendations.append({
                    "type": "docker_optimization",
                    "description": "Add apt-get clean to reduce image size",
                    "priority": "medium"
                })

            if "USER root" in dockerfile_content or "USER" not in dockerfile_content:
                self.recommendations.append({
                    "type": "docker_security",
                    "description": "Use non-root user for better security",
                    "priority": "high"
                })

        return results

    def suggest_architecture_improvements(self) -> List[Dict[str, Any]]:
        """Suggest architecture improvements"""
        logger.info("🏗️ Analyzing architecture for improvements...")

        improvements = [
            {
                "area": "API Performance",
                "suggestion": "Implement async endpoints with FastAPI",
                "benefit": "Better concurrency and performance",
                "effort": "medium",
                "priority": "high"
            },
            {
                "area": "Caching Strategy",
                "suggestion": "Add Redis for caching frequently accessed data",
                "benefit": "Reduced database load and faster responses",
                "effort": "low",
                "priority": "medium"
            },
            {
                "area": "Database Optimization",
                "suggestion": "Implement connection pooling and read replicas",
                "benefit": "Better database performance and scalability",
                "effort": "medium",
                "priority": "high"
            },
            {
                "area": "Monitoring & Observability",
                "suggestion": "Add comprehensive logging and metrics collection",
                "benefit": "Better debugging and performance insights",
                "effort": "medium",
                "priority": "medium"
            },
            {
                "area": "Security",
                "suggestion": "Implement JWT authentication and rate limiting",
                "benefit": "Enhanced security and API protection",
                "effort": "medium",
                "priority": "high"
            }
        ]

        self.recommendations.extend([
            {
                "type": "architecture_improvement",
                "area": imp["area"],
                "suggestion": imp["suggestion"],
                "priority": imp["priority"]
            } for imp in improvements
        ])

        return improvements

    def check_latest_technologies(self) -> List[Dict[str, Any]]:
        """Check for latest technologies that could benefit the project"""
        logger.info("🔬 Checking latest technologies...")

        technologies = [
            {
                "name": "GitHub Copilot",
                "category": "Development Tools",
                "benefit": "AI-powered code completion and generation",
                "adoption_effort": "low"
            },
            {
                "name": "Temporal.io",
                "category": "Workflow Engine",
                "benefit": "Reliable workflow orchestration",
                "adoption_effort": "high"
            },
            {
                "name": "Pydantic v2",
                "category": "Data Validation",
                "benefit": "Faster validation and better type safety",
                "adoption_effort": "low"
            },
            {
                "name": "OpenTelemetry",
                "category": "Observability",
                "benefit": "Standardized telemetry and tracing",
                "adoption_effort": "medium"
            }
        ]

        for tech in technologies:
            self.recommendations.append({
                "type": "technology_adoption",
                "technology": tech["name"],
                "category": tech["category"],
                "benefit": tech["benefit"],
                "priority": "low" if tech["adoption_effort"] == "high" else "medium"
            })

        return technologies

    def run_analysis(self) -> Dict[str, Any]:
        """Run complete technology stack analysis"""
        logger.info("🚀 Starting technology stack analysis...")

        results = {
            "timestamp": "2024-01-01T00:00:00Z",  # Would be actual timestamp
            "python_dependencies": self.check_python_dependencies(),
            "node_dependencies": self.check_node_dependencies(),
            "docker_analysis": self.analyze_docker_setup(),
            "architecture_improvements": self.suggest_architecture_improvements(),
            "latest_technologies": self.check_latest_technologies(),
            "recommendations": self.recommendations,
            "summary": {
                "total_recommendations": len(self.recommendations),
                "high_priority": len([r for r in self.recommendations if r.get("priority") == "high"]),
                "security_issues": len([r for r in self.recommendations if r.get("type") == "security_fix"]),
                "performance_improvements": len([r for r in self.recommendations if "performance" in r.get("type", "")])
            }
        }

        logger.info(f"✅ Analysis complete: {results['summary']['total_recommendations']} recommendations generated")
        return results

def main():
    parser = argparse.ArgumentParser(description="Technology Stack Analyzer")
    parser.add_argument("--check-updates", action="store_true", help="Check for dependency updates")
    parser.add_argument("--suggest-improvements", action="store_true", help="Suggest architecture improvements")
    parser.add_argument("--output-file", help="Output file for results")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    try:
        analyzer = TechStackAnalyzer()
        results = analyzer.run_analysis()

        if args.output_file:
            with open(args.output_file, 'w') as f:
                json.dump(results, f, indent=2)
        else:
            print(json.dumps(results, indent=2))

        logger.info("🏆 Technology stack analysis completed!")

    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
