# Contributing to Royal Equips Orchestrator
# CONTRIBUTING.md
## Rules
- Signed, Conventional Commits.
- Tests for all new logic. Rollback for all migrations.
- No secrets in code. No PII in logs.
- Add metrics and alerts for new services.
## Flow
1) Create branch `feat/*|fix/*|chore/*`.  
2) Write code + tests + docs.  
3) Open PR with risk + rollback.  
4) Green guardrails → merge.  
5) Canary deploy + monitor.


Welcome to the Royal Equips Orchestrator project! This document provides guidelines for contributing to the project.

## Development Workflow

### Setup

1. Fork and clone the repository
2. Set up your development environment:
   ```bash
   make setup
   ```
3. Install pre-commit hooks:
   ```bash
   pip install pre-commit
   pre-commit install
   ```

### Making Changes

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards (see below)

3. Write or update tests for your changes:
   ```bash
   # Run tests frequently
   make test
   
   # Run with coverage
   make coverage
   ```

4. Ensure all quality checks pass:
   ```bash
   # Run the complete CI pipeline locally
   make ci
   ```

5. Commit your changes with clear messages:
   ```bash
   git add .
   git commit -m "feat: add new MCP connector for XYZ service"
   ```

6. Push and create a Pull Request to `develop`

### Commit Message Format

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```bash
feat(mcp): add Stripe connector with payment tools
fix(server): resolve memory leak in connection pooling
docs(readme): update MCP server setup instructions
test(integration): add comprehensive workflow tests
```

### Commitlint Configuration

The repository uses `commitlint` to enforce conventional commit standards. The configuration includes:

- **Standard Rules**: All new commits must follow the conventional commit format
- **Legacy Support**: Historical commits that don't follow the format are ignored via the `ignores` configuration in `commitlint.config.cjs`
- **Dependencies**: Both `@commitlint/cli` and `@commitlint/config-conventional` are required dependencies

To test your commit messages locally:
```bash
# Test a commit message
echo "feat: add new feature" | npx commitlint

# Test commit range
npx commitlint --from=HEAD~1 --to=HEAD
```

## Code Quality Standards

### Python Code

- **Formatting**: Use `black` with 88-character line length
- **Linting**: Follow `ruff` configuration (includes PEP 8, security, and naming)
- **Type Hints**: Add type hints for all public functions and methods
- **Documentation**: Use docstrings for all public functions, classes, and modules

Example:
```python
from typing import List, Dict, Any, Optional

async def execute_query(
    query: str, 
    parameters: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """Execute a database query with optional parameters.
    
    Args:
        query: SQL query string to execute
        parameters: Optional query parameters for safe substitution
        
    Returns:
        List of result rows as dictionaries
        
    Raises:
        DatabaseError: If query execution fails
    """
    # Implementation here
    pass
```

### Testing

- **Unit Tests**: Test individual functions and methods in isolation
- **Integration Tests**: Test component interactions and workflows
- **Mocking**: Use proper mocking for external dependencies
- **Coverage**: Aim for >80% test coverage on new code

Test file structure:
```python
"""Tests for the XYZ connector."""

import pytest
from unittest.mock import patch, AsyncMock

@pytest.mark.unit
class TestXYZConnector:
    """Unit tests for XYZ connector."""
    
    def test_initialization(self):
        """Test connector initializes correctly."""
        pass

@pytest.mark.integration  
class TestXYZIntegration:
    """Integration tests for XYZ connector."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_workflow(self):
        """Test complete workflow."""
        pass
```

### MCP Connectors

When adding new MCP connectors:

1. **Follow the interface pattern**:
   ```python
   class YourConnector:
       def __init__(self):
           """Initialize connector with configuration."""
           pass
           
       def get_tools(self) -> List[Tool]:
           """Return list of available tools."""
           pass
           
       async def handle_tool_name(self, arguments: Dict[str, Any]) -> List[Any]:
           """Handle specific tool execution."""
           pass
   ```

2. **Include comprehensive error handling**
3. **Add proper logging with context**
4. **Implement retry logic and circuit breakers where appropriate**
5. **Write comprehensive tests including failure scenarios**

### JavaScript/TypeScript

- **Formatting**: Use Prettier with 2-space indentation
- **Linting**: Follow ESLint configuration
- **Types**: Use TypeScript for all new code

## Security Guidelines

- **Never commit secrets**: Use environment variables or secret management
- **Input validation**: Validate and sanitize all user inputs
- **Authentication**: Follow secure authentication patterns
- **Dependencies**: Keep dependencies updated and scan for vulnerabilities

## Pull Request Process

1. **Description**: Provide clear description of changes and rationale
2. **Testing**: Include test results and coverage reports
3. **Documentation**: Update relevant documentation
4. **Breaking Changes**: Clearly note any breaking changes
5. **Review**: Address all feedback and requested changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## Architecture Decisions

For significant changes:

1. **Create an ADR (Architecture Decision Record)** in `docs/adr/`
2. **Discuss in issues** before implementing large changes
3. **Consider backward compatibility**
4. **Document migration paths** for breaking changes

## Getting Help

- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Code Review**: Tag maintainers for review help

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Project documentation


Thank you for contributing to Royal Equips Orchestrator! 🚀

