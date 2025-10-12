#!/usr/bin/env python3
"""
Health check script for Royal Equips Orchestrator.

This script performs comprehensive health checks on the running application,
including HTTP endpoint checks, process monitoring, and system resource validation.
"""

import json
import subprocess
import sys
import time
from typing import Dict, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import urlopen


def log(message: str) -> None:
    """Log message with timestamp."""
    timestamp = time.strftime('%H:%M:%S')
    print(f"[{timestamp}] {message}", flush=True)


def check_http_endpoint(url: str, timeout: int = 10) -> Tuple[bool, str]:
    """Check if HTTP endpoint is healthy."""
    try:
        with urlopen(url, timeout=timeout) as response:
            status_code = response.getcode()
            if status_code == 200:
                try:
                    data = response.read().decode('utf-8')
                    # Try to parse as JSON
                    json.loads(data)
                    return True, f"HTTP {status_code}, valid JSON response"
                except (ValueError, json.JSONDecodeError):
                    return True, f"HTTP {status_code}, non-JSON response"
            else:
                return False, f"HTTP {status_code}"
    except HTTPError as e:
        return False, f"HTTP Error: {e.code} - {e.reason}"
    except URLError as e:
        return False, f"URL Error: {e.reason}"
    except Exception as e:
        return False, f"Exception: {str(e)}"


def check_process_health() -> Dict[str, any]:
    """Check system process health."""
    try:
        # Check system load
        with open('/proc/loadavg') as f:
            load_avg = f.read().strip().split()
            load_1m = float(load_avg[0])

        # Check memory usage
        with open('/proc/meminfo') as f:
            lines = f.readlines()
            mem_info = {}
            for line in lines:
                if line.startswith(('MemTotal:', 'MemAvailable:', 'MemFree:')):
                    key, value = line.split(':')
                    mem_info[key.strip()] = int(value.strip().split()[0]) * 1024  # Convert to bytes

        memory_usage = (mem_info['MemTotal'] - mem_info['MemAvailable']) / mem_info['MemTotal'] * 100

        return {
            'load_1m': load_1m,
            'memory_usage_percent': round(memory_usage, 2),
            'memory_total_mb': round(mem_info['MemTotal'] / 1024 / 1024),
            'memory_available_mb': round(mem_info['MemAvailable'] / 1024 / 1024)
        }
    except Exception as e:
        return {'error': str(e)}


def find_application_port() -> Optional[int]:
    """Try to find the port the application is running on."""
    common_ports = [8000, 8080, 8501, 3000, 5000, 9000]

    try:
        # Try to use netstat to find listening ports
        result = subprocess.run(['netstat', '-tlnp'], capture_output=True, text=True)
        if result.returncode == 0:
            for line in result.stdout.split('\n'):
                if 'LISTEN' in line and 'python' in line.lower():
                    parts = line.split()
                    if len(parts) > 3:
                        addr_port = parts[3]
                        if ':' in addr_port:
                            port = addr_port.split(':')[-1]
                            try:
                                return int(port)
                            except ValueError:
                                continue
    except FileNotFoundError:
        pass

    # Fallback: check common ports
    import socket
    for port in common_ports:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex(('localhost', port))
            if result == 0:
                return port

    return None


def main():
    """Main health check routine."""
    log("🏥 Starting Royal Equips Orchestrator Health Check")

    # Get configuration
    import os
    port = int(os.getenv('PORT', '8000'))
    host = os.getenv('HOST', 'localhost')
    check_interval = int(os.getenv('HEALTH_CHECK_INTERVAL', '30'))
    max_checks = int(os.getenv('HEALTH_CHECK_MAX_CHECKS', '1'))

    log(f"Configuration: host={host}, port={port}, interval={check_interval}s, max_checks={max_checks}")

    # Try to auto-detect port if the configured one isn't working
    auto_port = find_application_port()
    if auto_port and auto_port != port:
        log(f"🔍 Auto-detected application running on port {auto_port}")
        port = auto_port

    health_endpoints = [
        f"http://{host}:{port}/health",
        f"http://{host}:{port}/",
        f"http://{host}:{port}/api/health",
    ]

    checks_performed = 0
    success_count = 0

    while checks_performed < max_checks:
        checks_performed += 1
        log(f"🔍 Health check {checks_performed}/{max_checks}")

        # Check system health
        system_health = check_process_health()
        if 'error' not in system_health:
            log(f"📊 System: Load={system_health['load_1m']}, Memory={system_health['memory_usage_percent']}%")
            if system_health['load_1m'] > 5.0:
                log("⚠️  High system load detected")
            if system_health['memory_usage_percent'] > 90:
                log("⚠️  High memory usage detected")

        # Check HTTP endpoints
        endpoint_healthy = False
        for endpoint in health_endpoints:
            healthy, message = check_http_endpoint(endpoint)
            if healthy:
                log(f"✅ {endpoint}: {message}")
                endpoint_healthy = True
                break
            else:
                log(f"❌ {endpoint}: {message}")

        if endpoint_healthy:
            success_count += 1
            log("✅ Health check passed")
        else:
            log("❌ Health check failed - no endpoints responding")

        # Sleep between checks (except for the last one)
        if checks_performed < max_checks and check_interval > 0:
            time.sleep(check_interval)

    # Summary
    success_rate = (success_count / checks_performed) * 100
    log(f"📈 Health check summary: {success_count}/{checks_performed} checks passed ({success_rate:.1f}%)")

    if success_rate >= 50:  # At least half the checks should pass
        log("✅ Overall health: HEALTHY")
        sys.exit(0)
    else:
        log("❌ Overall health: UNHEALTHY")
        sys.exit(1)


if __name__ == "__main__":
    main()
