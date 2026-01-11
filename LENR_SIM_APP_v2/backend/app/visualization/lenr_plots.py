"""
LENR Visualization Module for LENR_Sim_App

This module provides tools for visualizing LENR simulation results,
including reaction rates, enhancement factors, potentials, and more.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.figure import Figure
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from io import BytesIO
import base64
from typing import Dict, List, Tuple, Any, Optional, Union
import json
import logging
from datetime import datetime

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("lenr_plots", "logs/visualization.log")


def generate_reaction_rate_plot(
    energy_scan_result: Dict[str, Any],
    title: Optional[str] = None,
    log_scale: bool = True,
    include_base_probability: bool = False,
    include_enhancement: bool = True,
    include_power: bool = True,
    dpi: int = 100,
    figure_size: Tuple[float, float] = (10, 6)
) -> str:
    """
    Generate a plot of reaction rates and related data from energy scan results
    
    Args:
        energy_scan_result: Result from simulate_reaction_energy_scan
        title: Plot title (optional)
        log_scale: Whether to use logarithmic scales
        include_base_probability: Whether to include base tunneling probability
        include_enhancement: Whether to include enhancement factor
        include_power: Whether to include power density
        dpi: Resolution of the plot
        figure_size: Size of the plot in inches
        
    Returns:
        Base64-encoded PNG image
    """
    # Extract data
    energy_kev = np.array(energy_scan_result["energy_scan"]["energy_kev"])
    reaction_rate = np.array(energy_scan_result["energy_scan"]["reaction_rate_m3_s"])
    
    # Create figure
    fig = Figure(figsize=figure_size, dpi=dpi)
    canvas = FigureCanvas(fig)
    ax = fig.add_subplot(111)
    
    # Plot reaction rate
    ax.plot(energy_kev, reaction_rate, "b-", linewidth=2, label="Reaction Rate (m⁻³s⁻¹)")
    
    # Add power density if requested
    if include_power:
        power_density = np.array(energy_scan_result["energy_scan"]["power_density_w_m3"])
        ax2 = ax.twinx()
        ax2.plot(energy_kev, power_density, "r-", linewidth=2, label="Power Density (W/m³)")
        ax2.set_ylabel("Power Density (W/m³)", color="r")
        ax2.tick_params(axis="y", labelcolor="r")
        
        if log_scale:
            # Handle zeros in power density
            power_density[power_density <= 0] = np.min(power_density[power_density > 0]) / 10
            ax2.set_yscale("log")
    
    # Add enhancement factor if requested
    if include_enhancement:
        enhancement = np.array(energy_scan_result["energy_scan"]["enhancement_factor"])
        ax3 = ax.twinx()
        
        # Offset the second y-axis to the right
        ax3.spines["right"].set_position(("outward", 60))
        
        ax3.plot(energy_kev, enhancement, "g-", linewidth=2, label="Enhancement Factor")
        ax3.set_ylabel("Enhancement Factor", color="g")
        ax3.tick_params(axis="y", labelcolor="g")
        
        if log_scale:
            # Handle zeros or negative values
            enhancement[enhancement <= 0] = 1.0
            ax3.set_yscale("log")
    
    # Add base probability if requested
    if include_base_probability:
        base_prob = np.array(energy_scan_result["energy_scan"]["base_probability"])
        ax4 = ax.twinx()
        
        # Offset the third y-axis to the right
        ax4.spines["right"].set_position(("outward", 120))
        
        ax4.plot(energy_kev, base_prob, "y-", linewidth=2, label="Base Probability")
        ax4.set_ylabel("Base Probability", color="y")
        ax4.tick_params(axis="y", labelcolor="y")
        
        if log_scale:
            # Handle zeros in base probability
            base_prob[base_prob <= 0] = np.min(base_prob[base_prob > 0]) / 10 if np.any(base_prob > 0) else 1e-100
            ax4.set_yscale("log")
    
    # Set x-axis to log scale if requested
    if log_scale:
        ax.set_xscale("log")
        ax.set_yscale("log")
    
    # Set labels
    ax.set_xlabel("Energy (keV)")
    ax.set_ylabel("Reaction Rate (m⁻³s⁻¹)")
    
    # Set title
    if title is None:
        reaction_name = energy_scan_result["reaction_info"]["name"]
        title = f"Reaction Analysis for {reaction_name}"
    ax.set_title(title)
    
    # Add grid
    ax.grid(True, linestyle="--", alpha=0.6)
    
    # Mark peak values
    peak_rate_energy = energy_scan_result["peak_values"]["peak_rate_energy_kev"]
    peak_rate = energy_scan_result["peak_values"]["peak_rate_m3_s"]
    ax.scatter([peak_rate_energy], [peak_rate], color="b", s=100, marker="*", 
               label=f"Peak Rate: {peak_rate:.2e} m⁻³s⁻¹ at {peak_rate_energy:.2f} keV")
    
    if include_power:
        peak_power_energy = energy_scan_result["peak_values"]["peak_power_energy_kev"]
        peak_power = energy_scan_result["peak_values"]["peak_power_density_w_m3"]
        ax2.scatter([peak_power_energy], [peak_power], color="r", s=100, marker="*",
                   label=f"Peak Power: {peak_power:.2e} W/m³ at {peak_power_energy:.2f} keV")
    
    # Add legend
    lines, labels = ax.get_legend_handles_labels()
    if include_power:
        lines2, labels2 = ax2.get_legend_handles_labels()
        lines += lines2
        labels += labels2
    if include_enhancement:
        lines3, labels3 = ax3.get_legend_handles_labels()
        lines += lines3
        labels += labels3
    if include_base_probability:
        lines4, labels4 = ax4.get_legend_handles_labels()
        lines += lines4
        labels += labels4
    
    ax.legend(lines, labels, loc="upper center", bbox_to_anchor=(0.5, -0.15), ncol=2)
    
    # Adjust layout
    fig.tight_layout()
    
    # Save plot to BytesIO object
    buf = BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    data = base64.b64encode(buf.getbuffer()).decode("ascii")
    
    return data


def generate_potential_plot(
    potential_data: Dict[str, Any],
    title: Optional[str] = None,
    include_components: bool = True,
    distance_range: Optional[Tuple[float, float]] = None,
    dpi: int = 100,
    figure_size: Tuple[float, float] = (8, 6)
) -> str:
    """
    Generate a plot of potential energy curves for LENR reactions
    
    Args:
        potential_data: Potential energy data (from simulation results)
        title: Plot title (optional)
        include_components: Whether to include component potentials
        distance_range: Range of distances to plot (in m)
        dpi: Resolution of the plot
        figure_size: Size of the plot in inches
        
    Returns:
        Base64-encoded PNG image
    """
    # Create distance array
    if distance_range is None:
        barrier_width = potential_data.get("barrier_width_m", 1e-10)
        # Plot from 0.1x to 10x barrier width
        distance_min = 0.1 * barrier_width
        distance_max = 10 * barrier_width
    else:
        distance_min, distance_max = distance_range
    
    distances = np.logspace(np.log10(distance_min), np.log10(distance_max), 1000)
    
    # Create figure
    fig = Figure(figsize=figure_size, dpi=dpi)
    canvas = FigureCanvas(fig)
    ax = fig.add_subplot(111)
    
    # Extract data
    barrier_height = potential_data.get("barrier_height_ev", 0.0)
    coulomb_potential = potential_data.get("coulomb_potential_ev", 0.0)
    nuclear_potential = potential_data.get("nuclear_potential_ev", 0.0)
    
    # Check if we have LENR-specific lattice potential data
    has_lenr_potential = "lenr_lattice_potential" in potential_data
    
    # Calculate Coulomb potential curve
    z1 = potential_data.get("z1", 1)
    z2 = potential_data.get("z2", 1)
    if z1 is None or z2 is None:
        # Try to get from reaction_info if available
        reaction_info = potential_data.get("reaction_info", {})
        projectile = reaction_info.get("projectile", {})
        target = reaction_info.get("target", {})
        z1 = projectile.get("z", 1)
        z2 = target.get("z", 1)
    
    # Coulomb potential: V(r) = k*q1*q2/r
    k = 1.44  # eV·nm for elementary charges
    coulomb_curve = k * z1 * z2 / (distances * 1e9)  # Convert m to nm for k
    
    # Plot Coulomb potential
    ax.plot(distances, coulomb_curve, "r-", linewidth=2, label="Coulomb Potential")
    
    # If we have LENR lattice potential, plot total potential with screening
    if has_lenr_potential:
        # Simplified model of screened potential
        lenr_data = potential_data["lenr_lattice_potential"]
        reduction_factor = lenr_data.get("reduction_factor", 0.0)
        screening_length = 5e-11  # Typical screening length
        
        # Screened potential: V(r) = k*q1*q2/r * exp(-r/λ)
        screened_curve = coulomb_curve * np.exp(-distances / screening_length)
        
        # Plot screened potential
        ax.plot(distances, screened_curve, "g-", linewidth=2, label="Screened Potential")
        
        # Approximate nuclear attraction with simple square well
        nuclear_radius = 1.25e-15 * ((z1*2)**(1/3) + (z2*2)**(1/3))  # Approximate
        nuclear_well_depth = -50  # MeV
        nuclear_curve = np.zeros_like(distances)
        nuclear_mask = distances <= nuclear_radius
        nuclear_curve[nuclear_mask] = nuclear_well_depth * 1e6  # Convert to eV
        
        # Only plot if include_components is True
        if include_components:
            ax.plot(distances, nuclear_curve, "b-", linewidth=2, label="Nuclear Potential")
            
            # Total potential (sum of screened and nuclear)
            # Only valid outside nucleus for our simplified model
            total_curve = np.copy(screened_curve)
            total_curve[nuclear_mask] = nuclear_curve[nuclear_mask]
            
            ax.plot(distances, total_curve, "k--", linewidth=3, label="Total Potential")
    
    # Set scales
    ax.set_xscale("log")
    
    # Set axis labels
    ax.set_xlabel("Distance (m)")
    ax.set_ylabel("Potential Energy (eV)")
    
    # Set title
    if title is None:
        title = "Potential Energy Curves for LENR Reaction"
    ax.set_title(title)
    
    # Add grid
    ax.grid(True, linestyle="--", alpha=0.6)
    
    # Mark the barrier width
    barrier_width = potential_data.get("barrier_width_m", 1e-10)
    ax.axvline(x=barrier_width, color="k", linestyle=":", alpha=0.6,
              label=f"Barrier Width = {barrier_width:.2e} m")
    
    # Add legend
    ax.legend(loc="best")
    
    # Adjust layout
    fig.tight_layout()
    
    # Save plot to BytesIO object
    buf = BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    data = base64.b64encode(buf.getbuffer()).decode("ascii")
    
    return data


def generate_enhancement_factors_plot(
    enhancement_data: Dict[str, Any],
    title: Optional[str] = None,
    use_log_scale: bool = True,
    dpi: int = 100,
    figure_size: Tuple[float, float] = (10, 6)
) -> str:
    """
    Generate a bar chart of enhancement factors for LENR mechanisms
    
    Args:
        enhancement_data: Enhancement factor data (from simulation results)
        title: Plot title (optional)
        use_log_scale: Whether to use logarithmic scale for enhancement values
        dpi: Resolution of the plot
        figure_size: Size of the plot in inches
        
    Returns:
        Base64-encoded PNG image
    """
    # Extract data
    individual_factors = enhancement_data.get("individual_factors", {})
    
    # Filter out aggregated values
    if "total" in individual_factors:
        del individual_factors["total"]
    if "log_enhancement" in individual_factors:
        del individual_factors["log_enhancement"]
    
    # Create sorted lists of mechanisms and values
    mechanisms = []
    values = []
    
    # Sort by value (descending)
    for mechanism, value in sorted(individual_factors.items(), key=lambda x: x[1], reverse=True):
        # Skip factors that are exactly 1.0 (no enhancement)
        if value > 1.0001:
            # Format mechanism name for display
            mechanism_formatted = mechanism.replace("_", " ").title()
            mechanisms.append(mechanism_formatted)
            values.append(value)
    
    # Create figure
    fig = Figure(figsize=figure_size, dpi=dpi)
    canvas = FigureCanvas(fig)
    ax = fig.add_subplot(111)
    
    # Plot horizontal bar chart
    colors = plt.cm.viridis(np.linspace(0, 0.9, len(mechanisms)))
    bars = ax.barh(mechanisms, values, color=colors)
    
    # Add value labels
    for i, bar in enumerate(bars):
        value = values[i]
        if value >= 1e6:
            label = f"{value:.1e}"
        elif value >= 1e3:
            label = f"{value:.0f}"
        else:
            label = f"{value:.2f}"
            
        ax.text(
            value * 1.05,  # x position
            bar.get_y() + bar.get_height()/2,  # y position
            label,
            va="center",
            fontsize=9,
            fontweight="bold"
        )
    
    # Set y-axis
    ax.set_yticks(range(len(mechanisms)))
    ax.set_yticklabels(mechanisms)
    
    # Set x-axis scale
    if use_log_scale:
        ax.set_xscale("log")
    
    # Set axis labels
    ax.set_xlabel("Enhancement Factor (dimensionless)")
    
    # Add total enhancement
    total_enhancement = enhancement_data.get("unified_total", 1.0)
    if total_enhancement is None:
        total_enhancement = enhancement_data.get("total_enhancement_factor", 1.0)
    
    if total_enhancement > 1.0:
        # Add text with total enhancement
        log_enhancement = enhancement_data.get("log_unified_total", 0.0)
        if log_enhancement is None:
            log_enhancement = enhancement_data.get("log_enhancement", 0.0)
            
        if log_enhancement >= 1.0:
            # Format as 10^X for large values
            total_label = f"Total Enhancement: 10^{log_enhancement:.1f}"
        else:
            # Format as regular number for small values
            total_label = f"Total Enhancement: {total_enhancement:.2f}"
            
        fig.text(0.5, 0.02, total_label, ha="center", fontsize=12, fontweight="bold")
    
    # Set title
    if title is None:
        title = "Enhancement Factors for LENR Mechanisms"
    ax.set_title(title)
    
    # Add grid
    ax.grid(True, axis="x", linestyle="--", alpha=0.6)
    
    # Adjust layout
    fig.tight_layout(rect=[0, 0.05, 1, 0.95])  # Make room for total enhancement text
    
    # Save plot to BytesIO object
    buf = BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    data = base64.b64encode(buf.getbuffer()).decode("ascii")
    
    return data


def generate_parameter_sensitivity_plot(
    sensitivity_data: Dict[str, Any],
    title: Optional[str] = None,
    plot_type: str = "power",  # "power", "rate", "probability", or "enhancement"
    use_log_scale: bool = True,
    dpi: int = 100,
    figure_size: Tuple[float, float] = (10, 6)
) -> str:
    """
    Generate a plot showing sensitivity of results to parameter variations
    
    Args:
        sensitivity_data: Parameter sensitivity data
        title: Plot title (optional)
        plot_type: Type of data to plot ("power", "rate", "probability", or "enhancement")
        use_log_scale: Whether to use logarithmic scales
        dpi: Resolution of the plot
        figure_size: Size of the plot in inches
        
    Returns:
        Base64-encoded PNG image
    """
    # Extract data
    parameter = sensitivity_data["parameter"]
    values = np.array(sensitivity_data["values"])
    
    # Format parameter name for display
    parameter_formatted = parameter.replace("_", " ").title()
    
    # Get the data to plot based on plot_type
    if plot_type == "power":
        y_data = np.array(sensitivity_data["results"]["power_density_w_m3"])
        y_label = "Power Density (W/m³)"
        y_color = "r"
    elif plot_type == "rate":
        y_data = np.array(sensitivity_data["results"]["reaction_rate_m3_s"])
        y_label = "Reaction Rate (m⁻³s⁻¹)"
        y_color = "b"
    elif plot_type == "probability":
        y_data = np.array(sensitivity_data["results"]["enhanced_probability"])
        y_label = "Enhanced Tunneling Probability"
        y_color = "g"
    elif plot_type == "enhancement":
        y_data = np.array(sensitivity_data["results"]["enhancement_factor"])
        y_label = "Enhancement Factor"
        y_color = "purple"
    else:
        # Default to power
        y_data = np.array(sensitivity_data["results"]["power_density_w_m3"])
        y_label = "Power Density (W/m³)"
        y_color = "r"
    
    # Create figure
    fig = Figure(figsize=figure_size, dpi=dpi)
    canvas = FigureCanvas(fig)
    ax = fig.add_subplot(111)
    
    # Plot data
    ax.plot(values, y_data, f"{y_color}-o", linewidth=2, markersize=8)
    
    # Set scales
    if use_log_scale:
        # Check if parameter values span multiple orders of magnitude
        if max(values) / min(values) > 10:
            ax.set_xscale("log")
        
        # For y-axis, ensure no zero or negative values
        if np.any(y_data <= 0):
            # Find minimum positive value
            min_positive = np.min(y_data[y_data > 0]) if np.any(y_data > 0) else 1e-10
            # Replace zeros and negatives with a fraction of minimum
            y_data_plot = y_data.copy()
            y_data_plot[y_data_plot <= 0] = min_positive * 0.1
            ax.plot(values, y_data_plot, f"{y_color}-o", linewidth=2, markersize=8)
            ax.set_yscale("log")
        else:
            ax.set_yscale("log")
    
    # Set axis labels
    ax.set_xlabel(parameter_formatted)
    ax.set_ylabel(y_label, color=y_color)
    ax.tick_params(axis="y", labelcolor=y_color)
    
    # Find and mark the peak
    peak_index = np.argmax(y_data)
    peak_x = values[peak_index]
    peak_y = y_data[peak_index]
    
    ax.scatter([peak_x], [peak_y], color=y_color, s=150, marker="*",
              label=f"Peak: {peak_y:.2e} at {parameter_formatted}={peak_x}")
    
    # Calculate percent change for doubling parameter
    # Find the closest value to the middle of the range
    mid_index = len(values) // 2
    
    # If we have enough points, calculate change from doubling/halving
    if len(values) >= 3:
        # Try to find index where value is approximately 2x the mid value
        doubled_value = values[mid_index] * 2
        doubled_index = np.argmin(np.abs(values - doubled_value))
        
        # Ensure the doubled index exists and is different from mid_index
        if doubled_index != mid_index and doubled_index < len(values):
            percent_change = (y_data[doubled_index] / y_data[mid_index] - 1) * 100
            change_text = f"Doubling {parameter_formatted} from {values[mid_index]} to {values[doubled_index]}"
            change_text += f"\nchanges {y_label.split('(')[0].strip()} by {percent_change:.1f}%"
            
            # Add text to plot
            text_x = 0.5
            text_y = 0.02
            fig.text(text_x, text_y, change_text, ha="center", fontsize=10)
    
    # Set title
    if title is None:
        reaction_name = sensitivity_data["reaction_info"]["name"]
        energy_kev = sensitivity_data["energy_kev"]
        title = f"{y_label} vs {parameter_formatted} for {reaction_name} at {energy_kev} keV"
    ax.set_title(title)
    
    # Add grid
    ax.grid(True, linestyle="--", alpha=0.6)
    
    # Add legend
    ax.legend(loc="best")
    
    # Adjust layout
    fig.tight_layout(rect=[0, 0.08, 1, 0.95])  # Make room for text at bottom
    
    # Save plot to BytesIO object
    buf = BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    data = base64.b64encode(buf.getbuffer()).decode("ascii")
    
    return data


def generate_multiple_plots(simulation_result: Dict[str, Any]) -> Dict[str, str]:
    """
    Generate multiple plots from a complete simulation result
    
    Args:
        simulation_result: Result from simulation
        
    Returns:
        Dictionary of base64-encoded PNG images
    """
    plots = {}
    
    # Check if this is an energy scan result
    if "energy_scan" in simulation_result:
        # Generate reaction rate plot
        plots["reaction_rate"] = generate_reaction_rate_plot(
            simulation_result,
            title=f"Reaction Analysis for {simulation_result['reaction_info']['name']}",
            log_scale=True,
            include_base_probability=True,
            include_enhancement=True,
            include_power=True
        )
    
    # Check if this is a single-energy simulation result
    elif "reaction" in simulation_result and "tunneling" in simulation_result:
        # Extract enhancement data
        enhancement_data = simulation_result.get("enhancement", {})
        
        # Generate enhancement factors plot
        plots["enhancement_factors"] = generate_enhancement_factors_plot(
            enhancement_data,
            title=f"Enhancement Factors for {simulation_result['reaction']['name']}",
            use_log_scale=True
        )
        
        # Generate potential plot
        potential_data = simulation_result.get("potential", {})
        plots["potential"] = generate_potential_plot(
            potential_data,
            title=f"Potential Curves for {simulation_result['reaction']['name']}",
            include_components=True
        )
    
    # Check if this is a parameter sensitivity result
    elif "parameter" in simulation_result and "results" in simulation_result:
        # Generate power density sensitivity plot
        plots["power_sensitivity"] = generate_parameter_sensitivity_plot(
            simulation_result,
            plot_type="power",
            use_log_scale=True
        )
        
        # Generate enhancement factor sensitivity plot
        plots["enhancement_sensitivity"] = generate_parameter_sensitivity_plot(
            simulation_result,
            plot_type="enhancement",
            use_log_scale=True
        )
    
    return plots 