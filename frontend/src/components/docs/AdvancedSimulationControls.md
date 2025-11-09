# Advanced Simulation Controls Documentation

This document provides detailed information about the advanced controls available in the LENR Simulation application. These controls enable precise configuration, management, and analysis of LENR physics simulations.

## 1. Physics Model Selection

The Physics Model Selection system allows users to choose from various LENR physics models that implement different theoretical approaches to low-energy nuclear reactions.

### Features

- **Model Categorization**: Models are organized by categories (quantum, classical, hybrid, statistical, molecular, lattice)
- **Compatibility Checking**: Real-time validation of model compatibility with current simulation parameters
- **Model Information**: Detailed descriptions, complexity ratings, and scientific references for each model
- **Parameter Adoption**: Automatic application of model-specific parameter values when selecting a model

### Usage

1. Open the Physics Model Selection panel in the Simulation Control Panel
2. Browse available models, grouped by category
3. View compatibility status indicated by icons (✓ compatible, ✗ incompatible)
4. Select a model to see detailed information, including description and references
5. Click on a model to apply it to the current simulation configuration

### Examples

- Select the "Basic Quantum Tunneling Model" for straightforward deuterium tunneling simulations
- Use the "Phonon-Deuterium Coupling Model" to explore lattice phonon effects
- Choose the "Hybrid Quantum-Statistical Model" for more comprehensive simulations combining multiple approaches

## 2. Simulation Speed Controls

The Simulation Speed Controls allow adjustment of simulation execution speed, balancing between real-time visualization and computational performance.

### Features

- **Adjustable Speed**: Control simulation speed from 1x (real-time) to 10x acceleration
- **Speed Presets**: Quick buttons for common speed settings (1x, 5x, 10x)
- **Max Speed Mode**: Option to disable visualization updates for maximum computational throughput
- **Dynamic Adjustment**: Change simulation speed during execution without restarting

### Usage

1. Start a simulation to enable the speed controls
2. Use the slider to select a speed between 1x and 10x
3. Use the speed buttons for quick increments/decrements
4. Toggle "Max Speed Mode" for maximum simulation performance when visualization isn't needed

### Examples

- Use 1x speed when carefully observing reaction dynamics in the visualization
- Use 5x speed for general testing and parameter tuning
- Enable Max Speed Mode when running extended simulations or parameter sweeps

## 3. Ensemble Run Configuration

The Ensemble Run Configuration enables running multiple simulations with parameter variations to understand how different factors affect LENR outcomes.

### Features

- **Parameter Selection**: Choose which parameters to vary in the ensemble
- **Range Configuration**: Set min/max values and step count for each parameter
- **Multi-dimensional Analysis**: Vary multiple parameters simultaneously
- **Run Count Estimation**: See the total number of simulations that will be executed
- **Results Correlation**: Compare results across parameter variations

### Usage

1. Toggle "Enable Ensemble Mode" to access ensemble configuration
2. Select parameters to vary by clicking on parameter chips
3. For each selected parameter, configure the min value, max value, and number of steps
4. Review the total simulation count in the summary
5. Click "Run Ensemble" to start the ensemble simulation

### Notes

- Large ensembles (>50 simulations) may take significant time to complete
- Results from ensemble runs can be analyzed in the Results Comparison view
- At least one parameter with multiple steps is required to create a valid ensemble

## 4. Simulation Snapshot System

The Simulation Snapshot System allows saving and restoring simulation configurations for reproducibility, sharing, and comparison.

### Features

- **Configuration Snapshots**: Save the complete state of simulation parameters
- **Snapshot Management**: Name, organize, and annotate saved configurations
- **Export/Import**: Share configurations with other users via JSON files
- **Quick Restore**: Rapidly switch between different simulation setups

### Usage

1. Configure simulation parameters as desired
2. Click "Create Snapshot" to save the current configuration
3. Provide a name and optional notes for the snapshot
4. View saved snapshots in the snapshot list
5. Use "Restore" to apply a saved configuration
6. Use "Export" to download a snapshot as a JSON file
7. Use "Import" to load a snapshot from a JSON file

### Examples

- Save successful simulation configurations for later reproduction
- Create snapshots before making experimental parameter changes
- Share optimized configurations with collaborators
- Build a library of baseline configurations for different LENR scenarios

---

## General Tips for Advanced Controls

- **Parameter Dependencies**: Some models may require specific parameters to be set within certain ranges
- **Performance Considerations**: Higher simulation speeds and ensemble runs require more computational resources
- **Snapshot Organization**: Use descriptive names and notes for snapshots to maintain organization
- **Iterative Approach**: Use snapshots to save promising configurations, then make incremental changes
- **Data Export**: Ensemble results and snapshot configurations can be exported for external analysis

## Troubleshooting

- **Model Compatibility Issues**: Hover over compatibility indicators to see specific requirements
- **Ensemble Size Warnings**: Reduce parameter ranges or step counts if ensemble size is too large
- **Snapshot Import Errors**: Ensure JSON files follow the correct snapshot format structure
- **Performance Issues**: Reduce visualization quality or use Max Speed Mode for better performance 