"""
Test script for the Unified LENR Theory physics engine.

This script tests the functionality of the unified LENR theory implementation,
including the various enhancement mechanisms and integrated calculations.

To run this test:
    python -m app.tests.test_unified_theory
"""

import os
import sys
import json
import logging
import numpy as np
from typing import Dict, List, Any
import time
import matplotlib.pyplot as plt
from pathlib import Path

# Add the parent directory to the path so we can import the app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Now import the app modules
from app.physics.unified_enhancement import (
    calculate_enhancement,
    get_default_configuration,
    calculate_enhancement_for_material,
    analyze_parameter_sensitivity
)
from app.physics.enhanced_fusion import (
    calculate_fusion_rate,
    calculator as fusion_calculator
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("unified_theory_test")

# Create output directory if it doesn't exist
output_dir = Path("output")
output_dir.mkdir(exist_ok=True)


def test_enhancement_mechanisms():
    """Test individual enhancement mechanisms."""
    logger.info("Testing individual enhancement mechanisms...")
    
    # Get default configuration
    config = get_default_configuration()
    
    # Test each mechanism individually
    mechanisms = list(config.keys())
    results = {}
    
    for mechanism in mechanisms:
        logger.info(f"Testing {mechanism}...")
        
        # Calculate enhancement with this mechanism only
        result = calculate_enhancement(config, [mechanism])
        
        # Store results
        results[mechanism] = {
            "enhancement_factor": result["combined_enhancement_factor"],
            "log_enhancement": result["log_combined_enhancement"]
        }
        
        logger.info(f"  Enhancement: {result['combined_enhancement_factor']:.2e} " +
                   f"(log10: {result['log_combined_enhancement']:.2f})")
    
    # Plot the results
    plt.figure(figsize=(12, 8))
    
    # Sort by enhancement factor
    sorted_mechanisms = sorted(results.keys(), 
                              key=lambda m: results[m]["log_enhancement"],
                              reverse=True)
    
    log_enhancements = [results[m]["log_enhancement"] for m in sorted_mechanisms]
    
    # Plot bar chart
    bars = plt.bar(sorted_mechanisms, log_enhancements)
    
    # Add labels
    plt.ylabel("log10(Enhancement Factor)")
    plt.xlabel("Mechanism")
    plt.title("Enhancement Factors by Mechanism")
    plt.xticks(rotation=45, ha="right")
    
    # Add values on bars
    for bar, value in zip(bars, log_enhancements):
        plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
                f"{value:.1f}", ha="center", va="bottom")
    
    plt.tight_layout()
    
    # Save the figure
    plt.savefig(output_dir / "mechanism_comparison.png")
    logger.info(f"Plot saved to {output_dir / 'mechanism_comparison.png'}")
    
    return results


def test_combined_enhancement():
    """Test combined enhancement from multiple mechanisms."""
    logger.info("Testing combined enhancement...")
    
    # Get default configuration
    config = get_default_configuration()
    
    # Calculate enhancement with all mechanisms
    start_time = time.time()
    result = calculate_enhancement(config)
    elapsed_time = time.time() - start_time
    
    logger.info(f"Combined enhancement: {result['combined_enhancement_factor']:.2e} " +
               f"(log10: {result['log_combined_enhancement']:.2f})")
    logger.info(f"Calculation time: {elapsed_time:.3f} seconds")
    
    # Get mechanism contributions
    contributions = {}
    if "mechanism_contribution" in result:
        contributions = result["mechanism_contribution"]
    
    # Plot the contributions
    plt.figure(figsize=(12, 8))
    
    # Sort by contribution
    sorted_mechanisms = sorted(contributions.keys(), 
                              key=lambda m: contributions[m],
                              reverse=True)
    
    contribution_values = [contributions[m] * 100 for m in sorted_mechanisms]  # Convert to percentage
    
    # Plot pie chart
    plt.pie(contribution_values, labels=sorted_mechanisms, autopct="%1.1f%%",
           shadow=True, startangle=90)
    plt.axis("equal")  # Equal aspect ratio ensures that pie is drawn as a circle
    plt.title("Mechanism Contributions to Total Enhancement")
    
    plt.tight_layout()
    
    # Save the figure
    plt.savefig(output_dir / "mechanism_contributions.png")
    logger.info(f"Plot saved to {output_dir / 'mechanism_contributions.png'}")
    
    return result


def test_material_enhancement():
    """Test enhancement calculations for different materials."""
    logger.info("Testing material-based enhancement...")
    
    # Test materials
    materials = ["palladium", "nickel", "titanium"]
    
    # Test temperatures
    temperatures = np.linspace(300, 1000, 8)  # K
    
    # Store results for each material
    results = {material: [] for material in materials}
    
    for material in materials:
        logger.info(f"Testing {material}...")
        
        for temp in temperatures:
            # Calculate enhancement for this material and temperature
            result = calculate_enhancement_for_material(
                material, temp, 101325.0  # Standard pressure
            )
            
            # Store results
            results[material].append(result["log_combined_enhancement"])
    
    # Plot the results
    plt.figure(figsize=(12, 8))
    
    for material in materials:
        plt.plot(temperatures, results[material], marker='o', label=material)
    
    plt.ylabel("log10(Enhancement Factor)")
    plt.xlabel("Temperature (K)")
    plt.title("Enhancement Factor vs. Temperature for Different Materials")
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    
    # Save the figure
    plt.savefig(output_dir / "material_enhancement.png")
    logger.info(f"Plot saved to {output_dir / 'material_enhancement.png'}")
    
    return results


