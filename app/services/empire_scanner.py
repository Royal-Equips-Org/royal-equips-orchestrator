"""
Empire System Scanner - Advanced vulnerability and code health analysis.

The Empire Scanner provides comprehensive analysis of the e-commerce empire,
identifying vulnerabilities, legacy code patterns, security gaps, and 
opportunities for optimization and evolution.

This scanner is designed to run continuously in the background, providing
real-time insights into system health and autonomous recommendations for
improvements.
"""

import ast
import logging
import os
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import json

logger = logging.getLogger(__name__)


class EmpireSystemScanner:
    """
    Comprehensive system scanner for e-commerce empire analysis.
    
    Provides automated vulnerability detection, code health analysis,
    security gap identification, and legacy code assessment.
    """
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root) if project_root else Path(__file__).parent.parent.parent
        self.scan_results = {}
        self.last_scan_time = None
        
        # Security patterns to detect
        self.security_patterns = {
            'hardcoded_secrets': [
                r'password\s*=\s*["\'][^"\']+["\']',
                r'api_key\s*=\s*["\'][^"\']+["\']',
                r'secret\s*=\s*["\'][^"\']+["\']',
                r'token\s*=\s*["\'][^"\']+["\']',
            ],
            'sql_injection_risk': [
                r'execute\s*\(\s*["\'].*%.*["\']',
                r'query\s*\(\s*["\'].*\+.*["\']',
                r'SELECT.*\+.*FROM',
            ],
            'xss_risk': [
                r'render_template_string\s*\(',
                r'Markup\s*\(',
                r'innerHTML\s*=',
            ],
            'csrf_risk': [
                r'@app\.route.*methods.*POST.*(?!.*csrf)',
                r'request\.form\[.*\](?!.*csrf)',
            ]
        }
        
        # Legacy code patterns
        self.legacy_patterns = {
            'deprecated_imports': [
                r'from importlib import',
                r'import importlib\b',
                r'from distutils',
                r'datetime\.datetime\.utcnow\(\)',
            ],
            'old_syntax': [
                r'%\s*\(',  # Old string formatting
                r'\.has_key\(',  # Old dict method
                r'print\s+[^(]',  # Print statement instead of function
            ],
            'insecure_functions': [
                r'eval\s*\(',
                r'exec\s*\(',
                r'pickle\.loads\(',
                r'subprocess\.call\([^,]*shell=True',
            ]
        }
    
    def run_full_empire_scan(self) -> Dict[str, Any]:
        """
        Execute comprehensive empire system scan.
        
        Returns:
            Complete scan results including vulnerabilities, health metrics,
            security gaps, and optimization recommendations.
        """
        logger.info("🔍 Starting Empire System Scan...")
        start_time = time.time()
        
        scan_results = {
            'scan_id': f"empire_scan_{int(time.time())}",
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'scanner_version': '1.0.0',
            'project_root': str(self.project_root),
            'phases': {}
        }
        
        # Phase 1: Code Health Analysis
        logger.info("📊 Phase 1: Code Health Analysis")
        scan_results['phases']['code_health'] = self._analyze_code_health()
        
        # Phase 2: Security Vulnerability Detection
        logger.info("🛡️ Phase 2: Security Vulnerability Scan") 
        scan_results['phases']['security'] = self._scan_security_vulnerabilities()
        
        # Phase 3: Legacy Code Assessment
        logger.info("🕰️ Phase 3: Legacy Code Assessment")
        scan_results['phases']['legacy_assessment'] = self._assess_legacy_code()
        
        # Phase 4: Dependencies & Library Analysis
        logger.info("📦 Phase 4: Dependencies Analysis")
        scan_results['phases']['dependencies'] = self._analyze_dependencies()
        
        # Phase 5: Performance & Optimization Opportunities
        logger.info("⚡ Phase 5: Performance Analysis")
        scan_results['phases']['performance'] = self._analyze_performance_opportunities()
        
        # Phase 6: Empire Recommendations
        logger.info("👑 Phase 6: Empire Evolution Recommendations")
        scan_results['recommendations'] = self._generate_empire_recommendations(scan_results)
        
        # Calculate scan summary
        scan_duration = time.time() - start_time
        scan_results['summary'] = self._generate_scan_summary(scan_results, scan_duration)
        
        self.scan_results = scan_results
        self.last_scan_time = datetime.now(timezone.utc)
        
        logger.info(f"✅ Empire Scan Complete in {scan_duration:.2f}s")
        return scan_results
    
    def _analyze_code_health(self) -> Dict[str, Any]:
        """Analyze overall code health and quality metrics."""
        health_metrics = {
            'files_analyzed': 0,
            'total_lines': 0,
            'python_files': [],
            'complexity_analysis': {},
            'docstring_coverage': 0,
            'test_coverage_estimate': 0,
            'code_quality_score': 0
        }
        
        python_files = list(self.project_root.glob('**/*.py'))
        health_metrics['files_analyzed'] = len(python_files)
        
        total_lines = 0
        files_with_docstrings = 0
        complexity_scores = []
        
        for py_file in python_files:
            try:
                if 'venv' in str(py_file) or '__pycache__' in str(py_file):
                    continue
                    
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = len(content.splitlines())
                    total_lines += lines
                    
                    # Check for docstrings
                    if '"""' in content or "'''" in content:
                        files_with_docstrings += 1
                    
                    # Simple complexity analysis
                    complexity = self._calculate_file_complexity(content)
                    complexity_scores.append(complexity)
                    
                    health_metrics['python_files'].append({
                        'file': str(py_file.relative_to(self.project_root)),
                        'lines': lines,
                        'complexity': complexity
                    })
                    
            except Exception as e:
                logger.warning(f"Error analyzing {py_file}: {e}")
        
        health_metrics['total_lines'] = total_lines
        health_metrics['docstring_coverage'] = (files_with_docstrings / len(python_files)) * 100 if python_files else 0
        
        # Estimate test coverage based on test files
        test_files = list(self.project_root.glob('**/test_*.py')) + list(self.project_root.glob('**/tests/**/*.py'))
        health_metrics['test_coverage_estimate'] = min((len(test_files) / len(python_files)) * 100, 100) if python_files else 0
        
        # Calculate overall code quality score
        avg_complexity = sum(complexity_scores) / len(complexity_scores) if complexity_scores else 0
        quality_score = (
            (health_metrics['docstring_coverage'] * 0.3) +
            (health_metrics['test_coverage_estimate'] * 0.4) +
            (max(0, 100 - avg_complexity * 10) * 0.3)  # Lower complexity = higher score
        )
        health_metrics['code_quality_score'] = round(quality_score, 2)
        
        return health_metrics
    
    def _scan_security_vulnerabilities(self) -> Dict[str, Any]:
        """Scan for security vulnerabilities and potential risks."""
        security_results = {
            'vulnerabilities_found': [],
            'risk_level': 'LOW',
            'security_score': 0,
            'patterns_detected': {}
        }
        
        # Scan Python files for security patterns
        python_files = list(self.project_root.glob('**/*.py'))
        total_issues = 0
        
        for py_file in python_files:
            try:
                if 'venv' in str(py_file) or '__pycache__' in str(py_file):
                    continue
                    
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    for category, patterns in self.security_patterns.items():
                        for pattern in patterns:
                            matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE)
                            for match in matches:
                                line_num = content[:match.start()].count('\n') + 1
                                vulnerability = {
                                    'file': str(py_file.relative_to(self.project_root)),
                                    'line': line_num,
                                    'category': category,
                                    'pattern': pattern,
                                    'context': match.group(0)[:100],
                                    'severity': self._assess_vulnerability_severity(category)
                                }
                                security_results['vulnerabilities_found'].append(vulnerability)
                                total_issues += 1
                                
                                if category not in security_results['patterns_detected']:
                                    security_results['patterns_detected'][category] = 0
                                security_results['patterns_detected'][category] += 1
                                
            except Exception as e:
                logger.warning(f"Error scanning {py_file}: {e}")
        
        # Assess overall risk level
        if total_issues == 0:
            security_results['risk_level'] = 'LOW'
            security_results['security_score'] = 95
        elif total_issues < 5:
            security_results['risk_level'] = 'MEDIUM'
            security_results['security_score'] = 75
        elif total_issues < 15:
            security_results['risk_level'] = 'HIGH'
            security_results['security_score'] = 50
        else:
            security_results['risk_level'] = 'CRITICAL'
            security_results['security_score'] = 25
        
        return security_results
    
    def _assess_legacy_code(self) -> Dict[str, Any]:
        """Assess legacy code patterns and technical debt."""
        legacy_results = {
            'legacy_patterns_found': [],
            'technical_debt_score': 0,
            'modernization_priorities': [],
            'patterns_detected': {}
        }
        
        python_files = list(self.project_root.glob('**/*.py'))
        total_legacy_issues = 0
        
        for py_file in python_files:
            try:
                if 'venv' in str(py_file) or '__pycache__' in str(py_file):
                    continue
                    
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    for category, patterns in self.legacy_patterns.items():
                        for pattern in patterns:
                            matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE)
                            for match in matches:
                                line_num = content[:match.start()].count('\n') + 1
                                legacy_issue = {
                                    'file': str(py_file.relative_to(self.project_root)),
                                    'line': line_num,
                                    'category': category,
                                    'pattern': pattern,
                                    'context': match.group(0)[:100],
                                    'priority': self._assess_modernization_priority(category)
                                }
                                legacy_results['legacy_patterns_found'].append(legacy_issue)
                                total_legacy_issues += 1
                                
                                if category not in legacy_results['patterns_detected']:
                                    legacy_results['patterns_detected'][category] = 0
                                legacy_results['patterns_detected'][category] += 1
                                
            except Exception as e:
                logger.warning(f"Error analyzing legacy patterns in {py_file}: {e}")
        
        # Calculate technical debt score (inverse of legacy issues)
        debt_score = max(0, 100 - (total_legacy_issues * 5))
        legacy_results['technical_debt_score'] = debt_score
        
        # Generate modernization priorities
        priorities = []
        if 'deprecated_imports' in legacy_results['patterns_detected']:
            priorities.append('Update deprecated imports and modules')
        if 'old_syntax' in legacy_results['patterns_detected']:
            priorities.append('Modernize Python syntax patterns')
        if 'insecure_functions' in legacy_results['patterns_detected']:
            priorities.append('Replace insecure function calls')
            
        legacy_results['modernization_priorities'] = priorities
        
        return legacy_results
    
    def _analyze_dependencies(self) -> Dict[str, Any]:
        """Analyze project dependencies for security and update needs."""
        deps_results = {
            'total_dependencies': 0,
            'outdated_dependencies': [],
            'security_advisories': [],
            'dependency_health_score': 0,
            'python_version_compatibility': True
        }
        
        # Check requirements files
        req_files = ['requirements.txt', 'requirements-flask.txt', 'requirements-minimal.txt']
        
        for req_file in req_files:
            req_path = self.project_root / req_file
            if req_path.exists():
                try:
                    with open(req_path, 'r') as f:
                        lines = f.readlines()
                        deps_results['total_dependencies'] += len([l for l in lines if l.strip() and not l.startswith('#')])
                except Exception as e:
                    logger.warning(f"Error reading {req_file}: {e}")
        
        # For now, simulate dependency health check
        # In a real implementation, this would use pip-audit or similar tools
        deps_results['dependency_health_score'] = 85  # Simulate good dependency health
        
        return deps_results
    
    def _analyze_performance_opportunities(self) -> Dict[str, Any]:
        """Analyze performance optimization opportunities."""
        perf_results = {
            'performance_score': 0,
            'optimization_opportunities': [],
            'bottleneck_indicators': [],
            'caching_opportunities': []
        }
        
        # Analyze for common performance patterns
        python_files = list(self.project_root.glob('**/*.py'))
        
        optimization_opportunities = []
        bottlenecks = []
        caching_ops = []
        
        for py_file in python_files:
            try:
                if 'venv' in str(py_file) or '__pycache__' in str(py_file):
                    continue
                    
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Look for potential optimizations
                    if 'for.*in.*range(len(' in content:
                        optimization_opportunities.append(f"Replace range(len()) pattern in {py_file.name}")
                    
                    if re.search(r'\.join\([^)]*\+[^)]*\)', content):
                        optimization_opportunities.append(f"Optimize string concatenation in {py_file.name}")
                    
                    # Look for potential bottlenecks
                    if 'time.sleep(' in content:
                        bottlenecks.append(f"Synchronous sleep found in {py_file.name}")
                    
                    if re.search(r'requests\.get\(.*timeout', content) is None and 'requests.get(' in content:
                        bottlenecks.append(f"Request without timeout in {py_file.name}")
                    
                    # Look for caching opportunities
                    if '@app.route' in content and 'cache' not in content.lower():
                        caching_ops.append(f"Route caching opportunity in {py_file.name}")
                        
            except Exception as e:
                logger.warning(f"Error analyzing performance in {py_file}: {e}")
        
        perf_results['optimization_opportunities'] = optimization_opportunities[:10]  # Limit results
        perf_results['bottleneck_indicators'] = bottlenecks[:10]
        perf_results['caching_opportunities'] = caching_ops[:10]
        
        # Calculate performance score based on findings
        total_issues = len(optimization_opportunities) + len(bottlenecks)
        perf_results['performance_score'] = max(0, 100 - (total_issues * 3))
        
        return perf_results
    
    def _generate_empire_recommendations(self, scan_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate comprehensive empire evolution recommendations."""
        recommendations = []
        
        # Security recommendations
        security_data = scan_results['phases']['security']
        if security_data['risk_level'] in ['HIGH', 'CRITICAL']:
            recommendations.append({
                'category': 'SECURITY_CRITICAL',
                'priority': 'IMMEDIATE',
                'title': 'Address Critical Security Vulnerabilities',
                'description': f"Found {len(security_data['vulnerabilities_found'])} security issues requiring immediate attention.",
                'action_items': [
                    'Review and fix hardcoded secrets',
                    'Implement input validation',
                    'Add CSRF protection',
                    'Update security scanning automation'
                ]
            })
        
        # Legacy code recommendations
        legacy_data = scan_results['phases']['legacy_assessment']
        if legacy_data['technical_debt_score'] < 70:
            recommendations.append({
                'category': 'TECHNICAL_DEBT',
                'priority': 'HIGH',
                'title': 'Modernize Legacy Code Patterns',
                'description': f"Technical debt score: {legacy_data['technical_debt_score']}/100",
                'action_items': legacy_data['modernization_priorities']
            })
        
        # Performance recommendations
        perf_data = scan_results['phases']['performance']
        if perf_data['performance_score'] < 80:
            recommendations.append({
                'category': 'PERFORMANCE',
                'priority': 'MEDIUM',
                'title': 'Optimize System Performance',
                'description': f"Performance score: {perf_data['performance_score']}/100",
                'action_items': perf_data['optimization_opportunities'][:5]
            })
        
        # Code health recommendations
        health_data = scan_results['phases']['code_health']
        if health_data['code_quality_score'] < 75:
            recommendations.append({
                'category': 'CODE_QUALITY',
                'priority': 'MEDIUM',
                'title': 'Improve Code Quality Standards',
                'description': f"Code quality score: {health_data['code_quality_score']}/100",
                'action_items': [
                    'Increase docstring coverage',
                    'Add more comprehensive tests',
                    'Reduce code complexity',
                    'Implement automated quality checks'
                ]
            })
        
        # Empire evolution recommendations
        recommendations.append({
            'category': 'EMPIRE_EVOLUTION',
            'priority': 'STRATEGIC',
            'title': 'Empire Architecture Enhancements',
            'description': 'Strategic improvements for long-term empire sustainability',
            'action_items': [
                'Implement autonomous healing agents',
                'Add predictive scaling capabilities',
                'Enhance security monitoring automation',
                'Create self-documenting systems',
                'Build evolutionary adaptation mechanisms'
            ]
        })
        
        return recommendations
    
    def _generate_scan_summary(self, scan_results: Dict[str, Any], scan_duration: float) -> Dict[str, Any]:
        """Generate executive summary of scan results."""
        phases = scan_results['phases']
        
        summary = {
            'scan_duration_seconds': round(scan_duration, 2),
            'overall_empire_health': 'UNKNOWN',
            'empire_readiness_score': 0,
            'critical_issues': 0,
            'total_recommendations': len(scan_results.get('recommendations', [])),
            'next_scan_recommended': datetime.now(timezone.utc).isoformat(),
            'key_metrics': {}
        }
        
        # Extract key metrics
        if 'code_health' in phases:
            summary['key_metrics']['code_quality'] = phases['code_health']['code_quality_score']
            summary['key_metrics']['files_analyzed'] = phases['code_health']['files_analyzed']
        
        if 'security' in phases:
            summary['key_metrics']['security_score'] = phases['security']['security_score']
            if phases['security']['risk_level'] in ['HIGH', 'CRITICAL']:
                summary['critical_issues'] += len(phases['security']['vulnerabilities_found'])
        
        if 'performance' in phases:
            summary['key_metrics']['performance_score'] = phases['performance']['performance_score']
        
        # Calculate overall empire readiness score
        scores = [
            phases.get('code_health', {}).get('code_quality_score', 0),
            phases.get('security', {}).get('security_score', 0),
            phases.get('performance', {}).get('performance_score', 0),
            phases.get('legacy_assessment', {}).get('technical_debt_score', 0)
        ]
        
        empire_score = sum(score for score in scores if score > 0) / len([s for s in scores if s > 0]) if any(scores) else 0
        summary['empire_readiness_score'] = round(empire_score, 2)
        
        # Determine overall health
        if empire_score >= 90:
            summary['overall_empire_health'] = 'EXCELLENT'
        elif empire_score >= 80:
            summary['overall_empire_health'] = 'GOOD'
        elif empire_score >= 70:
            summary['overall_empire_health'] = 'FAIR'
        elif empire_score >= 60:
            summary['overall_empire_health'] = 'POOR'
        else:
            summary['overall_empire_health'] = 'CRITICAL'
        
        return summary
    
    def _calculate_file_complexity(self, content: str) -> float:
        """Calculate basic complexity metric for a Python file."""
        try:
            tree = ast.parse(content)
            complexity = 0
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.If, ast.While, ast.For, ast.With, ast.Try)):
                    complexity += 1
                elif isinstance(node, ast.FunctionDef):
                    complexity += 0.5
                elif isinstance(node, ast.ClassDef):
                    complexity += 0.3
            
            return complexity
        except:
            return 0  # Return 0 if parsing fails
    
    def _assess_vulnerability_severity(self, category: str) -> str:
        """Assess severity of a vulnerability category."""
        severity_map = {
            'hardcoded_secrets': 'HIGH',
            'sql_injection_risk': 'CRITICAL',
            'xss_risk': 'HIGH',
            'csrf_risk': 'MEDIUM'
        }
        return severity_map.get(category, 'MEDIUM')
    
    def _assess_modernization_priority(self, category: str) -> str:
        """Assess modernization priority for legacy code patterns."""
        priority_map = {
            'deprecated_imports': 'HIGH',
            'old_syntax': 'MEDIUM',
            'insecure_functions': 'CRITICAL'
        }
        return priority_map.get(category, 'MEDIUM')
    
    def get_latest_scan_results(self) -> Optional[Dict[str, Any]]:
        """Get the latest scan results."""
        return self.scan_results
    
    def export_scan_results(self, format: str = 'json') -> str:
        """Export scan results in specified format."""
        if not self.scan_results:
            return ""
        
        if format.lower() == 'json':
            return json.dumps(self.scan_results, indent=2, default=str)
        
        # Add other formats as needed
        return str(self.scan_results)


# Global scanner instance
_empire_scanner = None


def get_empire_scanner() -> EmpireSystemScanner:
    """Get or create the global empire scanner instance."""
    global _empire_scanner
    if _empire_scanner is None:
        _empire_scanner = EmpireSystemScanner()
    return _empire_scanner