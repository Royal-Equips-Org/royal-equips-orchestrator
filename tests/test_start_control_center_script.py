"""Test the new start_control_center.sh script."""

import os
import subprocess
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def test_script_exists_and_executable():
    """Test that the script exists and is executable."""
    script_path = project_root / "scripts" / "start_control_center.sh"
    assert script_path.exists(), "start_control_center.sh should exist"
    assert os.access(script_path, os.X_OK), "start_control_center.sh should be executable"


def test_script_has_correct_shebang():
    """Test that the script has the correct shebang."""
    script_path = project_root / "scripts" / "start_control_center.sh"
    with open(script_path, 'r') as f:
        first_line = f.readline().strip()
    assert first_line == "#!/usr/bin/env bash", f"Expected bash shebang, got: {first_line}"


def test_script_syntax():
    """Test that the script has valid bash syntax."""
    script_path = project_root / "scripts" / "start_control_center.sh"
    
    # Test bash syntax without running the script
    result = subprocess.run(
        ["bash", "-n", str(script_path)], 
        capture_output=True, 
        text=True
    )
    
    assert result.returncode == 0, f"Script has syntax errors: {result.stderr}"


def test_script_logic_with_mock():
    """Test the script logic by replacing streamlit with echo."""
    script_path = project_root / "scripts" / "start_control_center.sh"
    
    # Create a modified version that uses echo instead of exec streamlit
    with open(script_path, 'r') as f:
        content = f.read()
    
    # Replace exec streamlit with echo for testing
    modified_content = content.replace('exec streamlit', 'echo "Would run: streamlit"')
    
    # Write to a temporary test file
    test_script_path = "/tmp/test_start_control_center.sh"
    with open(test_script_path, 'w') as f:
        f.write(modified_content)
    os.chmod(test_script_path, 0o755)
    
    # Test classic variant
    env = os.environ.copy()
    env['CONTROL_CENTER_VARIANT'] = 'classic'
    env['PORT'] = '8080'
    
    result = subprocess.run(
        [test_script_path],
        env=env,
        capture_output=True,
        text=True
    )
    
    assert result.returncode == 0, f"Script failed: {result.stderr}"
    assert "app.py" in result.stdout, "Should run classic app"
    assert "8080" in result.stdout, "Should use correct port"
    
    # Test holo variant (default)
    env['CONTROL_CENTER_VARIANT'] = ''
    env['PORT'] = '9090'
    
    result = subprocess.run(
        [test_script_path],
        env=env,
        capture_output=True,
        text=True
    )
    
    assert result.returncode == 0, f"Script failed: {result.stderr}"
    assert "holo_app.py" in result.stdout, "Should run holo app"
    assert "9090" in result.stdout, "Should use correct port"
    assert "--theme.base=dark" in result.stdout, "Should include dark theme"


if __name__ == "__main__":
    test_script_exists_and_executable()
    test_script_has_correct_shebang()
    test_script_syntax()
    test_script_logic_with_mock()
    print("All script tests passed!")
