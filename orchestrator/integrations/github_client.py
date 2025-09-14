"""GitHub integration for the Holographic Control Center.

This module provides access to GitHub REST API for repository information
including pull requests, issues, commits, and CI status.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import aiohttp

logger = logging.getLogger(__name__)


@dataclass
class GitHubPullRequest:
    """Represents a GitHub pull request."""
    number: int
    title: str
    author: str
    state: str
    created_at: datetime
    updated_at: datetime
    url: str
    draft: bool
    mergeable: bool | None


@dataclass
class GitHubIssue:
    """Represents a GitHub issue."""
    number: int
    title: str
    author: str
    state: str
    created_at: datetime
    updated_at: datetime
    url: str
    labels: list[str]
    assignees: list[str]


@dataclass
class GitHubCommit:
    """Represents a GitHub commit."""
    sha: str
    message: str
    author: str
    date: datetime
    url: str


@dataclass
class GitHubRepoStatus:
    """Container for GitHub repository status."""
    open_prs: list[GitHubPullRequest]
    open_issues: list[GitHubIssue]
    recent_commits: list[GitHubCommit]
    default_branch: str
    last_updated: datetime


class GitHubClient:
    """Async client for GitHub REST API."""

    def __init__(self, token: str, owner: str, repo: str) -> None:
        self.token = token
        self.owner = owner
        self.repo = repo
        self.base_url = "https://api.github.com"
        self.session: aiohttp.ClientSession | None = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session with authentication."""
        if self.session is None:
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Royal-Equips-Orchestrator/1.0"
            }
            self.session = aiohttp.ClientSession(
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            )
        return self.session

    async def _make_request(self, endpoint: str, params: dict[str, Any] = None) -> dict[str, Any]:
        """Make authenticated request to GitHub API."""
        session = await self._get_session()
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/{endpoint}"

        try:
            async with session.get(url, params=params or {}) as response:
                if response.status == 403:
                    # Check if it's rate limiting
                    reset_time = response.headers.get('x-ratelimit-reset')
                    if reset_time:
                        logger.warning("GitHub API rate limited")
                        raise Exception("GitHub API rate limited")

                if response.status == 401:
                    raise Exception("GitHub authentication failed - check token")

                response.raise_for_status()
                data = await response.json()
                return data

        except aiohttp.ClientError as e:
            logger.error(f"GitHub API request failed: {e}")
            raise

    async def get_pull_requests(self, state: str = "open", limit: int = 30) -> list[GitHubPullRequest]:
        """Get pull requests from repository."""
        params = {
            "state": state,
            "per_page": min(limit, 100),
            "sort": "updated",
            "direction": "desc"
        }

        try:
            data = await self._make_request("pulls", params)
            prs = []

            for pr_data in data:
                try:
                    pr = GitHubPullRequest(
                        number=pr_data["number"],
                        title=pr_data["title"],
                        author=pr_data["user"]["login"],
                        state=pr_data["state"],
                        created_at=datetime.fromisoformat(
                            pr_data["created_at"].replace("Z", "+00:00")
                        ),
                        updated_at=datetime.fromisoformat(
                            pr_data["updated_at"].replace("Z", "+00:00")
                        ),
                        url=pr_data["html_url"],
                        draft=pr_data.get("draft", False),
                        mergeable=pr_data.get("mergeable")
                    )
                    prs.append(pr)
                except (KeyError, ValueError) as e:
                    logger.warning(f"Failed to parse PR {pr_data.get('number', 'unknown')}: {e}")

            return prs

        except Exception as e:
            logger.error(f"Failed to fetch pull requests: {e}")
            return []

    async def get_issues(self, state: str = "open", limit: int = 30) -> list[GitHubIssue]:
        """Get issues from repository (excluding pull requests)."""
        params = {
            "state": state,
            "per_page": min(limit, 100),
            "sort": "updated",
            "direction": "desc"
        }

        try:
            data = await self._make_request("issues", params)
            issues = []

            for issue_data in data:
                # Skip pull requests (they appear in issues endpoint too)
                if "pull_request" in issue_data:
                    continue

                try:
                    issue = GitHubIssue(
                        number=issue_data["number"],
                        title=issue_data["title"],
                        author=issue_data["user"]["login"],
                        state=issue_data["state"],
                        created_at=datetime.fromisoformat(
                            issue_data["created_at"].replace("Z", "+00:00")
                        ),
                        updated_at=datetime.fromisoformat(
                            issue_data["updated_at"].replace("Z", "+00:00")
                        ),
                        url=issue_data["html_url"],
                        labels=[label["name"] for label in issue_data.get("labels", [])],
                        assignees=[assignee["login"] for assignee in issue_data.get("assignees", [])]
                    )
                    issues.append(issue)
                except (KeyError, ValueError) as e:
                    logger.warning(f"Failed to parse issue {issue_data.get('number', 'unknown')}: {e}")

            return issues

        except Exception as e:
            logger.error(f"Failed to fetch issues: {e}")
            return []

    async def get_commits(self, limit: int = 10) -> list[GitHubCommit]:
        """Get recent commits from repository."""
        params = {
            "per_page": min(limit, 100)
        }

        try:
            data = await self._make_request("commits", params)
            commits = []

            for commit_data in data:
                try:
                    commit = GitHubCommit(
                        sha=commit_data["sha"][:8],  # Short SHA
                        message=commit_data["commit"]["message"].split("\n")[0],  # First line only
                        author=commit_data["commit"]["author"]["name"],
                        date=datetime.fromisoformat(
                            commit_data["commit"]["author"]["date"].replace("Z", "+00:00")
                        ),
                        url=commit_data["html_url"]
                    )
                    commits.append(commit)
                except (KeyError, ValueError) as e:
                    logger.warning(f"Failed to parse commit {commit_data.get('sha', 'unknown')}: {e}")

            return commits

        except Exception as e:
            logger.error(f"Failed to fetch commits: {e}")
            return []

    async def get_repository_info(self) -> dict[str, Any]:
        """Get basic repository information."""
        try:
            return await self._make_request("")
        except Exception as e:
            logger.error(f"Failed to fetch repository info: {e}")
            return {}

    async def close(self) -> None:
        """Close the HTTP session."""
        if self.session:
            await self.session.close()
            self.session = None


