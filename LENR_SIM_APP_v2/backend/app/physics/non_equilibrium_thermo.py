"""
Non-Equilibrium Thermodynamics Module

Implements non-equilibrium thermodynamic analysis for LENR systems,
including excess power calculations and entropy production.
"""

import numpy as np
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

# Physical constants
KB = 1.380649e-23  # Boltzmann constant (J/K)
EV_TO_J = 1.602176634e-19  # eV to Joules conversion


class ExcessPowerAnalysis(BaseModel):
    """Results of excess power analysis."""
    input_power: float = Field(description="Input power (W)")
    output_power: float = Field(description="Output power (W)")
    excess_power: float = Field(description="Excess power (W)")
    cop: float = Field(description="Coefficient of performance")
    efficiency: float = Field(description="Energy conversion efficiency")
    energy_balance: Dict[str, float] = Field(description="Energy balance breakdown")
    is_anomalous: bool = Field(description="Whether excess power is detected")


class EnergyBalanceResult(BaseModel):
    """Energy balance calculation result."""
    total_input: float = Field(description="Total input energy (J)")
    total_output: float = Field(description="Total output energy (J)")
    stored_energy: float = Field(description="Energy stored in system (J)")
    dissipated_energy: float = Field(description="Energy dissipated (J)")
    nuclear_energy: float = Field(description="Nuclear energy release (J)")
    balance_error: float = Field(description="Energy balance error (%)")


class EntropyProductionResult(BaseModel):
    """Entropy production calculation result."""
    entropy_rate: float = Field(description="Entropy production rate (W/K)")
    irreversibility: float = Field(description="Degree of irreversibility")
    thermal_entropy: float = Field(description="Thermal entropy contribution")
    chemical_entropy: float = Field(description="Chemical entropy contribution")
    nuclear_entropy: float = Field(description="Nuclear reaction entropy contribution")


def calculate_energy_balance(
    input_power: float,
    temperature: float = 300.0,
    loading_ratio: float = 0.9,
    reaction_rate: float = 0.0,
    duration: float = 1.0,
    **kwargs
) -> EnergyBalanceResult:
    """
    Calculate energy balance for LENR system.
    
    Args:
        input_power: Input electrical power (W)
        temperature: System temperature (K)
        loading_ratio: H/M loading ratio
        reaction_rate: Nuclear reaction rate (reactions/s)
        duration: Time duration for balance (s)
        
    Returns:
        EnergyBalanceResult with energy balance breakdown
    """
    try:
        # Input energy
        total_input = input_power * duration
        
        # Estimated nuclear energy (24 MeV per D+D reaction)
        energy_per_reaction = 24e6 * EV_TO_J  # Joules
        nuclear_energy = reaction_rate * energy_per_reaction * duration
        
        # Thermal losses (simplified model)
        thermal_loss_rate = 0.1 * input_power * (temperature / 300.0)
        dissipated_energy = thermal_loss_rate * duration
        
        # Stored energy in lattice
        stored_energy = 0.05 * total_input * loading_ratio
        
        # Output energy
        total_output = total_input - stored_energy + nuclear_energy - dissipated_energy
        
        # Balance error
        energy_in = total_input + nuclear_energy
        energy_out = total_output + dissipated_energy + stored_energy
        balance_error = abs(energy_in - energy_out) / max(energy_in, 1e-20) * 100
        
        return EnergyBalanceResult(
            total_input=float(total_input),
            total_output=float(total_output),
            stored_energy=float(stored_energy),
            dissipated_energy=float(dissipated_energy),
            nuclear_energy=float(nuclear_energy),
            balance_error=float(balance_error)
        )
        
    except Exception as e:
        logger.error(f"Error in energy balance calculation: {e}")
        return EnergyBalanceResult(
            total_input=0.0,
            total_output=0.0,
            stored_energy=0.0,
            dissipated_energy=0.0,
            nuclear_energy=0.0,
            balance_error=100.0
        )


