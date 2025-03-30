# Contributing to LENR Simulation Application

Thank you for considering contributing to the LENR Simulation Application! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Enhancements](#suggesting-enhancements)
   - [Pull Requests](#pull-requests)
3. [Development Setup](#development-setup)
4. [Coding Standards](#coding-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Testing](#testing)
7. [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the issue tracker to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the bug**
- **Explain what you expected to happen and what actually happened**
- **Include screenshots if possible**
- **List your environment details** (OS, browser, Python version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **Include any relevant academic papers or research if applicable**

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure your changes don't break existing functionality
5. Commit your changes with clear commit messages
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

Please refer to the README.md file for instructions on setting up the development environment.

## Coding Standards

### Python

- Follow PEP 8 style guide
- Use type hints
- Write docstrings for all functions, classes, and modules
- Use descriptive variable names
- Limit line length to 88 characters (compatible with Black formatter)

```python
# Example of good Python code
def calculate_tunneling_probability(
    potential_barrier: float, 
    particle_energy: float
) -> float:
    """
    Calculate the quantum tunneling probability.
    
    Args:
        potential_barrier: Height of the potential barrier in eV
        particle_energy: Energy of the particle in eV
        
    Returns:
        Tunneling probability (value between 0 and 1)
    """
    # Implementation
    return probability
```

### JavaScript/React

- Use ES6+ features
- Follow React Hooks patterns
- Use functional components
- Import only what you need
- Use proper PropTypes

```javascript
// Example of good React code
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { calculateValue } from '../utils/math';

const SimulationControl = ({ initialValue, onChange }) => {
  const [value, setValue] = useState(initialValue);
  
  useEffect(() => {
    onChange(value);
  }, [value, onChange]);
  
  return (
    <div className="simulation-control">
      <input 
        type="range" 
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <span>{calculateValue(value)}</span>
    </div>
  );
};

SimulationControl.propTypes = {
  initialValue: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default SimulationControl;
```

## Commit Guidelines

- Use clear and descriptive commit messages
- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Fix bug" not "Fixes bug")
- Reference issues and pull requests where appropriate

## Testing

- Add tests for all new features and bug fixes
- Ensure all tests pass before submitting a pull request
- Write both unit and integration tests when applicable
- Follow the testing guidelines in TEST_PLAN.md

```python
# Example of a good test
def test_tunneling_calculation():
    """Test that tunneling probability is correct for standard barriers."""
    # Setup
    barrier = 10.0  # eV
    energy = 5.0    # eV
    
    # Execute
    probability = calculate_tunneling_probability(barrier, energy)
    
    # Assert
    assert 0 <= probability <= 1
    assert round(probability, 6) == 0.012345  # Expected value
```

## Documentation

- Update documentation for any changes to the API or UI
- Document complex physics models with references to papers or textbooks
- Include examples for new features
- Keep the README.md up to date

Thank you for contributing to the LENR Simulation Application! 