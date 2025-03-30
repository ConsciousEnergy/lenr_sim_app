# Contributing to LENR Simulation App

Thank you for considering contributing to the LENR Simulation App! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** (`git clone https://github.com/yourusername/LENR_SIM_APP.git`)
3. **Create a new branch** (`git checkout -b feature/your-feature-name`)
4. **Set up your environment** using the start scripts provided

## Development Workflow

### Frontend Development

1. Navigate to the frontend directory
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
4. Make your changes following the established patterns
5. Ensure your code follows the style guidelines

### Backend Development

1. Activate the virtual environment
2. Install requirements: `pip install -r backend/requirements.txt`
3. Run the backend server: `uvicorn app.main:app --reload`
4. Make your changes and test thoroughly

## Code Style Guidelines

### Python Code

- Follow PEP 8 guidelines
- Use type hints for function signatures
- Write docstrings for all functions and classes
- Keep functions small and focused on a single task
- Prefer functional approaches over classes where appropriate

### JavaScript/React Code

- Follow the existing component structure
- Use functional components with hooks
- Follow Material-UI patterns for UI components
- Use descriptive variable names

## Testing

- Write tests for all new features
- Run existing tests with `python run_tests.py all` before submitting PRs
- Ensure all tests pass before submitting your PR

## Pull Request Process

1. Update the documentation to reflect your changes
2. Run all tests and ensure they pass
3. Add your changes to the CHANGELOG.md file
4. Submit a pull request to the `dev` branch
5. Include a clear description of the changes and their purpose
6. Link any relevant issues

## Commit Message Guidelines

- Use clear, descriptive commit messages
- Start with a verb in the present tense (Add, Fix, Update, Refactor, etc.)
- Reference issue numbers when applicable
- Keep commits focused on single changes

## Code Review

All submissions require review. We use GitHub pull requests for this purpose:

1. Push your changes to your fork
2. Submit a pull request to the repository
3. Address any review comments promptly
4. Ensure the CI/CD checks pass

## Licensing

By contributing, you agree that your contributions will be licensed under the project's MIT License.

Thank you for contributing to LENR Simulation App! 