# Contributing to Agentic

Thank you for your interest in contributing to Agentic! We welcome contributions from the community.

## Code of Conduct

This project adheres to our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

- Check if the bug has already been reported in [GitHub Issues](https://github.com/Em3ODMe/agentic/issues)
- If not, create a new issue with a clear description and reproduction steps
- Include your Node.js version and operating system

### Suggesting Features

- Open an issue describing the feature and its use case
- Discuss the feature with maintainers before implementing

### Contributing Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run the tests and ensure they pass
5. Submit a pull request

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm (recommended) or npm

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/agentic.git
cd agentic

# Install dependencies
pnpm install
```

## Development Workflow

### Building

```bash
# Build the project
pnpm build

# Watch mode for development
pnpm dev
```

### Testing

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm coverage
```

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Pre-commit Hooks

This project uses Husky to run linting automatically before each commit. The pre-commit hook will:

- Run ESLint on staged files
- Prevent commits with linting errors

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking
- Avoid `any` types when possible
- Document public APIs with JSDoc comments

### Code Style

- Follow the existing code style
- Use ESLint and Prettier configurations provided
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required

### Testing

- Write tests for new features
- Maintain test coverage
- Place tests in the `test/` directory
- Use descriptive test names

### Commit Messages

- Use clear, descriptive commit messages
- Reference issues when applicable: `Fixes #123`
- Keep commits focused and atomic

Example commit messages:

```
Add support for streaming responses in Groq provider

Fix error handling in Cloudflare provider when AI binding is missing

Update documentation for tool calling API
```

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Ensure your branch is up to date with main
4. Fill out the pull request template
5. Request review from maintainers
6. Address review feedback

### PR Checklist

- [ ] Tests pass locally
- [ ] Code follows project style guidelines
- [ ] Documentation updated (if applicable)
- [ ] Commit messages are clear
- [ ] PR description explains the changes

## Release Process

Releases are managed by maintainers. The `prepublishOnly` script ensures:

1. Code is formatted
2. Linting passes
3. Tests pass
4. Project builds successfully

## Questions?

- Check the [documentation](./docs/)
- Open a [GitHub Discussion](https://github.com/Em3ODMe/agentic/discussions)
- Create an issue for bugs or feature requests

Thank you for contributing!
