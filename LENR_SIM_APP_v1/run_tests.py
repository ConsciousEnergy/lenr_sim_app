#!/usr/bin/env python3
"""
LENR Simulation App Test Runner

This script runs all tests and generates a detailed report.
"""

import os
import sys
import time
import subprocess
import argparse
import json
from datetime import datetime

# Define test categories
TEST_CATEGORIES = {
    "physics": {
        "path": "backend/tests/test_lenr_app.py::TestPotentialModels",
        "description": "Physics module tests (potential models, energy calculations)"
    },
    "tunneling": {
        "path": "backend/tests/test_lenr_app.py::TestTunnelingEngine",
        "description": "Tunneling engine tests (thermal and impact tunneling)"
    },
    "heatmap": {
        "path": "backend/tests/test_lenr_app.py::TestHeatmapModule",
        "description": "Heatmap generation tests"
    },
    "api": {
        "path": "backend/tests/test_lenr_app.py::TestAPIEndpoints",
        "description": "API endpoint tests"
    },
    "integration": {
        "path": "backend/tests/test_lenr_app.py::TestIntegration",
        "description": "Integration tests between components"
    },
    "all": {
        "path": "backend/tests/test_lenr_app.py",
        "description": "All backend tests"
    }
}

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="LENR Simulation App Test Runner")
    parser.add_argument(
        "category",
        choices=list(TEST_CATEGORIES.keys()),
        default="all",
        nargs="?",
        help="Test category to run"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose output"
    )
    parser.add_argument(
        "--report", "-r",
        action="store_true",
        help="Generate HTML test report"
    )
    parser.add_argument(
        "--output", "-o",
        default="test_reports",
        help="Directory for test reports"
    )
    parser.add_argument(
        "--collect-only",
        action="store_true",
        help="Only collect tests, don't run them"
    )
    parser.add_argument(
        "--failfast", "-f",
        action="store_true",
        help="Stop on first failure"
    )
    return parser.parse_args()

def setup_environment():
    """Set up the test environment."""
    # Ensure we're in the correct directory
    if os.path.exists('backend') and os.path.isdir('backend'):
        os.environ['PYTHONPATH'] = os.path.abspath('.')
    else:
        print("Error: Run this script from the project root directory")
        sys.exit(1)
    
    # Check for test directory
    if not os.path.exists('backend/tests'):
        print("Error: Tests directory not found")
        sys.exit(1)

def activate_virtual_env():
    """Activate the virtual environment if available."""
    venv_paths = ['backend-env', 'venv', 'backend-venv']
    for venv_path in venv_paths:
        if os.path.exists(venv_path):
            if os.name == 'nt':  # Windows
                activate_script = os.path.join(venv_path, 'Scripts', 'activate')
            else:  # Unix/Linux
                activate_script = os.path.join(venv_path, 'bin', 'activate')
            
            if os.path.exists(activate_script):
                # Return the activate command for use in subprocess
                if os.name == 'nt':
                    return f"call {activate_script} && "
                else:
                    return f"source {activate_script} && "
    
    return ""  # No virtual environment found or activated

def run_tests(category, verbose=False, report=False, output_dir="test_reports", collect_only=False, failfast=False):
    """Run the specified tests."""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"{output_dir}/report_{category}_{timestamp}.html"
    
    print(f"\n{'=' * 80}")
    print(f"Running {TEST_CATEGORIES[category]['description']}")
    print(f"{'=' * 80}\n")
    
    # Base command
    venv_activate = activate_virtual_env()
    cmd_parts = [venv_activate, "python -m pytest", TEST_CATEGORIES[category]["path"]]
    
    # Add options
    if verbose:
        cmd_parts.append("-v")
    
    if collect_only:
        cmd_parts.append("--collect-only")
    
    if failfast:
        cmd_parts.append("-x")
    
    if report:
        cmd_parts.append(f"--html={report_file} --self-contained-html")
    
    # Build final command
    cmd = " ".join(cmd_parts)
    
    # Run tests
    start_time = time.time()
    if os.name == 'nt':  # Windows
        process = subprocess.run(cmd, shell=True)
    else:  # Unix/Linux
        process = subprocess.run(cmd, shell=True, executable="/bin/bash")
    end_time = time.time()
    
    test_duration = end_time - start_time
    
    # Print summary
    print(f"\n{'=' * 80}")
    print(f"Test Summary for {category}:")
    print(f"- Duration: {test_duration:.2f} seconds")
    print(f"- Exit Code: {process.returncode}")
    
    if report:
        print(f"- Report: {os.path.abspath(report_file)}")
    
    print(f"{'=' * 80}\n")
    
    return process.returncode

def main():
    """Main entry point."""
    args = parse_args()
    setup_environment()
    
    try:
        exit_code = run_tests(
            args.category,
            verbose=args.verbose,
            report=args.report,
            output_dir=args.output,
            collect_only=args.collect_only,
            failfast=args.failfast
        )
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\nTest run interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nError running tests: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 