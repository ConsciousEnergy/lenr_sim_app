"""
Compare benchmark results between runs and generate a report.
"""

import argparse
import json
import os
from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt
from typing import Dict, List, Tuple

def load_benchmark_data(directory: Path) -> Dict:
    """Load benchmark data from JSON files."""
    data = {}
    for file in directory.glob("**/*.json"):
        with open(file) as f:
            benchmark = json.load(f)
            data[file.stem] = benchmark
    return data

def compare_metrics(
    previous: Dict,
    current: Dict,
    threshold: float
) -> Tuple[List[str], List[str], List[str]]:
    """
    Compare metrics between previous and current runs.
    Returns lists of improved, degraded, and unchanged metrics.
    """
    improved = []
    degraded = []
    unchanged = []
    
    for name, prev_data in previous.items():
        if name not in current:
            continue
            
        curr_data = current[name]
        
        # Compare mean execution times
        prev_mean = prev_data.get('mean', 0)
        curr_mean = curr_data.get('mean', 0)
        
        if prev_mean == 0:
            continue
            
        change = ((curr_mean - prev_mean) / prev_mean) * 100
        
        if abs(change) < threshold:
            unchanged.append((name, change))
        elif change < 0:
            improved.append((name, change))
        else:
            degraded.append((name, change))
            
    return improved, degraded, unchanged

def generate_comparison_plots(
    previous: Dict,
    current: Dict,
    output_dir: Path
) -> None:
    """Generate comparison plots for benchmark metrics."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Execution time comparison
    plt.figure(figsize=(12, 6))
    benchmarks = list(set(previous.keys()) & set(current.keys()))
    prev_times = [previous[b].get('mean', 0) for b in benchmarks]
    curr_times = [current[b].get('mean', 0) for b in benchmarks]
    
    x = np.arange(len(benchmarks))
    width = 0.35
    
    plt.bar(x - width/2, prev_times, width, label='Previous')
    plt.bar(x + width/2, curr_times, width, label='Current')
    plt.xlabel('Benchmark')
    plt.ylabel('Mean Execution Time (s)')
    plt.title('Benchmark Time Comparison')
    plt.xticks(x, benchmarks, rotation=45, ha='right')
    plt.legend()
    plt.tight_layout()
    plt.savefig(output_dir / 'time_comparison.png')
    plt.close()
    
    # Memory usage comparison
    plt.figure(figsize=(12, 6))
    prev_mem = [previous[b].get('memory', {}).get('peak', 0) for b in benchmarks]
    curr_mem = [current[b].get('memory', {}).get('peak', 0) for b in benchmarks]
    
    plt.bar(x - width/2, prev_mem, width, label='Previous')
    plt.bar(x + width/2, curr_mem, width, label='Current')
    plt.xlabel('Benchmark')
    plt.ylabel('Peak Memory Usage (MB)')
    plt.title('Memory Usage Comparison')
    plt.xticks(x, benchmarks, rotation=45, ha='right')
    plt.legend()
    plt.tight_layout()
    plt.savefig(output_dir / 'memory_comparison.png')
    plt.close()

def generate_report(
    improved: List[Tuple[str, float]],
    degraded: List[Tuple[str, float]],
    unchanged: List[Tuple[str, float]],
    output_dir: Path
) -> None:
    """Generate a markdown report of benchmark comparisons."""
    report = ["# Benchmark Comparison Report\n"]
    
    if improved:
        report.append("\n## ✅ Improved Benchmarks\n")
        for name, change in improved:
            report.append(f"- **{name}**: {abs(change):.1f}% faster")
    
    if degraded:
        report.append("\n## ⚠️ Performance Regressions\n")
        for name, change in degraded:
            report.append(f"- **{name}**: {change:.1f}% slower")
    
    if unchanged:
        report.append("\n## ℹ️ Unchanged Benchmarks\n")
        for name, change in unchanged:
            report.append(f"- **{name}**: {change:.1f}% change (within threshold)")
    
    report.append("\n## 📊 Visualization\n")
    report.append("![Time Comparison](time_comparison.png)\n")
    report.append("![Memory Comparison](memory_comparison.png)\n")
    
    with open(output_dir / 'benchmark-comparison.md', 'w') as f:
        f.write('\n'.join(report))

def main():
    parser = argparse.ArgumentParser(description='Compare benchmark results')
    parser.add_argument('--previous', type=Path, required=True,
                      help='Directory containing previous benchmark results')
    parser.add_argument('--current', type=Path, required=True,
                      help='Directory containing current benchmark results')
    parser.add_argument('--threshold', type=float, default=10,
                      help='Percentage threshold for considering changes significant')
    parser.add_argument('--output', type=Path, default=Path('benchmark-comparison'),
                      help='Output directory for comparison results')
    
    args = parser.parse_args()
    
    # Load benchmark data
    previous_data = load_benchmark_data(args.previous)
    current_data = load_benchmark_data(args.current)
    
    # Compare metrics
    improved, degraded, unchanged = compare_metrics(
        previous_data,
        current_data,
        args.threshold
    )
    
    # Generate comparison plots
    generate_comparison_plots(
        previous_data,
        current_data,
        args.output
    )
    
    # Generate report
    generate_report(
        improved,
        degraded,
        unchanged,
        args.output
    )

if __name__ == '__main__':
    main() 