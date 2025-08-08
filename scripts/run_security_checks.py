"""
Script to perform security checks on the Royal Equips Orchestrator codebase.

This module installs and executes a collection of open‑source security tools
directly inside the running container. It performs static analysis on the
application's source code using **Bandit** and audits Python dependencies for
known vulnerabilities using **pip‑audit**. Results are aggregated into a
single JSON object and written to both STDOUT and `security_report.json`.

Because the orchestrator container is built for production use, we avoid
keeping these heavy scanners in the base image. Instead, this script
dynamically installs the tools at runtime. Render's cron jobs run in
ephemeral containers, so the install overhead is acceptable and does not
impact web service performance.

Usage:
    python scripts/run_security_checks.py

Environment:
    SECURITY_REPORT_PATH (optional) – path to write the security report. If
    unset, defaults to `security_report.json` in the current working
    directory.

The resulting JSON object contains the exit codes and raw reports for
Bandit and pip‑audit. Non‑zero exit codes indicate that issues were
discovered. See the Bandit and pip‑audit documentation for details.
"""

import json
import os
import subprocess
import sys
from typing import Dict, Tuple


def run_command(command: list[str]) -> Tuple[int, str, str]:
    """Execute a shell command and capture the exit code, stdout and stderr."""
    process = subprocess.run(
        command, capture_output=True, text=True, check=False
    )
    return process.returncode, process.stdout, process.stderr


def ensure_tool_installed(package: str) -> None:
    """Ensure the given Python package is installed in the current environment."""
    # Install only if the module cannot be imported. We attempt to import
    # the package first; if it fails, we invoke pip to install it. The
    # installation is done quietly to minimise log noise.
    try:
        __import__(package.replace("-", "_"))
    except ImportError:
        install_cmd = [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--no-cache-dir",
            package,
        ]
        code, out, err = run_command(install_cmd)
        if code != 0:
            raise RuntimeError(
                f"Failed to install {package}: exit code {code}\n{out}\n{err}"
            )


def perform_security_scans() -> Dict[str, object]:
    """Run Bandit and pip‑audit and return a consolidated report."""
    # Ensure required tools are present
    for package in ["bandit", "pip-audit"]:
        ensure_tool_installed(package)

    result: Dict[str, object] = {}

    # Run Bandit against the orchestrator package. We scan recursively and
    # output JSON so that the report can be machine‑parsed later. Bandit
    # returns exit code 0 if no issues are found, 1 for issues, and >1 for
    # errors.
    bandit_cmd = [
        "bandit",
        "-r",
        "royal_equips_orchestrator",
        "-f",
        "json",
    ]
    bandit_code, bandit_out, bandit_err = run_command(bandit_cmd)
    result["bandit_exit_code"] = bandit_code
    # In some environments Bandit writes warnings to stderr; include them
    result["bandit_report"] = bandit_out or bandit_err

    # Run pip‑audit against the orchestrator's requirements file. This
    # enumerates installed packages and checks against the Python
    # Packaging Advisory Database. A non‑zero exit code indicates
    # vulnerabilities were found.
    requirements_path = os.path.join(
        os.path.dirname(__file__), "..", "requirements.txt"
    )
    pip_audit_cmd = [
        "pip-audit",
        "-r",
        os.path.abspath(requirements_path),
        "-f",
        "json",
    ]
    pip_code, pip_out, pip_err = run_command(pip_audit_cmd)
    result["pip_audit_exit_code"] = pip_code
    result["pip_audit_report"] = pip_out or pip_err

    return result


def main() -> None:
    """Entry point for security scanning."""
    report = perform_security_scans()
    # Determine output location. Use SECURITY_REPORT_PATH if set, else default.
    output_path = os.environ.get("SECURITY_REPORT_PATH", "security_report.json")
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
    except OSError as exc:
        print(f"Failed to write security report to {output_path}: {exc}")
    # Also print the JSON to STDOUT for logging
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()