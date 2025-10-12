"""
GitHub Integration Blueprint for Royal Equips Orchestrator.

Provides API endpoints for:
- Repository health monitoring
- Commit and deployment tracking
- Issue and PR management
- GitHub Actions workflow monitoring
- Direct codebase operations
"""

import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from app.services.github_service import github_service

logger = logging.getLogger(__name__)

github_bp = Blueprint("github", __name__, url_prefix="/api/github")

@github_bp.route("/status", methods=["GET"])
def get_github_status():
    """
    Get GitHub service connection status.
    ---
    tags:
      - GitHub
    responses:
      200:
        description: GitHub service status
        schema:
          type: object
          properties:
            authenticated:
              type: boolean
            repo_owner:
              type: string
            repo_name:
              type: string
            status:
              type: string
            timestamp:
              type: string
    """
    return jsonify({
        "authenticated": github_service.is_authenticated(),
        "repo_owner": github_service.repo_owner,
        "repo_name": github_service.repo_name,
        "status": "operational" if github_service.is_authenticated() else "not_configured",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

@github_bp.route("/repository", methods=["GET"])
def get_repository_info():
    """
    Get repository information and health metrics.
    ---
    tags:
      - GitHub
    responses:
      200:
        description: Repository information
      503:
        description: GitHub service not configured
    """
    if not github_service.is_authenticated():
        return jsonify({
            "error": "GitHub service not configured",
            "message": "GITHUB_TOKEN environment variable required"
        }), 503

    repo_info = github_service.get_repo_info()
    return jsonify(repo_info)

@github_bp.route("/health", methods=["GET"])
def get_repository_health():
    """
    Get comprehensive repository health assessment.
    ---
    tags:
      - GitHub
    responses:
      200:
        description: Repository health metrics
      503:
        description: GitHub service not configured
    """
    if not github_service.is_authenticated():
        return jsonify({
            "error": "GitHub service not configured",
            "health_score": 0,
            "health_status": "not_configured"
        }), 503

    health = github_service.get_repository_health()
    return jsonify(health)

@github_bp.route("/commits", methods=["GET"])
def get_recent_commits():
    """
    Get recent commits from the repository.
    ---
    tags:
      - GitHub
    parameters:
      - name: limit
        in: query
        type: integer
        default: 10
        description: Number of commits to retrieve
    responses:
      200:
        description: Recent commits
      503:
        description: GitHub service not configured
    """
    if not github_service.is_authenticated():
        return jsonify({
            "error": "GitHub service not configured",
            "commits": []
        }), 503

    limit = request.args.get('limit', 10, type=int)
    limit = min(max(limit, 1), 50)  # Clamp between 1 and 50

    commits = github_service.get_recent_commits(limit)
    return jsonify({
        "commits": commits,
        "count": len(commits),
        "limit": limit,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

@github_bp.route("/workflows", methods=["GET"])
def get_workflow_runs():
    """
    Get recent GitHub Actions workflow runs.
    ---
    tags:
      - GitHub
    parameters:
      - name: limit
        in: query
        type: integer
        default: 10
        description: Number of workflow runs to retrieve
    responses:
      200:
        description: Workflow runs
      503:
        description: GitHub service not configured
    """
    if not github_service.is_authenticated():
        return jsonify({
            "error": "GitHub service not configured",
            "workflows": []
        }), 503

    limit = request.args.get('limit', 10, type=int)
    limit = min(max(limit, 1), 50)  # Clamp between 1 and 50

    workflows = github_service.get_workflow_runs(limit)
    return jsonify({
        "workflow_runs": workflows,
        "count": len(workflows),
        "limit": limit,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

@github_bp.route("/issues", methods=["GET"])
def get_open_issues():
    """
    Get open issues from the repository.
    ---
    tags:
      - GitHub
    parameters:
      - name: limit
        in: query
        type: integer
        default: 10
        description: Number of issues to retrieve
    responses:
      200:
        description: Open issues
      503:
        description: GitHub service not configured
    """
    if not github_service.is_authenticated():
        return jsonify({
            "error": "GitHub service not configured",
            "issues": []
        }), 503

    limit = request.args.get('limit', 10, type=int)
    limit = min(max(limit, 1), 50)  # Clamp between 1 and 50

    issues = github_service.get_open_issues(limit)
    return jsonify({
        "issues": issues,
        "count": len(issues),
        "limit": limit,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

@github_bp.route("/pull-requests", methods=["GET"])
def get_pull_requests():
    """
    Get pull requests from the repository.
    ---
    tags:
      - GitHub
    parameters:
      - name: state
        in: query
        type: string
        enum: ['open', 'closed', 'all']
        default: open
        description: PR state filter
      - name: limit
        in: query
        type: integer
        default: 10
        description: Number of PRs to retrieve
    responses:
      200:
        description: Pull requests
      503:
        description: GitHub service not configured
    """
    if not github_service.is_authenticated():
        return jsonify({
            "error": "GitHub service not configured",
            "pull_requests": []
        }), 503

    state = request.args.get('state', 'open')
    limit = request.args.get('limit', 10, type=int)
    limit = min(max(limit, 1), 50)  # Clamp between 1 and 50

    if state not in ['open', 'closed', 'all']:
        state = 'open'

    prs = github_service.get_pull_requests(state, limit)
    return jsonify({
        "pull_requests": prs,
        "count": len(prs),
        "state": state,
        "limit": limit,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

@github_bp.route("/issues", methods=["POST"])
def create_issue():
    """
    Create a new issue in the repository.
    ---
    tags:
      - GitHub
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            title:
              type: string
              description: Issue title
            body:
              type: string
              description: Issue body/description
            labels:
              type: array
              items:
                type: string
              description: Issue labels
          required:
            - title
    responses:
      201:
        description: Issue created successfully
      400:
        description: Invalid request body
      503:
        description: GitHub service not configured
    """
    if not github_service.is_authenticated():
        return jsonify({
            "error": "GitHub service not configured"
        }), 503

    try:
        data = request.get_json()
        if not data or 'title' not in data:
            return jsonify({
                "error": "Missing required field 'title' in request body"
            }), 400

        title = data['title']
        body = data.get('body', '')
        labels = data.get('labels', [])

        result = github_service.create_issue(title, body, labels)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 500

    except Exception as e:
        logger.error(f"Error creating GitHub issue: {e}")
        return jsonify({
            "error": "Failed to create issue",
            "message": str(e)
        }), 500

@github_bp.route("/deployment", methods=["GET"])
def get_deployment_status():
    """
    Get current deployment status and environment information.
    ---
    tags:
      - GitHub
    responses:
      200:
        description: Deployment status
      503:
        description: GitHub service not configured
    """
    if not github_service.is_authenticated():
        return jsonify({
            "error": "GitHub service not configured",
            "status": "not_configured"
        }), 503

    deployment_info = github_service.get_deployment_status()
    return jsonify(deployment_info)

@github_bp.route("/summary", methods=["GET"])
def get_github_summary():
    """
    Get comprehensive GitHub integration summary.
    ---
    tags:
      - GitHub
    responses:
      200:
        description: GitHub integration summary
      503:
        description: GitHub service not configured
    """
    if not github_service.is_authenticated():
        return jsonify({
            "error": "GitHub service not configured",
            "status": "not_configured",
            "authenticated": False
        }), 503

    try:
        # Gather all GitHub information
        repo_info = github_service.get_repo_info()
        health = github_service.get_repository_health()
        recent_commits = github_service.get_recent_commits(5)
        workflows = github_service.get_workflow_runs(5)
        issues = github_service.get_open_issues(5)
        prs = github_service.get_pull_requests('open', 5)
        deployment = github_service.get_deployment_status()

        return jsonify({
            "status": "operational",
            "authenticated": True,
            "repository": repo_info,
            "health": health,
            "activity": {
                "recent_commits": recent_commits,
                "workflow_runs": workflows,
                "open_issues": issues,
                "pull_requests": prs
            },
            "deployment": deployment,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    except Exception as e:
        logger.error(f"Error getting GitHub summary: {e}")
        return jsonify({
            "error": "Failed to get GitHub summary",
            "message": str(e)
        }), 500
