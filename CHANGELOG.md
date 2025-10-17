# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Git diff-based changelog parsing for accurate detection of new entries
- Composite GitHub Action for monitoring changelog file changes
- Structured JSON webhook payloads with version, date, and sections
- Support for customizable file glob patterns and entry separators
- Integration with changelog-parser library with regex fallback
- Single source of truth for defaults by parsing action.yml at runtime
- Comprehensive test suite with Jest
- Release automation with release-please
- npm publishing workflow

### Changed

- Uses native git diff to extract only added lines instead of comparing full files

### Documentation

- Architecture decisions document
- Action usage guide with examples
- README with setup instructions and feature highlights

