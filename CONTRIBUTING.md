# Contributing to Changelog Log

Thank you for your interest in contributing to Changelog Log! This document provides guidelines and information for contributors.

## Code of Conduct

Please be respectful and considerate in all interactions. We aim to maintain a welcoming and inclusive community.

## How to Contribute

### Reporting Issues

- Check existing issues before creating a new one
- Provide clear reproduction steps
- Include relevant environment details (OS, Node version, etc.)
- Attach workflow logs if applicable

### Suggesting Features

- Open an issue with the `enhancement` label
- Clearly describe the use case and benefits
- Consider backward compatibility

### Submitting Pull Requests

1. **Fork the repository** and create a new branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** for any new functionality
4. **Run tests** to ensure everything passes: `pnpm test`
5. **Update documentation** if needed
6. **Use conventional commits** for your commit messages
7. **Submit a PR** with a clear description of changes

## Development Setup

### Prerequisites

- Node.js >= 18
- pnpm >= 9

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/changelog-log.git
cd changelog-log

# Install dependencies
pnpm install
```

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### Project Structure

```
changelog-log/
├── action.yml              # GitHub Action definition
├── main.js                 # Main action logic
├── tests/                  # Test files
│   ├── __fixtures__/      # Test data
│   └── changelog-log.test.js
├── docs/                   # Documentation
│   ├── Architecture decisions.md
│   └── Usage guide.md
└── .github/
    └── workflows/          # CI/CD workflows
```

## Coding Standards

### JavaScript Style

- Use 2 spaces for indentation
- Use double quotes for strings
- Add semicolons
- Follow the `.prettierrc` and `.editorconfig` settings

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test changes
- `chore`: Maintenance tasks
- `refactor`: Code refactoring
- `perf`: Performance improvements

**Examples:**

```
feat: add support for custom date formats
fix: handle empty changelog files correctly
docs: update usage examples in README
test: add tests for conventional changelog format
```

### Testing Guidelines

- Write tests for all new functionality
- Aim for high code coverage
- Use descriptive test names
- Mock external dependencies (git commands, HTTP requests)
- Include both unit and integration tests

### Documentation

- Update README.md for user-facing changes
- Update docs/ for architectural changes
- Add JSDoc comments for complex functions
- Include examples in documentation

## Pull Request Process

1. **Update CHANGELOG.md** following Keep a Changelog format
2. **Ensure all tests pass** and coverage is maintained
3. **Update documentation** as needed
4. **Get approval** from a maintainer
5. **Squash commits** if requested
6. **Merge** will be done by a maintainer

## Release Process

We use [release-please](https://github.com/googleapis/release-please) for automated releases:

1. Merge PRs to `main` using conventional commits
2. Release-please creates/updates a release PR automatically
3. Maintainer merges the release PR
4. Package is published to npm automatically
5. GitHub release is created with changelog

## Questions?

- Open an issue with the `question` label
- Check existing documentation in `docs/`
- Review closed issues for similar questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
