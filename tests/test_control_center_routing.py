#!/usr/bin/env python3
"""Test control center routing logic.

These tests validate that the control center launcher correctly routes
to the appropriate app based on the CONTROL_CENTER_VARIANT environment variable.
"""

import os
import sys
import unittest
from pathlib import Path
from unittest import mock

# Add the scripts directory to the Python path for testing
script_dir = Path(__file__).parent.parent / "scripts"
sys.path.insert(0, str(script_dir))

try:
    import run_control_center
except ImportError:
    # Handle import error gracefully
    run_control_center = None


class TestControlCenterRouting(unittest.TestCase):
    """Test cases for control center routing logic."""

    def setUp(self):
        """Set up test environment."""
        # Save original environment
        self.original_env = os.environ.copy()

    def tearDown(self):
        """Clean up test environment."""
        # Restore original environment
        os.environ.clear()
        os.environ.update(self.original_env)

    @mock.patch('run_control_center.subprocess.run')
    @mock.patch('run_control_center.os.chdir')
    def test_default_launches_holo(self, mock_chdir, mock_run):
        """Test that default behavior launches holographic control center."""
        if run_control_center is None:
            self.skipTest("Could not import run_control_center module")

        # Clear CONTROL_CENTER_VARIANT to test default
        if 'CONTROL_CENTER_VARIANT' in os.environ:
            del os.environ['CONTROL_CENTER_VARIANT']

        with mock.patch('sys.exit'):
            with mock.patch('run_control_center.Path') as mock_path:
                # Mock the path existence check
                mock_path_obj = mock.Mock()
                mock_path_obj.exists.return_value = True
                mock_path.return_value.parent.parent = mock.Mock()
                mock_path.return_value.parent.parent.__truediv__ = mock.Mock(return_value=mock_path_obj)

                try:
                    run_control_center.main()
                except SystemExit:
                    pass

        # Verify that the command includes holo_app.py
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]  # Get the command arguments
        self.assertTrue(any('holo_app.py' in str(arg) for arg in call_args))
        self.assertTrue(any('--theme.base' in str(arg) for arg in call_args))

    @mock.patch('run_control_center.subprocess.run')
    @mock.patch('run_control_center.os.chdir')
    def test_classic_variant_launches_classic(self, mock_chdir, mock_run):
        """Test that CONTROL_CENTER_VARIANT=classic launches classic control center."""
        if run_control_center is None:
            self.skipTest("Could not import run_control_center module")

        # Set environment to classic
        os.environ['CONTROL_CENTER_VARIANT'] = 'classic'

        with mock.patch('sys.exit'):
            with mock.patch('run_control_center.Path') as mock_path:
                # Mock the path existence check
                mock_path_obj = mock.Mock()
                mock_path_obj.exists.return_value = True
                mock_path.return_value.parent.parent = mock.Mock()
                mock_path.return_value.parent.parent.__truediv__ = mock.Mock(return_value=mock_path_obj)

                try:
                    run_control_center.main()
                except SystemExit:
                    pass

        # Verify that the command includes app.py (classic)
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]  # Get the command arguments
        self.assertTrue(any('app.py' in str(arg) for arg in call_args))
        self.assertFalse(any('holo_app.py' in str(arg) for arg in call_args))
        self.assertFalse(any('--theme.base' in str(arg) for arg in call_args))

    @mock.patch('run_control_center.subprocess.run')
    @mock.patch('run_control_center.os.chdir')
    def test_holo_variant_launches_holo(self, mock_chdir, mock_run):
        """Test that CONTROL_CENTER_VARIANT=holo explicitly launches holographic control center."""
        if run_control_center is None:
            self.skipTest("Could not import run_control_center module")

        # Set environment to holo explicitly
        os.environ['CONTROL_CENTER_VARIANT'] = 'holo'

        with mock.patch('sys.exit'):
            with mock.patch('run_control_center.Path') as mock_path:
                # Mock the path existence check
                mock_path_obj = mock.Mock()
                mock_path_obj.exists.return_value = True
                mock_path.return_value.parent.parent = mock.Mock()
                mock_path.return_value.parent.parent.__truediv__ = mock.Mock(return_value=mock_path_obj)

                try:
                    run_control_center.main()
                except SystemExit:
                    pass

        # Verify that the command includes holo_app.py
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]  # Get the command arguments
        self.assertTrue(any('holo_app.py' in str(arg) for arg in call_args))
        self.assertTrue(any('--theme.base' in str(arg) for arg in call_args))


if __name__ == '__main__':
    unittest.main()
