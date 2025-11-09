#!/usr/bin/env python
"""
Test runner script for the LENR Simulation Application.

This script provides a convenient way to run tests with various options
and generate comprehensive test reports.
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path

# Ensure we're running from the backend directory
backend_dir = Path(__file__).resolve().parent
os.chdir(backend_dir)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Run tests for the LENR Simulation Application."
    )
    
    parser.add_argument(
        "--unit", action="store_true", 
        help="Run only unit tests"
    )
    parser.add_argument(
        "--integration", action="store_true",
        help="Run only integration tests"
    )
    parser.add_argument(
        "--performance", action="store_true",
        help="Run performance benchmarks"
    )
    parser.add_argument(
        "--coverage", action="store_true",
        help="Generate coverage report"
    )
    parser.add_argument(
        "--html", action="store_true",
        help="Generate HTML test report"
    )
    parser.add_argument(
        "--parallel", type=int, default=0,
        help="Number of parallel processes (0 for auto)"
    )
    parser.add_argument(
        "--verbose", "-v", action="count", default=0,
        help="Verbosity level (can be used multiple times)"
    )
    parser.add_argument(
        "path", nargs="*", default=["tests"],
        help="Test path(s) to run (default: tests directory)"
    )
    
    return parser.parse_args()

def run_tests(args):
    """Run tests with the provided arguments."""
    # Base pytest command
    cmd = ["pytest"]
    
    # Add verbosity
    if args.verbose:
        cmd.extend(["-" + "v" * args.verbose])
    
    # Filter by test type if specified
    if args.unit:
        cmd.extend(["-m", "unit"])
    elif args.integration:
        cmd.extend(["-m", "integration"])
    elif args.performance:
        cmd.extend(["-m", "performance"])
    
    # Add parallel execution if requested
    if args.parallel:
        workers = args.parallel if args.parallel > 0 else "auto"
        cmd.extend(["-n", str(workers)])
    
    # Add coverage if requested
    if args.coverage:
        cmd.extend(["--cov=app", "--cov-report=term", "--cov-report=html"])
    
    # Add HTML report if requested
    if args.html:
        report_dir = "test-reports/html"
        cmd.extend(["--html=" + report_dir + "/report.html", "--self-contained-html"])
        os.makedirs(report_dir, exist_ok=True)
    
    # Add test paths
    cmd.extend(args.path)
    
    # Print the command being run
    print(f"Running: {' '.join(cmd)}")
    
    # Run the tests
    return subprocess.run(cmd)

def main():
    """Main entry point for the script."""
    args = parse_args()
    result = run_tests(args)
    
    # Handle test run outcome
    if result.returncode != 0:
        print("\nTests failed!")
        if args.coverage:
            print("\nCoverage report available in htmlcov/index.html")
        if args.html:
            print("\nTest report available in test-reports/html/report.html")
        sys.exit(result.returncode)
    else:
        print("\nAll tests passed!")
        if args.coverage:
            print("\nCoverage report available in htmlcov/index.html")
        if args.html:
            print("\nTest report available in test-reports/html/report.html")
        
        if args.performance:
            print("\nPerformance benchmark results available in benchmarks/performance/")

if __name__ == "__main__":
    main() 