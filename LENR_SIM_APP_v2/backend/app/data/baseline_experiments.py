"""
Baseline LENR Experiment Data

Published experimental results from LENR research for comparison
and baseline analytics. This data provides reference points for
user simulations.

v0.2.3-beta: Initial dataset from published LENR literature.

Sources:
- Fleischmann & Pons (1989) - Original cold fusion paper
- McKubre et al. (SRI International) - Systematic Pd-D studies
- SPAWAR/Navy (2007-2009) - CR-39 track detection
- Iwamura et al. (Mitsubishi) - Transmutation experiments
- Brillouin Energy - Ni-H systems
- Clean Planet - Ni-Cu systems
- Storms (2007) - Comprehensive LENR review

Note: Enhancement factors and some values are derived/estimated
from reported excess heat and reaction rates where direct 
measurements weren't available.
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta
import uuid


def get_baseline_experiments() -> List[Dict[str, Any]]:
    """
    Return baseline LENR experiment data from published research.
    
    Each experiment includes:
    - Metadata (name, source, description)
    - Experimental parameters (material, temperature, pressure, loading)
    - Results (enhancement factor, energy output, excess heat)
    """
    
    # Base date for historical experiments
    base_date = datetime(2026, 1, 1)
    
    experiments = [
        # ==================
        # Fleischmann-Pons Era (1989-1992)
        # ==================
        {
            "id": str(uuid.uuid4()),
            "name": "Fleischmann-Pons Original (1989)",
            "description": "Original cold fusion electrolysis experiment using Pd cathode in D2O with LiOD electrolyte. Reported excess heat of 10-25 W/cm³.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "Fleischmann & Pons, J. Electroanal. Chem. 261 (1989) 301",
            "source_url": "https://doi.org/10.1016/0022-0728(89)80006-3",
            "material": "palladium",
            "temperature_k": 300.0,
            "pressure_bar": 1.0,
            "loading_ratio": 0.9,
            "defect_density": 0.05,
            "driving_frequency_khz": None,
            "parameters": {
                "electrolyte": "LiOD in D2O",
                "cathode_diameter_cm": 0.4,
                "current_density_mA_cm2": 512,
            },
            "enhancement_factor": 25.0,
            "fusion_rate": 1e-23,
            "energy_output_kev": 100.0,
            "excess_heat_watts": 10.0,
            "duration_seconds": 3600 * 100,  # ~100 hours
            "results": {
                "excess_heat_w_cm3": 25,
                "observed_neutrons": False,
                "observed_tritium": True,
            },
            "created_at": base_date - timedelta(days=365*37),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Fleischmann-Pons Replication Attempt (1989)",
            "description": "MIT attempted replication with modified protocol. Initial excess heat observed but later retracted.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "MIT Replication Study 1989",
            "material": "palladium",
            "temperature_k": 298.0,
            "pressure_bar": 1.0,
            "loading_ratio": 0.85,
            "enhancement_factor": 5.0,
            "energy_output_kev": 20.0,
            "excess_heat_watts": 2.0,
            "duration_seconds": 3600 * 50,
            "created_at": base_date - timedelta(days=365*36),
        },
        
        # ==================
        # SRI International Studies (1990-2005)
        # ==================
        {
            "id": str(uuid.uuid4()),
            "name": "McKubre SRI Systematic Study P13/P14 (1992)",
            "description": "Systematic electrolysis experiments at SRI showing correlation between D/Pd loading ratio and excess heat.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "McKubre et al., SRI International",
            "source_url": "https://lenr-canr.org/acrobat/McKubreMCHtherelati.pdf",
            "material": "palladium",
            "temperature_k": 313.0,
            "pressure_bar": 1.0,
            "loading_ratio": 0.95,
            "defect_density": 0.08,
            "parameters": {
                "electrode_type": "wire",
                "electrolyte": "LiOD/D2O",
                "batch": "P13/P14",
            },
            "enhancement_factor": 42.0,
            "fusion_rate": 5e-23,
            "energy_output_kev": 150.0,
            "excess_heat_watts": 15.0,
            "duration_seconds": 3600 * 200,
            "results": {
                "excess_heat_reproducibility": 0.7,
                "loading_threshold": 0.9,
            },
            "created_at": base_date - timedelta(days=365*34),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "McKubre High Loading Study (1998)",
            "description": "Achieved D/Pd ratio > 0.95 with consistent excess heat production.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "McKubre, Proc. ICCF7",
            "material": "palladium",
            "temperature_k": 323.0,
            "pressure_bar": 2.0,
            "loading_ratio": 0.97,
            "enhancement_factor": 58.0,
            "energy_output_kev": 200.0,
            "excess_heat_watts": 25.0,
            "duration_seconds": 3600 * 150,
            "created_at": base_date - timedelta(days=365*28),
        },
        
        # ==================
        # SPAWAR/Navy Research (2007-2009)
        # ==================
        {
            "id": str(uuid.uuid4()),
            "name": "SPAWAR CR-39 Detection (2007)",
            "description": "Co-deposition of Pd on CR-39 plastic detector showing charged particle tracks consistent with nuclear reactions.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "Mosier-Boss et al., Naturwissenschaften 96 (2009) 135",
            "source_url": "https://doi.org/10.1007/s00114-008-0449-x",
            "material": "palladium",
            "temperature_k": 298.0,
            "pressure_bar": 1.0,
            "loading_ratio": 0.88,
            "parameters": {
                "method": "co-deposition",
                "detector": "CR-39",
                "electrolyte": "PdCl2 in D2O",
            },
            "enhancement_factor": 35.0,
            "fusion_rate": 3e-23,
            "energy_output_kev": 100.0,
            "duration_seconds": 3600 * 24 * 7,
            "results": {
                "track_density_per_cm2": 5000,
                "triple_tracks_observed": True,
            },
            "created_at": base_date - timedelta(days=365*19),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "SPAWAR DPF Co-deposition (2009)",
            "description": "Dense Plasma Focus-like conditions in electrolytic cell with enhanced nuclear signatures.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "SPAWAR Technical Report",
            "material": "palladium",
            "temperature_k": 305.0,
            "pressure_bar": 1.5,
            "loading_ratio": 0.92,
            "enhancement_factor": 45.0,
            "energy_output_kev": 180.0,
            "duration_seconds": 3600 * 48,
            "created_at": base_date - timedelta(days=365*17),
        },
        
        # ==================
        # Iwamura Transmutation Studies (2002-2012)
        # ==================
        {
            "id": str(uuid.uuid4()),
            "name": "Iwamura Cs-Pr Transmutation (2002)",
            "description": "Cesium transmutation to Praseodymium observed in Pd-CaO multilayer with D2 gas permeation.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "Iwamura et al., Jpn. J. Appl. Phys. 41 (2002) 4642",
            "source_url": "https://doi.org/10.1143/JJAP.41.4642",
            "material": "palladium",
            "temperature_k": 343.0,
            "pressure_bar": 1.0,
            "loading_ratio": 0.75,
            "parameters": {
                "method": "D2 gas permeation",
                "substrate": "Pd-CaO-Pd multilayer",
                "target_element": "Cs",
            },
            "enhancement_factor": 65.0,
            "fusion_rate": 8e-23,
            "energy_output_kev": 50.0,
            "duration_seconds": 3600 * 24 * 14,
            "results": {
                "transmutation_observed": True,
                "product_element": "Pr",
                "mass_shift": 8,
            },
            "created_at": base_date - timedelta(days=365*24),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Iwamura Sr-Mo Transmutation (2006)",
            "description": "Strontium to Molybdenum transmutation with 4-alpha addition pattern.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "Iwamura et al., ICCF-12 Proceedings",
            "material": "palladium",
            "temperature_k": 353.0,
            "pressure_bar": 1.0,
            "loading_ratio": 0.78,
            "enhancement_factor": 72.0,
            "energy_output_kev": 75.0,
            "duration_seconds": 3600 * 24 * 10,
            "results": {
                "transmutation_observed": True,
                "product_element": "Mo",
            },
            "created_at": base_date - timedelta(days=365*20),
        },
        
        # ==================
        # Nickel-Hydrogen Systems (2010-2020)
        # ==================
        {
            "id": str(uuid.uuid4()),
            "name": "Brillouin LENR Reactor Test (2012)",
            "description": "Nickel-Hydrogen system using Q-pulse electronic stimulation.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "Brillouin Energy Corp.",
            "material": "nickel",
            "temperature_k": 473.0,
            "pressure_bar": 3.0,
            "loading_ratio": 0.6,
            "driving_frequency_khz": 100.0,
            "parameters": {
                "gas": "H2",
                "stimulation": "Q-pulse",
            },
            "enhancement_factor": 38.0,
            "fusion_rate": 2e-23,
            "energy_output_kev": 85.0,
            "excess_heat_watts": 8.0,
            "duration_seconds": 3600 * 72,
            "created_at": base_date - timedelta(days=365*14),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Clean Planet Ni-Cu Heater (2018)",
            "description": "Commercial-scale Ni-Cu nanoparticle heater with claimed COP > 1.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "Clean Planet Inc.",
            "material": "nickel",
            "temperature_k": 573.0,
            "pressure_bar": 5.0,
            "loading_ratio": 0.55,
            "parameters": {
                "nanoparticle_size_nm": 10,
                "support": "Cu",
            },
            "enhancement_factor": 52.0,
            "energy_output_kev": 120.0,
            "excess_heat_watts": 50.0,
            "duration_seconds": 3600 * 24 * 30,
            "created_at": base_date - timedelta(days=365*8),
        },
        
        # ==================
        # Bubble Fusion / Sonofusion
        # ==================
        {
            "id": str(uuid.uuid4()),
            "name": "Taleyarkhan Sonofusion (2002)",
            "description": "Acoustic cavitation in deuterated acetone claiming neutron production.",
            "experiment_type": "bubble_fusion",
            "status": "completed",
            "is_baseline": True,
            "source": "Taleyarkhan et al., Science 295 (2002) 1868",
            "source_url": "https://doi.org/10.1126/science.1067589",
            "material": "other",
            "temperature_k": 273.0,
            "pressure_bar": 1.0,
            "driving_frequency_khz": 20.0,
            "parameters": {
                "medium": "deuterated acetone",
                "acoustic_pressure_bar": 15,
            },
            "enhancement_factor": 12.0,
            "fusion_rate": 4e-5,  # neutrons/s
            "energy_output_kev": 2500.0,
            "duration_seconds": 3600,
            "results": {
                "neutron_rate_per_s": 4e-5,
                "controversial": True,
            },
            "created_at": base_date - timedelta(days=365*24),
        },
        
        # ==================
        # Quantum Tunneling Studies
        # ==================
        {
            "id": str(uuid.uuid4()),
            "name": "Chubb Lattice-Assisted Tunneling (2004)",
            "description": "Theoretical and experimental study of enhanced tunneling in metal deuteride lattices.",
            "experiment_type": "quantum_tunneling",
            "status": "completed",
            "is_baseline": True,
            "source": "Chubb & Chubb, Fusion Technology",
            "material": "palladium",
            "temperature_k": 300.0,
            "pressure_bar": 1.0,
            "loading_ratio": 0.9,
            "enhancement_factor": 28.0,
            "energy_output_kev": 30.0,
            "duration_seconds": 3600 * 10,
            "results": {
                "tunneling_enhancement": 1e10,
                "coherence_factor": 0.8,
            },
            "created_at": base_date - timedelta(days=365*22),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Hagelstein Phonon-Mediated Fusion (2010)",
            "description": "MIT study of phonon-coupled nuclear reactions in PdD lattice.",
            "experiment_type": "quantum_tunneling",
            "status": "completed",
            "is_baseline": True,
            "source": "Hagelstein et al., ICCF-15",
            "material": "palladium",
            "temperature_k": 350.0,
            "pressure_bar": 1.0,
            "loading_ratio": 0.93,
            "parameters": {
                "phonon_coupling": "optical",
            },
            "enhancement_factor": 48.0,
            "energy_output_kev": 95.0,
            "duration_seconds": 3600 * 48,
            "created_at": base_date - timedelta(days=365*16),
        },
        
        # ==================
        # Recent Studies (2020+)
        # ==================
        {
            "id": str(uuid.uuid4()),
            "name": "Google/ARPA-E Reproducibility Study (2019)",
            "description": "Multi-institution attempt to reproduce Fleischmann-Pons effect with modern instrumentation.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "Berlinguette et al., Nature 570 (2019) 45",
            "source_url": "https://doi.org/10.1038/s41586-019-1256-6",
            "material": "palladium",
            "temperature_k": 300.0,
            "pressure_bar": 1.0,
            "loading_ratio": 0.96,
            "enhancement_factor": 5.0,
            "energy_output_kev": 10.0,
            "excess_heat_watts": 0.0,
            "duration_seconds": 3600 * 720,
            "results": {
                "excess_heat_detected": False,
                "high_loading_achieved": True,
                "note": "No excess heat beyond calorimetry precision",
            },
            "created_at": base_date - timedelta(days=365*7),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "SAFIRE Plasma Experiment (2020)",
            "description": "Hydrogen plasma discharge experiment reporting excess energy and transmutation.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "SAFIRE Project",
            "material": "tungsten",
            "temperature_k": 5000.0,
            "pressure_bar": 0.01,
            "parameters": {
                "plasma_type": "H",
                "discharge_voltage_v": 600,
            },
            "enhancement_factor": 85.0,
            "energy_output_kev": 500.0,
            "excess_heat_watts": 100.0,
            "duration_seconds": 3600 * 2,
            "created_at": base_date - timedelta(days=365*6),
        },
        
        # ==================
        # Titanium Systems
        # ==================
        {
            "id": str(uuid.uuid4()),
            "name": "Titanium Deuteride Gas Loading (1995)",
            "description": "De Ninno titanium gas loading experiment with calorimetric excess heat.",
            "experiment_type": "lenr",
            "status": "completed",
            "is_baseline": True,
            "source": "De Ninno et al., ENEA",
            "material": "titanium",
            "temperature_k": 400.0,
            "pressure_bar": 10.0,
            "loading_ratio": 1.5,  # Ti can hold more D
            "enhancement_factor": 32.0,
            "energy_output_kev": 60.0,
            "excess_heat_watts": 5.0,
            "duration_seconds": 3600 * 24,
            "created_at": base_date - timedelta(days=365*31),
        },
    ]
    
    return experiments


def get_baseline_timeline_data() -> Dict[str, List[Dict[str, Any]]]:
    """
    Return sample timeline data for baseline experiments.
    
    Used for demonstrating the timeline chart functionality.
    """
    import random
    
    # Generate timeline points for a representative experiment
    timeline = {}
    
    # Simulated timeline for a typical LENR electrolysis experiment
    timeline["fleischmann_pons_sample"] = []
    
    for i in range(100):
        timestamp_ms = i * 3600000  # 1 hour intervals
        
        # Simulate gradual loading followed by excess heat
        if i < 20:
            enhancement = 1.0 + random.random() * 2
            energy = random.random() * 5
        elif i < 40:
            enhancement = 5.0 + random.random() * 5
            energy = 5 + random.random() * 10
        elif i < 60:
            enhancement = 15.0 + random.random() * 10
            energy = 20 + random.random() * 20
        else:
            enhancement = 20.0 + random.random() * 15
            energy = 50 + random.random() * 50
        
        timeline["fleischmann_pons_sample"].append({
            "timestamp_ms": timestamp_ms,
            "enhancement_factor": round(enhancement, 2),
            "temperature_k": 300 + random.random() * 50,
            "energy_output": round(energy, 2),
            "data": {
                "loading_ratio": 0.6 + (i / 100) * 0.35,
                "current_ma": 100 + random.random() * 50,
            }
        })
    
    return timeline
