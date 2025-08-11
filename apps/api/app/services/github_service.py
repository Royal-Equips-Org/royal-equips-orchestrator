"""
GitHub Integration Service for Royal Equips Orchestrator.

Provides direct communication with GitHub codebase including:
- Repository operations
- Code analysis and monitoring
- Deployment tracking
- Issue and PR management
- Real-time webhook integration
"""

import logging
import os
import json
import requests
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
try:
    from tenacity import retry, stop_after_attempt, wait_exponential
    HAS_TENACITY = True
except ImportError:
    HAS_TENACITY = False
    # Create dummy decorators
    def retry(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    stop_after_attempt = wait_exponential = lambda *args, **kwargs: None
from app.config import Config

logger = logging.getLogger(__name__)

class GitHubServiceError(Exception):
    """Custom exception for GitHub service errors."""
    pass

class GitHubService:
    """Service for GitHub API integration and monitoring."""
    
    def __init__(self):
        """Initialize GitHub service with configuration."""
        self.token = os.getenv('GITHUB_TOKEN')
        self.repo_owner = os.getenv('GITHUB_REPO_OWNER', 'Skidaw23')
        self.repo_name = os.getenv('GITHUB_REPO_NAME', 'royal-equips-orchestrator')
        
        if not self.token:
            logger.warning("GitHub token not configured - GitHub integration disabled")
            self._authenticated = False
        else:
            self._authenticated = True
            
        self.base_url = "https://api.github.com"
        self._headers = {
            'Authorization': f'token {self.token}' if self.token else '',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Royal-Equips-Orchestrator'
        }
        
        # Circuit breaker state
        self._circuit_breaker_open = False
        self._failure_count = 0
        self._last_failure_time = None
        
    def is_authenticated(self) -> bool:
        """Check if GitHub service is properly authenticated."""
        return self._authenticated
        
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10)
    )
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make authenticated request to GitHub API with retry logic."""
        if not self._authenticated:
            raise GitHubServiceError("GitHub service not authenticated")
            
        if self._circuit_breaker_open:
            # Check if we should try again
            if self._last_failure_time and (
                datetime.now(timezone.utc) - self._last_failure_time
            ).total_seconds() > 300:  # 5 minutes
                self._circuit_breaker_open = False
                self._failure_count = 0
            else:
                raise GitHubServiceError("Circuit breaker open - GitHub API temporarily unavailable")
        
        try:
            url = f"{self.base_url}/{endpoint.lstrip('/')}"
            response = requests.request(method, url, headers=self._headers, **kwargs)
            
            if response.status_code == 401:
                logger.error("GitHub authentication failed - check token")
                raise GitHubServiceError("GitHub authentication failed")
            elif response.status_code == 403:
                logger.warning("GitHub rate limit exceeded")
                raise GitHubServiceError("GitHub rate limit exceeded")
            elif response.status_code >= 500:
                raise GitHubServiceError(f"GitHub API server error: {response.status_code}")
                
            # Reset failure count on success
            self._failure_count = 0
            return response
            
        except requests.RequestException as e:
            self._failure_count += 1
            if self._failure_count >= 5:
                self._circuit_breaker_open = True
                self._last_failure_time = datetime.now(timezone.utc)
                logger.error("GitHub service circuit breaker activated")
            raise GitHubServiceError(f"GitHub API request failed: {str(e)}")
    
    def get_repo_info(self) -> Dict[str, Any]:
        """Get repository information and health status."""
        try:
            response = self._make_request('GET', f'/repos/{self.repo_owner}/{self.repo_name}')
            if response.status_code == 200:
                repo_data = response.json()
                return {
                    'name': repo_data['name'],
                    'full_name': repo_data['full_name'],
                    'description': repo_data['description'],
                    'default_branch': repo_data['default_branch'],
                    'stargazers_count': repo_data['stargazers_count'],
                    'forks_count': repo_data['forks_count'],
                    'open_issues': repo_data['open_issues_count'],
                    'language': repo_data['language'],
                    'updated_at': repo_data['updated_at'],
                    'private': repo_data['private'],
                    'status': 'healthy'
                }
            else:
                logger.error(f"Failed to get repo info: {response.status_code}")
                return {'status': 'error', 'message': 'Failed to fetch repository info'}
                
        except GitHubServiceError as e:
            logger.error(f"GitHub service error: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def get_recent_commits(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent commits from the repository."""
        try:
            params = {'per_page': limit, 'page': 1}
            response = self._make_request('GET', f'/repos/{self.repo_owner}/{self.repo_name}/commits', params=params)
            
            if response.status_code == 200:
                commits = response.json()
                return [
                    {
                        'sha': commit['sha'][:8],
                        'message': commit['commit']['message'].split('\n')[0],
                        'author': commit['commit']['author']['name'],
                        'date': commit['commit']['author']['date'],
                        'url': commit['html_url']
                    }
                    for commit in commits
                ]
            else:
                logger.error(f"Failed to get commits: {response.status_code}")
                return []
                
        except GitHubServiceError as e:
            logger.error(f"GitHub service error getting commits: {e}")
            return []
    
    def get_workflow_runs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent GitHub Actions workflow runs."""
        try:
            params = {'per_page': limit, 'page': 1}
            response = self._make_request('GET', f'/repos/{self.repo_owner}/{self.repo_name}/actions/runs', params=params)
            
            if response.status_code == 200:
                runs = response.json()
                return [
                    {
                        'id': run['id'],
                        'name': run['name'],
                        'status': run['status'],
                        'conclusion': run['conclusion'],
                        'created_at': run['created_at'],
                        'updated_at': run['updated_at'],
                        'branch': run['head_branch'],
                        'event': run['event'],
                        'url': run['html_url']
                    }
                    for run in runs['workflow_runs']
                ]
            else:
                logger.error(f"Failed to get workflow runs: {response.status_code}")
                return []
                
        except GitHubServiceError as e:
            logger.error(f"GitHub service error getting workflow runs: {e}")
            return []
    
    def get_open_issues(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get open issues from the repository."""
        try:
            params = {'state': 'open', 'per_page': limit, 'page': 1}
            response = self._make_request('GET', f'/repos/{self.repo_owner}/{self.repo_name}/issues', params=params)
            
            if response.status_code == 200:
                issues = response.json()
                return [
                    {
                        'number': issue['number'],
                        'title': issue['title'],
                        'state': issue['state'],
                        'labels': [label['name'] for label in issue['labels']],
                        'created_at': issue['created_at'],
                        'updated_at': issue['updated_at'],
                        'url': issue['html_url'],
                        'author': issue['user']['login']
                    }
                    for issue in issues if 'pull_request' not in issue
                ]
            else:
                logger.error(f"Failed to get issues: {response.status_code}")
                return []
                
        except GitHubServiceError as e:
            logger.error(f"GitHub service error getting issues: {e}")
            return []
    
    def get_pull_requests(self, state: str = 'open', limit: int = 10) -> List[Dict[str, Any]]:
        """Get pull requests from the repository."""
        try:
            params = {'state': state, 'per_page': limit, 'page': 1}
            response = self._make_request('GET', f'/repos/{self.repo_owner}/{self.repo_name}/pulls', params=params)
            
            if response.status_code == 200:
                prs = response.json()
                return [
                    {
                        'number': pr['number'],
                        'title': pr['title'],
                        'state': pr['state'],
                        'draft': pr['draft'],
                        'created_at': pr['created_at'],
                        'updated_at': pr['updated_at'],
                        'url': pr['html_url'],
                        'author': pr['user']['login'],
                        'branch': pr['head']['ref'],
                        'base': pr['base']['ref']
                    }
                    for pr in prs
                ]
            else:
                logger.error(f"Failed to get pull requests: {response.status_code}")
                return []
                
        except GitHubServiceError as e:
            logger.error(f"GitHub service error getting pull requests: {e}")
            return []
    
    def create_issue(self, title: str, body: str, labels: List[str] = None) -> Dict[str, Any]:
        """Create a new issue in the repository."""
        try:
            data = {
                'title': title,
                'body': body
            }
            if labels:
                data['labels'] = labels
                
            response = self._make_request('POST', f'/repos/{self.repo_owner}/{self.repo_name}/issues', json=data)
            
            if response.status_code == 201:
                issue = response.json()
                logger.info(f"Created GitHub issue #{issue['number']}: {title}")
                return {
                    'success': True,
                    'issue_number': issue['number'],
                    'url': issue['html_url']
                }
            else:
                logger.error(f"Failed to create issue: {response.status_code}")
                return {'success': False, 'error': f'HTTP {response.status_code}'}
                
        except GitHubServiceError as e:
            logger.error(f"GitHub service error creating issue: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_deployment_status(self) -> Dict[str, Any]:
        """Get deployment status and environment information."""
        try:
            # Get deployments
            response = self._make_request('GET', f'/repos/{self.repo_owner}/{self.repo_name}/deployments')
            
            if response.status_code == 200:
                deployments = response.json()
                if deployments:
                    latest = deployments[0]
                    
                    # Get deployment status
                    status_response = self._make_request('GET', f'/repos/{self.repo_owner}/{self.repo_name}/deployments/{latest["id"]}/statuses')
                    
                    statuses = status_response.json() if status_response.status_code == 200 else []
                    current_status = statuses[0] if statuses else {'state': 'unknown'}
                    
                    return {
                        'id': latest['id'],
                        'environment': latest['environment'],
                        'ref': latest['ref'],
                        'created_at': latest['created_at'],
                        'status': current_status['state'],
                        'description': current_status.get('description', ''),
                        'url': current_status.get('target_url', '')
                    }
                else:
                    return {'status': 'no_deployments'}
            else:
                logger.error(f"Failed to get deployments: {response.status_code}")
                return {'status': 'error', 'message': 'Failed to fetch deployment info'}
                
        except GitHubServiceError as e:
            logger.error(f"GitHub service error getting deployment status: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def get_repository_health(self) -> Dict[str, Any]:
        """Get overall repository health metrics."""
        try:
            repo_info = self.get_repo_info()
            recent_commits = self.get_recent_commits(5)
            open_issues = self.get_open_issues(5)
            workflow_runs = self.get_workflow_runs(5)
            
            # Calculate health score
            health_score = 100
            
            if repo_info.get('status') == 'error':
                health_score = 0
            else:
                # Recent activity check
                if not recent_commits:
                    health_score -= 20
                elif len(recent_commits) > 0:
                    last_commit_date = datetime.fromisoformat(recent_commits[0]['date'].replace('Z', '+00:00'))
                    days_since_last_commit = (datetime.now(timezone.utc) - last_commit_date).days
                    if days_since_last_commit > 7:
                        health_score -= 10
                
                # Issues check
                if len(open_issues) > 10:
                    health_score -= 15
                
                # Workflow check
                if workflow_runs:
                    failed_runs = [r for r in workflow_runs if r['conclusion'] == 'failure']
                    if len(failed_runs) > len(workflow_runs) / 2:
                        health_score -= 25
            
            health_status = 'excellent' if health_score >= 90 else \
                          'good' if health_score >= 70 else \
                          'fair' if health_score >= 50 else 'poor'
            
            return {
                'health_score': health_score,
                'health_status': health_status,
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'metrics': {
                    'open_issues': len(open_issues),
                    'recent_commits': len(recent_commits),
                    'workflow_runs': len(workflow_runs),
                    'failed_workflows': len([r for r in workflow_runs if r['conclusion'] == 'failure'])
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating repository health: {e}")
            return {
                'health_score': 0,
                'health_status': 'error',
                'error': str(e),
                'last_updated': datetime.now(timezone.utc).isoformat()
            }

# Global GitHub service instance
github_service = GitHubService()