# Contributing to GIS AI Agent

Thank you for your interest in contributing to the GIS AI Agent! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read it before contributing.

## How Can I Contribute?

### Reporting Bugs

If you encounter a bug, please create an issue on GitHub with the following information:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior and what actually happened
- Screenshots if applicable
- Your environment (OS, Python version, etc.)

### Suggesting Enhancements

We welcome suggestions for enhancements! When submitting an enhancement suggestion, please include:

- A clear and descriptive title
- A detailed description of the proposed functionality
- Any specific implementation details you have in mind
- Why this enhancement would be useful to users

### Adding New Data Sources

To add a new data source connector:

1. Create a new module in the `src/data_sources` directory
2. Implement the connector class with appropriate methods
3. Add the connector to the API keys example file
4. Update documentation
5. Add tests for the new connector

### Adding New Tools

To add a new tool:

1. Determine the appropriate category for your tool (spatial_query, sustainability_assessment, visualization, etc.)
2. Add your tool implementation to the appropriate module in `src/tools`
3. Register the tool in the tools registry
4. Update documentation
5. Add tests for the new tool

## Development Workflow

### Setting Up Your Development Environment

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/gis-agent.git`
3. Create a virtual environment: `python -m venv venv`
4. Activate the virtual environment: `source venv/bin/activate` (Unix) or `venv\Scripts\activate` (Windows)
5. Install dependencies: `pip install -r requirements.txt`
6. Install development dependencies: `pip install -r requirements-dev.txt` (if available)

### Making Changes

1. Create a new branch for your changes: `git checkout -b feature/my-feature` or `git checkout -b fix/my-bugfix`
2. Make your changes
3. Run tests to ensure your changes don't break existing functionality: `pytest`
4. Add or update tests for your changes
5. Update documentation as needed

### Submitting a Pull Request

1. Push your changes to your fork: `git push origin feature/my-feature`
2. Create a pull request from your branch to the main repository
3. Fill out the pull request template
4. Wait for a maintainer to review your PR
5. Address any feedback

## Style Guidelines

### Code Style

We follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guidelines for Python code. Some key points:

- Use 4 spaces for indentation (no tabs)
- Maximum line length of 88 characters
- Use descriptive variable names
- Add docstrings for all modules, classes, and functions

### Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Reference issues and pull requests where appropriate

## Testing

- All new features should include tests
- Run tests using pytest: `pytest`
- Aim for high test coverage for new code

## Documentation

- Update the README.md when necessary
- Add docstrings to all new classes and functions
- Use [Google-style docstrings](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings)
- Update example scripts if appropriate

## Project Structure

Here's an overview of the project structure:

```
gis-agent/
├── GIS_Agent/
│   ├── config/              # Configuration files
│   ├── data/                # Data storage
│   │   ├── cache/           # Cached responses
│   │   └── static/          # Static data files
│   ├── examples/            # Example scripts
│   ├── src/                 # Source code
│   │   ├── data_sources/    # Data source connectors
│   │   ├── gemini/          # Gemini API integration
│   │   ├── mcp_server/      # MCP server implementation
│   │   ├── tools/           # Tool implementations
│   │   └── config.py        # Configuration management
│   └── tests/               # Test suite
├── CONTRIBUTING.md          # This file
├── INSTALL.md               # Installation guide
├── README.md                # Project overview
└── requirements.txt         # Project dependencies
```

## Questions?

If you have any questions, feel free to open an issue or contact the maintainers. We appreciate your contributions! 