def test_parameter_sensitivity():
    """Test sensitivity of enhancement to various parameters."""
    logger.info("Testing parameter sensitivity...")
    
    # Get default configuration
    config = get_default_configuration()
    
    # Parameters to test
    parameters = [
        {"name": "principal_quantum_number", "mechanism": "rydberg_matter", 
         "min": 10, "max": 100},
        {"name": "temperature", "mechanism": "electron_screening", 
         "min": 300, "max": 1000},
        {"name": "electric_field", "mechanism": "qed_effects", 
         "min": 1e5, "max": 1e7},
        {"name": "separation", "mechanism": "casimir_forces", 
         "min": 1e-11, "max": 1e-9}
    ]
    
    # Store results for each parameter
    results = {}
    
    for param in parameters:
        logger.info(f"Testing sensitivity to {param['name']} in {param['mechanism']}...")
        
        # Generate values
        values = np.linspace(param["min"], param["max"], 10)
        
        # Calculate sensitivity
        result = analyze_parameter_sensitivity(
            config,
            param["name"],
            param["mechanism"],
            values.tolist()
        )
        
        # Store results
        results[f"{param['mechanism']}.{param['name']}"] = {
            "values": values.tolist(),
            "log_enhancements": result["log_enhancements"]
        }
    
    # Plot the results
    plt.figure(figsize=(15, 10))
    
    for i, param_key in enumerate(results.keys()):
        plt.subplot(2, 2, i+1)
        
        param_data = results[param_key]
        values = param_data["values"]
        log_enhancements = param_data["log_enhancements"]
        
        plt.plot(values, log_enhancements, marker='o')
        plt.ylabel("log10(Enhancement)")
        plt.xlabel(param_key)
        plt.title(f"Sensitivity to {param_key}")
        plt.grid(True)
    
    plt.tight_layout()
    
    # Save the figure
    plt.savefig(output_dir / "parameter_sensitivity.png")
    logger.info(f"Plot saved to {output_dir / 'parameter_sensitivity.png'}")
    
    return results


def test_fusion_reactions():
    """Test fusion reaction calculations with the unified theory."""
    logger.info("Testing fusion reactions...")
    
    # Test reactions
    reactions = ["d-d", "d-p", "p-Li7", "d-Li6", "p-B11"]
    
    # Test temperatures
    temperatures = np.logspace(np.log10(300), np.log10(10000), 20)  # K
    
    # Standard density
    density = 1e28  # m^-3
    
    # Store results for each reaction
    results = {reaction: {"rates": [], "power": []} for reaction in reactions}
    
    for reaction in reactions:
        logger.info(f"Testing {reaction} fusion...")
        
        temp_results = fusion_calculator.calculate_multiple_temperatures(
            reaction, temperatures.tolist(), density, density
        )
        
        results[reaction]["rates"] = temp_results["reaction_rates"]
        results[reaction]["power"] = temp_results["power_densities"]
    
    # Plot the results
    plt.figure(figsize=(12, 8))
    
    for reaction in reactions:
        plt.plot(temperatures, [np.log10(r) if r > 0 else -100 for r in results[reaction]["rates"]], 
                marker='o', label=reaction)
    
    plt.ylabel("log10(Reaction Rate) [m^-3 s^-1]")
    plt.xlabel("Temperature (K)")
    plt.title("Fusion Reaction Rates vs. Temperature")
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    
    # Save the figure
    plt.savefig(output_dir / "fusion_rates.png")
    logger.info(f"Plot saved to {output_dir / 'fusion_rates.png'}")
    
    # Plot power densities
    plt.figure(figsize=(12, 8))
    
    for reaction in reactions:
        plt.plot(temperatures, [np.log10(p) if p > 0 else -100 for p in results[reaction]["power"]], 
                marker='o', label=reaction)
    
    plt.ylabel("log10(Power Density) [W/m^3]")
    plt.xlabel("Temperature (K)")
    plt.title("Fusion Power Density vs. Temperature")
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    
    # Save the figure
    plt.savefig(output_dir / "fusion_power.png")
    logger.info(f"Plot saved to {output_dir / 'fusion_power.png'}")
    
    return results