def get_github_client() -> GitHubClient | None:
    """Get configured GitHub client or None if not configured."""
    token = os.getenv("GITHUB_TOKEN")

    if not token:
        return None

    # Default to the royal-equips-orchestrator repo
    owner = "Skidaw23"
    repo = "royal-equips-orchestrator"

    return GitHubClient(token, owner, repo)


async def fetch_github_status() -> GitHubRepoStatus:
    """Fetch comprehensive GitHub repository status."""
    client = get_github_client()

    if not client:
        logger.warning("GitHub not configured")
        return GitHubRepoStatus(
            open_prs=[],
            open_issues=[],
            recent_commits=[],
            default_branch="main",
            last_updated=datetime.now(timezone.utc)
        )

    try:
        # Fetch data concurrently
        tasks = [
            client.get_pull_requests("open", 20),
            client.get_issues("open", 20),
            client.get_commits(10),
            client.get_repository_info()
        ]

        open_prs, open_issues, recent_commits, repo_info = await asyncio.gather(*tasks)

        return GitHubRepoStatus(
            open_prs=open_prs,
            open_issues=open_issues,
            recent_commits=recent_commits,
            default_branch=repo_info.get("default_branch", "main"),
            last_updated=datetime.now(timezone.utc)
        )

    except Exception as e:
        logger.error(f"Failed to fetch GitHub status: {e}")
        return GitHubRepoStatus(
            open_prs=[],
            open_issues=[],
            recent_commits=[],
            default_branch="main",
            last_updated=datetime.now(timezone.utc)
        )
    finally:
        await client.close()


# Cached status to avoid hitting API too frequently
_cached_status: GitHubRepoStatus | None = None
_cache_timestamp: datetime | None = None
_cache_duration_seconds = 180  # 3 minutes


async def get_cached_github_status() -> GitHubRepoStatus:
    """Get GitHub status with caching."""
    global _cached_status, _cache_timestamp

    now = datetime.now(timezone.utc)

    # Return cached data if fresh
    if (_cached_status and _cache_timestamp and
        (now - _cache_timestamp).total_seconds() < _cache_duration_seconds):
        return _cached_status

    # Fetch fresh data
    _cached_status = await fetch_github_status()
    _cache_timestamp = now

    return _cached_status


def format_pr_status(pr: GitHubPullRequest) -> str:
    """Format pull request status."""
    if pr.draft:
        return "📝 Draft"
    elif pr.mergeable is False:
        return "⚠️ Conflicts"
    elif pr.state == "open":
        return "🔄 Open"
    else:
        return f"⚪ {pr.state.title()}"


def format_issue_labels(labels: list[str]) -> str:
    """Format issue labels."""
    if not labels:
        return ""

    # Show max 3 labels
    display_labels = labels[:3]
    result = " ".join(f"#{label}" for label in display_labels)

    if len(labels) > 3:
        result += f" (+{len(labels) - 3})"

    return result


def format_relative_time(dt: datetime) -> str:
    """Format datetime as relative time."""
    now = datetime.now(timezone.utc)
    diff = now - dt

    if diff.days > 7:
        return dt.strftime("%b %d")
    elif diff.days > 0:
        return f"{diff.days}d ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours}h ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes}m ago"
    else:
        return "just now"
