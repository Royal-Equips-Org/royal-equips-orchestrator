"""Repository connector for Royal EQ MCP.

Provides secure read-only access to repository files and search functionality
with Git integration and comprehensive file handling.
"""

import fnmatch
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import git
from mcp.types import TextContent, Tool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class RepoConfig(BaseModel):
    """Configuration for Repository connector."""

    root_path: str = Field(..., description="Repository root path")
    max_file_size: int = Field(
        default=1024 * 1024, description="Max file size to read (1MB)"
    )
    excluded_patterns: List[str] = Field(
        default=[
            "*.pyc",
            "__pycache__",
            "*.log",
            ".git",
            "node_modules",
            "*.tmp",
            "*.swp",
            "*.DS_Store",
            ".env",
            "*.key",
            "*.pem",
        ],
        description="File patterns to exclude from searches",
    )


class RepoConnector:
    """Enterprise-grade repository connector for code analysis and search."""

    def __init__(self):
        """Initialize the Repository connector."""
        self.config = RepoConfig(root_path=os.environ["REPO_ROOT"])

        # Validate repository path
        self.repo_path = Path(self.config.root_path)
        if not self.repo_path.exists() or not self.repo_path.is_dir():
            raise ValueError(f"Repository path does not exist: {self.config.root_path}")

        # Initialize Git repository
        try:
            self.git_repo = git.Repo(self.config.root_path)
            logger.info(
                f"Repository connector initialized for: {self.config.root_path}"
            )
        except git.InvalidGitRepositoryError:
            logger.warning(
                "Not a valid Git repository, continuing without Git features"
            )
            self.git_repo = None

    def get_tools(self) -> List[Tool]:
        """Get all available repository tools."""
        return [
            Tool(
                name="repo_read_file",
                description="Read contents of a specific file in the repository",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Relative path to the file from repository root",
                        },
                        "encoding": {
                            "type": "string",
                            "description": "File encoding (default: utf-8)",
                            "default": "utf-8",
                        },
                    },
                    "required": ["file_path"],
                },
            ),
            Tool(
                name="repo_search_files",
                description="Search for files by name patterns in the repository",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "pattern": {
                            "type": "string",
                            "description": "File name pattern to search for (supports wildcards)",
                        },
                        "directory": {
                            "type": "string",
                            "description": "Specific directory to search in (relative to repo root)",
                        },
                        "include_content": {
                            "type": "boolean",
                            "description": "Whether to include file contents in results",
                            "default": False,
                        },
                    },
                    "required": ["pattern"],
                },
            ),
            Tool(
                name="repo_search_content",
                description="Search for text content within repository files",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Text to search for in file contents",
                        },
                        "file_patterns": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "File patterns to search within (e.g., ['*.py', '*.js'])",
                        },
                        "case_sensitive": {
                            "type": "boolean",
                            "description": "Whether search should be case-sensitive",
                            "default": False,
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Maximum number of matching files to return",
                            "default": 50,
                        },
                    },
                    "required": ["query"],
                },
            ),
            Tool(
                name="repo_list_directory",
                description="List contents of a directory in the repository",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "directory": {
                            "type": "string",
                            "description": "Directory path relative to repository root (empty for root)",
                        },
                        "recursive": {
                            "type": "boolean",
                            "description": "Whether to list contents recursively",
                            "default": False,
                        },
                        "include_hidden": {
                            "type": "boolean",
                            "description": "Whether to include hidden files/directories",
                            "default": False,
                        },
                    },
                },
            ),
            Tool(
                name="repo_git_info",
                description="Get Git repository information (branch, commits, etc.)",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "info_type": {
                            "type": "string",
                            "enum": ["branch", "commits", "status", "remotes", "tags"],
                            "description": "Type of Git information to retrieve",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Limit for items like commits (default: 10)",
                            "default": 10,
                        },
                    },
                    "required": ["info_type"],
                },
            ),
        ]

    def _is_excluded(self, file_path: Path) -> bool:
        """Check if file should be excluded based on patterns."""
        str_path = str(file_path)
        for pattern in self.config.excluded_patterns:
            if fnmatch.fnmatch(str_path, pattern) or fnmatch.fnmatch(
                file_path.name, pattern
            ):
                return True
        return False

    def _safe_read_file(
        self, file_path: Path, encoding: str = "utf-8"
    ) -> Optional[str]:
        """Safely read file contents with size and encoding checks."""
        try:
            if file_path.stat().st_size > self.config.max_file_size:
                return f"[File too large: {file_path.stat().st_size} bytes > {self.config.max_file_size} bytes]"

            with open(file_path, encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            return f"[Binary file or encoding error: {file_path}]"
        except Exception as e:
            return f"[Error reading file: {str(e)}]"

    async def handle_repo_read_file(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle file reading requests."""
        try:
            file_path_str = arguments.get("file_path", "").strip()
            encoding = arguments.get("encoding", "utf-8")

            if not file_path_str:
                return [TextContent(type="text", text="Error: file_path is required")]

            # Construct full path and validate
            full_path = self.repo_path / file_path_str

            # Security check: ensure path is within repository
            try:
                full_path.resolve().relative_to(self.repo_path.resolve())
            except ValueError:
                return [
                    TextContent(
                        type="text",
                        text="Error: File path is outside repository bounds",
                    )
                ]

            if not full_path.exists():
                return [
                    TextContent(
                        type="text", text=f"Error: File not found: {file_path_str}"
                    )
                ]

            if not full_path.is_file():
                return [
                    TextContent(
                        type="text", text=f"Error: Path is not a file: {file_path_str}"
                    )
                ]

            if self._is_excluded(full_path):
                return [
                    TextContent(
                        type="text",
                        text=f"Error: File is excluded from access: {file_path_str}",
                    )
                ]

            # Read file contents
            content = self._safe_read_file(full_path, encoding)

            result_data = {
                "file_path": file_path_str,
                "size": full_path.stat().st_size,
                "modified": full_path.stat().st_mtime,
                "content": content,
            }

            return [
                TextContent(
                    type="text", text=f"Repository File Content:\n{result_data}"
                )
            ]

        except Exception as e:
            logger.error(f"Error reading repository file: {e}")
            return [
                TextContent(
                    type="text", text=f"Error reading repository file: {str(e)}"
                )
            ]

    async def handle_repo_search_files(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle file search requests."""
        try:
            pattern = arguments.get("pattern", "").strip()
            directory = arguments.get("directory", "").strip()
            include_content = arguments.get("include_content", False)

            if not pattern:
                return [TextContent(type="text", text="Error: pattern is required")]

            # Determine search root
            if directory:
                search_root = self.repo_path / directory
                if not search_root.exists() or not search_root.is_dir():
                    return [
                        TextContent(
                            type="text", text=f"Error: Directory not found: {directory}"
                        )
                    ]
            else:
                search_root = self.repo_path

            # Search for matching files
            matches = []
            for file_path in search_root.rglob(pattern):
                if file_path.is_file() and not self._is_excluded(file_path):
                    relative_path = file_path.relative_to(self.repo_path)

                    file_info = {
                        "path": str(relative_path),
                        "size": file_path.stat().st_size,
                        "modified": file_path.stat().st_mtime,
                    }

                    if include_content:
                        file_info["content"] = self._safe_read_file(file_path)

                    matches.append(file_info)

            result_data = {
                "pattern": pattern,
                "directory": directory or ".",
                "matches": matches,
                "total_matches": len(matches),
            }

            return [
                TextContent(
                    type="text", text=f"Repository File Search Results:\n{result_data}"
                )
            ]

        except Exception as e:
            logger.error(f"Error searching repository files: {e}")
            return [
                TextContent(
                    type="text", text=f"Error searching repository files: {str(e)}"
                )
            ]

    async def handle_repo_search_content(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle content search requests."""
        try:
            query = arguments.get("query", "").strip()
            file_patterns = arguments.get("file_patterns", ["*"])
            case_sensitive = arguments.get("case_sensitive", False)
            max_results = arguments.get("max_results", 50)

            if not query:
                return [TextContent(type="text", text="Error: query is required")]

            # Prepare search query
            search_query = query if case_sensitive else query.lower()

            matches = []
            files_searched = 0

            for pattern in file_patterns:
                for file_path in self.repo_path.rglob(pattern):
                    if len(matches) >= max_results:
                        break

                    if file_path.is_file() and not self._is_excluded(file_path):
                        files_searched += 1
                        content = self._safe_read_file(file_path)

                        if content and not content.startswith(
                            "["
                        ):  # Skip error messages
                            search_content = (
                                content if case_sensitive else content.lower()
                            )

                            if search_query in search_content:
                                # Find line numbers with matches
                                lines = content.split("\n")
                                matching_lines = []

                                for i, line in enumerate(lines, 1):
                                    check_line = (
                                        line if case_sensitive else line.lower()
                                    )
                                    if search_query in check_line:
                                        matching_lines.append(
                                            {
                                                "line_number": i,
                                                "content": line.strip()[
                                                    :200
                                                ],  # Limit line length
                                            }
                                        )

                                relative_path = file_path.relative_to(self.repo_path)
                                matches.append(
                                    {
                                        "path": str(relative_path),
                                        "size": file_path.stat().st_size,
                                        "matching_lines": matching_lines[
                                            :10
                                        ],  # Limit lines per file
                                    }
                                )

            result_data = {
                "query": query,
                "case_sensitive": case_sensitive,
                "file_patterns": file_patterns,
                "files_searched": files_searched,
                "matches": matches,
                "total_matches": len(matches),
            }

            return [
                TextContent(
                    type="text",
                    text=f"Repository Content Search Results:\n{result_data}",
                )
            ]

        except Exception as e:
            logger.error(f"Error searching repository content: {e}")
            return [
                TextContent(
                    type="text", text=f"Error searching repository content: {str(e)}"
                )
            ]

    async def handle_repo_list_directory(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle directory listing requests."""
        try:
            directory = arguments.get("directory", "").strip()
            recursive = arguments.get("recursive", False)
            include_hidden = arguments.get("include_hidden", False)

            # Determine target directory
            if directory:
                target_dir = self.repo_path / directory
                if not target_dir.exists() or not target_dir.is_dir():
                    return [
                        TextContent(
                            type="text", text=f"Error: Directory not found: {directory}"
                        )
                    ]
            else:
                target_dir = self.repo_path

            # List directory contents
            items = []

            if recursive:
                for item_path in target_dir.rglob("*"):
                    if not include_hidden and item_path.name.startswith("."):
                        continue
                    if not self._is_excluded(item_path):
                        relative_path = item_path.relative_to(self.repo_path)
                        items.append(
                            {
                                "path": str(relative_path),
                                "type": "directory" if item_path.is_dir() else "file",
                                "size": (
                                    item_path.stat().st_size
                                    if item_path.is_file()
                                    else None
                                ),
                                "modified": item_path.stat().st_mtime,
                            }
                        )
            else:
                for item_path in target_dir.iterdir():
                    if not include_hidden and item_path.name.startswith("."):
                        continue
                    if not self._is_excluded(item_path):
                        relative_path = item_path.relative_to(self.repo_path)
                        items.append(
                            {
                                "path": str(relative_path),
                                "type": "directory" if item_path.is_dir() else "file",
                                "size": (
                                    item_path.stat().st_size
                                    if item_path.is_file()
                                    else None
                                ),
                                "modified": item_path.stat().st_mtime,
                            }
                        )

            result_data = {
                "directory": directory or ".",
                "recursive": recursive,
                "include_hidden": include_hidden,
                "items": sorted(items, key=lambda x: (x["type"], x["path"])),
                "total_items": len(items),
            }

            return [
                TextContent(
                    type="text", text=f"Repository Directory Listing:\n{result_data}"
                )
            ]

        except Exception as e:
            logger.error(f"Error listing repository directory: {e}")
            return [
                TextContent(
                    type="text", text=f"Error listing repository directory: {str(e)}"
                )
            ]

    async def handle_repo_git_info(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle Git information requests."""
        try:
            if not self.git_repo:
                return [
                    TextContent(type="text", text="Error: Git repository not available")
                ]

            info_type = arguments.get("info_type")
            limit = arguments.get("limit", 10)

            if info_type == "branch":
                current_branch = self.git_repo.active_branch.name
                all_branches = [branch.name for branch in self.git_repo.branches]
                result_data = {
                    "current_branch": current_branch,
                    "all_branches": all_branches,
                }

            elif info_type == "commits":
                commits = []
                for commit in list(self.git_repo.iter_commits(max_count=limit)):
                    commits.append(
                        {
                            "sha": commit.hexsha[:8],
                            "message": commit.message.strip(),
                            "author": str(commit.author),
                            "date": commit.committed_datetime.isoformat(),
                        }
                    )
                result_data = {"commits": commits}

            elif info_type == "status":
                # Get repository status
                result_data = {
                    "modified": [
                        item.a_path for item in self.git_repo.index.diff(None)
                    ],
                    "staged": [
                        item.a_path for item in self.git_repo.index.diff("HEAD")
                    ],
                    "untracked": self.git_repo.untracked_files,
                }

            elif info_type == "remotes":
                remotes = {}
                for remote in self.git_repo.remotes:
                    remotes[remote.name] = list(remote.urls)
                result_data = {"remotes": remotes}

            elif info_type == "tags":
                tags = [tag.name for tag in self.git_repo.tags]
                result_data = {"tags": sorted(tags, reverse=True)[:limit]}

            else:
                return [
                    TextContent(
                        type="text", text=f"Error: Unknown info_type: {info_type}"
                    )
                ]

            return [
                TextContent(
                    type="text",
                    text=f"Repository Git Information ({info_type}):\n{result_data}",
                )
            ]

        except Exception as e:
            logger.error(f"Error getting repository Git info: {e}")
            return [
                TextContent(
                    type="text", text=f"Error getting repository Git info: {str(e)}"
                )
            ]