def test_mechanism_analysis():
    """Test analysis of mechanism contributions to fusion enhancement."""
    logger.info("Testing mechanism analysis for fusion...")
    
    # Test reaction
    reaction = "d-d"
    
    # Temperature and density
    temperature = 500.0  # K
    density = 1e28  # m^-3
    
    # Analyze mechanism contributions
    result = fusion_calculator.analyze_mechanism_contributions(
        reaction, temperature, density
    )
    
    logger.info(f"Total enhancement: {result['full_enhancement']:.2e} " +
               f"(log10: {result['log_full_enhancement']:.2f})")
    
    if "dominant_mechanism" in result:
        logger.info(f"Dominant mechanism: {result['dominant_mechanism']} " +
                   f"({result['dominant_enhancement']:.2e})")
    
    # Plot the contributions
    plt.figure(figsize=(12, 8))
    
    if "individual_results" in result:
        individual = result["individual_results"]
        
        mechanisms = list(individual.keys())
        contributions = [individual[m]["contribution_ratio"] * 100 for m in mechanisms]  # Convert to percentage
        
        # Sort by contribution
        sorted_indices = np.argsort(contributions)[::-1]
        sorted_mechanisms = [mechanisms[i] for i in sorted_indices]
        sorted_contributions = [contributions[i] for i in sorted_indices]
        
        # Plot bar chart
        bars = plt.bar(sorted_mechanisms, sorted_contributions)
        
        # Add labels
        plt.ylabel("Contribution to Total Enhancement (%)")
        plt.xlabel("Mechanism")
        plt.title(f"Mechanism Contributions to {reaction} Fusion Enhancement")
        plt.xticks(rotation=45, ha="right")
        
        # Add values on bars
        for bar, value in zip(bars, sorted_contributions):
            plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                    f"{value:.1f}%", ha="center", va="bottom")
    
    plt.tight_layout()
    
    # Save the figure
    plt.savefig(output_dir / "fusion_mechanism_analysis.png")
    logger.info(f"Plot saved to {output_dir / 'fusion_mechanism_analysis.png'}")
    
    return result


def test_optimal_conditions():
    """Test optimization of conditions for fusion."""
    logger.info("Testing optimization of conditions...")
    
    # Test reaction
    reaction = "d-d"
    
    # Temperature and density ranges
    temp_range = (300.0, 1000.0)  # K
    density_range = (1e27, 1e29)  # m^-3
    
    # Find optimal conditions
    result = fusion_calculator.optimize_conditions(
        reaction, temp_range, density_range, num_points=15
    )
    
    logger.info(f"Optimal temperature: {result['optimal_temperature']:.2f} K")
    logger.info(f"Optimal density: {result['optimal_density']:.2e} m^-3")
    logger.info(f"Maximum power density: {result['max_power_density']:.2e} W/m^3")
    logger.info(f"Maximum enhancement: {result['max_enhancement']:.2e}")
    
    # Plot the power density heatmap
    plt.figure(figsize=(12, 10))
    
    # Convert to log scale for better visualization
    # Add a small value to avoid log(0)
    power_matrix = np.array(result["power_matrix"])
    log_power = np.log10(power_matrix + 1e-50)
    
    plt.imshow(log_power, aspect='auto', origin='lower', cmap='inferno',
              extent=[np.log10(density_range[0]), np.log10(density_range[1]), 
                     temp_range[0], temp_range[1]])
    
    plt.colorbar(label="log10(Power Density) [W/m^3]")
    plt.ylabel("Temperature (K)")
    plt.xlabel("log10(Density) [m^-3]")
    plt.title(f"Power Density for {reaction} Fusion")
    
    # Mark the optimal point
    opt_temp = result["optimal_temperature"]
    opt_density = result["optimal_density"]
    plt.scatter([np.log10(opt_density)], [opt_temp], color='white', 
               s=100, marker='*', label=f"Optimal: {opt_temp:.0f}K, {opt_density:.1e}m^-3")
    plt.legend()
    
    plt.tight_layout()
    
    # Save the figure
    plt.savefig(output_dir / "optimal_conditions.png")
    logger.info(f"Plot saved to {output_dir / 'optimal_conditions.png'}")
    
    return result


def save_results(results: Dict[str, Any], filename: str):
    """Save test results to a JSON file."""
    # Convert numpy arrays to lists for JSON serialization
    def convert_to_serializable(obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {k: convert_to_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_to_serializable(item) for item in obj]
        else:
            return obj
    
    serializable_results = convert_to_serializable(results)
    
    with open(output_dir / filename, 'w') as f:
        json.dump(serializable_results, f, indent=2)
    
    logger.info(f"Results saved to {output_dir / filename}")


def run_all_tests():
    """Run all tests and save results."""
    logger.info("Starting tests of the Unified LENR Theory implementation...")
    
    # Run tests
    test_results = {
        "individual_mechanisms": test_enhancement_mechanisms(),
        "combined_enhancement": test_combined_enhancement(),
        "material_enhancement": test_material_enhancement(),
        "parameter_sensitivity": test_parameter_sensitivity(),
        "fusion_reactions": test_fusion_reactions(),
        "mechanism_analysis": test_mechanism_analysis(),
        "optimal_conditions": test_optimal_conditions()
    }
    
    # Save all results
    save_results(test_results, "unified_theory_test_results.json")
    
    logger.info("All tests completed successfully!")
    
    return test_results


if __name__ == "__main__":
    run_all_tests()
    plt.close('all')  # Close all matplotlib figures 