def excess_power_analysis(
    input_power: float,
    measured_output: float,
    temperature: float = 300.0,
    reaction_rate: float = 0.0,
    **kwargs
) -> ExcessPowerAnalysis:
    """
    Analyze excess power in LENR experiment.
    
    Args:
        input_power: Input electrical power (W)
        measured_output: Measured thermal output (W)
        temperature: System temperature (K)
        reaction_rate: Estimated nuclear reaction rate
        
    Returns:
        ExcessPowerAnalysis with detailed power analysis
    """
    try:
        # Calculate excess power
        excess = measured_output - input_power
        
        # COP (Coefficient of Performance)
        cop = measured_output / input_power if input_power > 0 else 0.0
        
        # Efficiency (excess/input)
        efficiency = excess / input_power if input_power > 0 else 0.0
        
        # Energy balance breakdown
        nuclear_power = reaction_rate * 24e6 * EV_TO_J if reaction_rate > 0 else 0.0
        thermal_losses = 0.05 * input_power * (temperature / 300.0)
        
        energy_balance = {
            "electrical_input": float(input_power),
            "nuclear_contribution": float(nuclear_power),
            "thermal_losses": float(thermal_losses),
            "measured_output": float(measured_output),
            "unaccounted": float(excess - nuclear_power)
        }
        
        # Anomalous detection threshold (>5% excess)
        is_anomalous = excess > 0.05 * input_power and cop > 1.05
        
        return ExcessPowerAnalysis(
            input_power=float(input_power),
            output_power=float(measured_output),
            excess_power=float(excess),
            cop=float(cop),
            efficiency=float(efficiency),
            energy_balance=energy_balance,
            is_anomalous=is_anomalous
        )
        
    except Exception as e:
        logger.error(f"Error in excess power analysis: {e}")
        return ExcessPowerAnalysis(
            input_power=float(input_power),
            output_power=float(input_power),
            excess_power=0.0,
            cop=1.0,
            efficiency=0.0,
            energy_balance={},
            is_anomalous=False
        )


def entropy_production_rate(
    temperature: float = 300.0,
    temperature_gradient: float = 0.0,
    reaction_rate: float = 0.0,
    loading_rate: float = 0.0,
    **kwargs
) -> EntropyProductionResult:
    """
    Calculate entropy production rate for non-equilibrium system.
    
    Args:
        temperature: System temperature (K)
        temperature_gradient: Temperature gradient (K/m)
        reaction_rate: Nuclear reaction rate (reactions/s)
        loading_rate: Hydrogen loading rate (mol/s)
        
    Returns:
        EntropyProductionResult with entropy breakdown
    """
    try:
        # Thermal entropy production (Fourier law)
        # σ_thermal = κ(∇T)²/T²
        thermal_conductivity = 70.0  # W/(m·K) for Pd
        thermal_entropy = thermal_conductivity * temperature_gradient**2 / (temperature**2) if temperature > 0 else 0.0
        
        # Chemical entropy from loading
        # σ_chem = Σ J_i * ∇(μ_i/T)
        chemical_potential_gradient = 0.1 * loading_rate  # Simplified
        chemical_entropy = abs(loading_rate * chemical_potential_gradient / temperature) if temperature > 0 else 0.0
        
        # Nuclear entropy (change in nuclear configuration)
        # Each reaction changes nuclear entropy
        nuclear_entropy = reaction_rate * KB * np.log(2) if reaction_rate > 0 else 0.0  # ln(2) for binary outcome
        
        # Total entropy production rate
        total_entropy_rate = thermal_entropy + chemical_entropy + nuclear_entropy
        
        # Irreversibility measure (0 = reversible, 1 = highly irreversible)
        max_entropy = KB * temperature  # Reference scale
        irreversibility = min(1.0, total_entropy_rate / max_entropy) if max_entropy > 0 else 0.0
        
        return EntropyProductionResult(
            entropy_rate=float(total_entropy_rate),
            irreversibility=float(irreversibility),
            thermal_entropy=float(thermal_entropy),
            chemical_entropy=float(chemical_entropy),
            nuclear_entropy=float(nuclear_entropy)
        )
        
    except Exception as e:
        logger.error(f"Error in entropy production calculation: {e}")
        return EntropyProductionResult(
            entropy_rate=0.0,
            irreversibility=0.0,
            thermal_entropy=0.0,
            chemical_entropy=0.0,
            nuclear_entropy=0.0
        )

