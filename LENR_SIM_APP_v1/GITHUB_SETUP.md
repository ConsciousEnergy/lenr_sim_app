# GitHub Repository Setup Guide

This document provides instructions for setting up and managing the GitHub repository for the LENR Simulation Application.

## Initial Repository Setup

1. Create a new repository on GitHub named "LENR_SIM_APP"
2. Configure the following repository settings:
   - Enable "Issues" and "Projects" features
   - Set default branch to `main`
   - Setup branch protection rules for `main`

## Branch Protection Rules

For the `main` branch:
- Require pull request reviews before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Include administrators in these restrictions

## Setting Up GitHub Actions

1. Create a `.github/workflows` directory
2. Add CI workflow files for:
   - Backend tests (`backend-tests.yml`)
   - Frontend tests (`frontend-tests.yml`)
   - Integration tests (`integration-tests.yml`)

## GitHub Issues Templates

Create issue templates for:
- Bug reports
- Feature requests
- Documentation improvements

## GitHub Projects Board

Set up a project board with the following columns:
- To Do
- In Progress
- Under Review
- Done

## Repository Documentation

Ensure the following documentation is in place:
- README.md
- CONTRIBUTING.md
- LICENSE
- SECURITY.md
- CODE_OF_CONDUCT.md

## Branch Strategy

We follow this branching strategy:
- `main`: production-ready code
- `dev`: active development branch
- `feature/*`: for new features
- `bugfix/*`: for bug fixes
- `hotfix/*`: for urgent fixes to production

## Tagging and Releases

We use semantic versioning for releases:
- Major.Minor.Patch (e.g., 1.0.0)
- Create a new tag and release for each version
- Include detailed release notes

## GitHub Actions for CI/CD

The CI/CD pipeline should include:
- Running all tests
- Linting and code quality checks
- Building the application
- (Future) Deployment to staging/production environments 