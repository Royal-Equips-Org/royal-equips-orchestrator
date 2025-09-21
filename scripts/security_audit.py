#!/usr/bin/env python3
"""
Security Audit Script for Royal Equips Empire

Performs comprehensive security analysis including:
- Vulnerability scanning
- Secret detection
- Compliance checking
- Security best practices validation
"""

import argparse
import json
import logging
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class SecurityAuditor:
    """Comprehensive security auditing system"""
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root) if project_root else Path(__file__).parent.parent
        self.findings = []
        self.recommendations = []
    
    def scan_secrets(self) -> Dict[str, Any]:
        """Scan for hardcoded secrets and credentials"""
        logger.info("🔍 Scanning for secrets...")
        
        results = {
            "potential_secrets": [],
            "patterns_found": {},
            "files_scanned": 0
        }
        
        # Define secret patterns
        secret_patterns = {
            "api_key": r"api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]",
            "password": r"password\s*[:=]\s*['\"][^'\"]+['\"]",
            "token": r"token\s*[:=]\s*['\"][^'\"]+['\"]",
            "secret": r"secret\s*[:=]\s*['\"][^'\"]+['\"]",
            "aws_key": r"AKIA[0-9A-Z]{16}",
            "github_token": r"gh[pousr]_[A-Za-z0-9_]{36}",
        }
        
        try:
            # Use gitleaks if available
            result = subprocess.run(
                ["gitleaks", "detect", "--no-git", "--verbose", "--format", "json"],
                capture_output=True, text=True, cwd=self.project_root
            )
            
            if result.returncode == 0 and result.stdout:
                gitleaks_results = json.loads(result.stdout)
                results["potential_secrets"] = gitleaks_results
                
                for finding in gitleaks_results:
                    self.findings.append({
                        "type": "secret_detected",
                        "severity": "high",
                        "file": finding.get("File"),
                        "rule": finding.get("RuleID"),
                        "description": f"Potential secret detected: {finding.get('Description')}"
                    })
            
        except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
            logger.warning("Gitleaks not available, using basic pattern matching")
            
            # Fallback to basic pattern matching
            for pattern_name, pattern in secret_patterns.items():
                result = subprocess.run(
                    ["grep", "-r", "-n", "-E", pattern, ".", "--exclude-dir=.git", "--exclude-dir=node_modules"],
                    capture_output=True, text=True, cwd=self.project_root
                )
                
                if result.returncode == 0:
                    matches = result.stdout.strip().split('\n')
                    results["patterns_found"][pattern_name] = len(matches)
                    
                    for match in matches[:5]:  # Limit to first 5 matches
                        parts = match.split(':', 2)
                        if len(parts) >= 3:
                            self.findings.append({
                                "type": "potential_secret",
                                "severity": "medium",
                                "file": parts[0],
                                "line": parts[1],
                                "pattern": pattern_name,
                                "description": f"Potential {pattern_name} found"
                            })
        
        return results
    
    def check_dependencies(self) -> Dict[str, Any]:
        """Check dependencies for known vulnerabilities"""
        logger.info("📦 Checking dependencies for vulnerabilities...")
        
        results = {
            "python_vulnerabilities": [],
            "node_vulnerabilities": [],
            "total_issues": 0
        }
        
        # Check Python dependencies with safety
        try:
            result = subprocess.run(
                ["safety", "check", "-r", "requirements.txt", "--json"],
                capture_output=True, text=True, cwd=self.project_root
            )
            
            if result.stdout:
                safety_data = json.loads(result.stdout)
                results["python_vulnerabilities"] = safety_data
                
                for vuln in safety_data:
                    self.findings.append({
                        "type": "dependency_vulnerability",
                        "severity": "high",
                        "package": vuln.get("package"),
                        "vulnerability": vuln.get("vulnerability"),
                        "description": f"Vulnerable dependency: {vuln.get('package')}"
                    })
                    
        except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
            logger.warning("Safety check failed or not available")
        
        # Check Node.js dependencies
        try:
            result = subprocess.run(
                ["npm", "audit", "--json"],
                capture_output=True, text=True, cwd=self.project_root
            )
            
            if result.stdout:
                audit_data = json.loads(result.stdout)
                vulnerabilities = audit_data.get("vulnerabilities", {})
                results["node_vulnerabilities"] = vulnerabilities
                
                high_severity = sum(1 for v in vulnerabilities.values() 
                                  if v.get("severity") in ["high", "critical"])
                
                if high_severity > 0:
                    self.findings.append({
                        "type": "npm_vulnerabilities",
                        "severity": "high",
                        "count": high_severity,
                        "description": f"{high_severity} high/critical npm vulnerabilities found"
                    })
                    
        except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
            logger.warning("npm audit failed or not available")
        
        results["total_issues"] = len(self.findings)
        return results
    
    def analyze_code_security(self) -> Dict[str, Any]:
        """Analyze code for security issues using bandit"""
        logger.info("🔒 Analyzing code security...")
        
        results = {
            "security_issues": [],
            "severity_distribution": {},
            "files_analyzed": 0
        }
        
        try:
            result = subprocess.run(
                ["bandit", "-r", "app/", "orchestrator/", "-f", "json"],
                capture_output=True, text=True, cwd=self.project_root
            )
            
            if result.stdout:
                bandit_data = json.loads(result.stdout)
                security_issues = bandit_data.get("results", [])
                results["security_issues"] = security_issues
                results["files_analyzed"] = len(bandit_data.get("metrics", {}).get("_totals", {}).get("loc", 0))
                
                # Categorize by severity
                severity_counts = {}
                for issue in security_issues:
                    severity = issue.get("issue_severity", "unknown")
                    severity_counts[severity] = severity_counts.get(severity, 0) + 1
                    
                    self.findings.append({
                        "type": "security_issue",
                        "severity": severity.lower(),
                        "file": issue.get("filename"),
                        "line": issue.get("line_number"),
                        "test_id": issue.get("test_id"),
                        "description": issue.get("issue_text")
                    })
                
                results["severity_distribution"] = severity_counts
                
        except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
            logger.warning("Bandit analysis failed or not available")
        
        return results
    
    def check_configuration_security(self) -> Dict[str, Any]:
        """Check configuration files for security issues"""
        logger.info("⚙️ Checking configuration security...")
        
        results = {
            "config_issues": [],
            "recommendations": []
        }
        
        # Check for common misconfigurations
        config_files = [
            ".env", ".env.example", "docker-compose.yml", 
            "Dockerfile", "nginx.conf", "gunicorn.conf.py"
        ]
        
        for config_file in config_files:
            file_path = self.project_root / config_file
            if file_path.exists():
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Check for common security issues
                if "DEBUG=True" in content or "debug: true" in content:
                    results["config_issues"].append({
                        "file": config_file,
                        "issue": "Debug mode enabled",
                        "severity": "medium",
                        "recommendation": "Disable debug mode in production"
                    })
                
                if "password" in content.lower() and "=" in content:
                    results["config_issues"].append({
                        "file": config_file,
                        "issue": "Potential hardcoded password",
                        "severity": "high",
                        "recommendation": "Use environment variables for passwords"
                    })
        
        return results
    
    def generate_recommendations(self) -> List[Dict[str, Any]]:
        """Generate security recommendations based on findings"""
        logger.info("📋 Generating security recommendations...")
        
        recommendations = []
        
        # High priority recommendations
        if any(f["type"] == "secret_detected" for f in self.findings):
            recommendations.append({
                "priority": "critical",
                "category": "secrets",
                "title": "Remove Hardcoded Secrets",
                "description": "Hardcoded secrets detected in code. Move to environment variables.",
                "action_items": [
                    "Audit all detected secrets",
                    "Move secrets to environment variables",
                    "Rotate compromised credentials",
                    "Implement pre-commit hooks to prevent future issues"
                ]
            })
        
        if any(f["type"] == "dependency_vulnerability" for f in self.findings):
            recommendations.append({
                "priority": "high",
                "category": "dependencies",
                "title": "Update Vulnerable Dependencies",
                "description": "Known vulnerabilities found in project dependencies.",
                "action_items": [
                    "Review and update vulnerable packages",
                    "Test updated dependencies thoroughly",
                    "Implement automated vulnerability scanning",
                    "Set up dependency update automation"
                ]
            })
        
        # Medium priority recommendations
        security_issues = [f for f in self.findings if f["type"] == "security_issue"]
        if security_issues:
            recommendations.append({
                "priority": "medium",
                "category": "code_security",
                "title": "Address Code Security Issues",
                "description": f"{len(security_issues)} security issues found in code analysis.",
                "action_items": [
                    "Review flagged security issues",
                    "Implement secure coding practices",
                    "Add security linting to CI/CD pipeline",
                    "Provide security training for developers"
                ]
            })
        
        # General recommendations
        recommendations.extend([
            {
                "priority": "medium",
                "category": "monitoring",
                "title": "Implement Security Monitoring",
                "description": "Add comprehensive security monitoring and alerting.",
                "action_items": [
                    "Set up SIEM or security monitoring tool",
                    "Configure security alerts and notifications",
                    "Implement log analysis for security events",
                    "Regular security health checks"
                ]
            },
            {
                "priority": "low",
                "category": "compliance",
                "title": "Security Compliance Review",
                "description": "Ensure compliance with security standards and best practices.",
                "action_items": [
                    "Review OWASP Top 10 compliance",
                    "Implement security headers",
                    "Add input validation and sanitization",
                    "Regular security assessments"
                ]
            }
        ])
        
        self.recommendations = recommendations
        return recommendations
    
    def run_comprehensive_audit(self) -> Dict[str, Any]:
        """Run complete security audit"""
        logger.info("🚀 Starting comprehensive security audit...")
        
        audit_results = {
            "timestamp": "2024-01-01T00:00:00Z",  # Would be actual timestamp
            "secrets_scan": self.scan_secrets(),
            "dependency_check": self.check_dependencies(),
            "code_analysis": self.analyze_code_security(),
            "config_check": self.check_configuration_security(),
            "findings": self.findings,
            "recommendations": self.generate_recommendations(),
            "summary": {
                "total_findings": len(self.findings),
                "critical_issues": len([f for f in self.findings if f.get("severity") == "critical"]),
                "high_issues": len([f for f in self.findings if f.get("severity") == "high"]),
                "medium_issues": len([f for f in self.findings if f.get("severity") == "medium"]),
                "security_score": max(0, 100 - len(self.findings) * 5)  # Simple scoring
            }
        }
        
        logger.info(f"✅ Security audit complete: {audit_results['summary']['total_findings']} findings")
        return audit_results

def main():
    parser = argparse.ArgumentParser(description="Royal Equips Security Auditor")
    parser.add_argument("--comprehensive", action="store_true", help="Run comprehensive audit")
    parser.add_argument("--fix-issues", action="store_true", help="Attempt to fix detected issues")
    parser.add_argument("--output-file", help="Output file for results")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)
    
    try:
        auditor = SecurityAuditor()
        results = auditor.run_comprehensive_audit()
        
        if args.output_file:
            with open(args.output_file, 'w') as f:
                json.dump(results, f, indent=2)
        else:
            print(json.dumps(results, indent=2))
        
        # Exit with error code if critical issues found
        critical_issues = results["summary"]["critical_issues"]
        if critical_issues > 0:
            logger.error(f"❌ {critical_issues} critical security issues found!")
            sys.exit(1)
        
        logger.info("🏆 Security audit completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Security audit failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()