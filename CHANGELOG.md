# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.7](https://github.com/lukeocodes/changelog-log/compare/changelog-log-v0.1.6...changelog-log-v0.1.7) (2025-10-21)


### Bug Fixes

* remove pnpm cache to prevent errors in consuming repositories ([ed7a418](https://github.com/lukeocodes/changelog-log/commit/ed7a41834221eddc9e0c4fff49ddd69f4f088515))

## [0.1.6](https://github.com/lukeocodes/changelog-log/compare/changelog-log-v0.1.5...changelog-log-v0.1.6) (2025-10-18)


### Features

* prepare action.yml for GitHub Actions marketplace ([8ed3b14](https://github.com/lukeocodes/changelog-log/commit/8ed3b147d17f504089fed8698567e64af7a1f089))


### Bug Fixes

* add test job to release-please workflow ([6ff874b](https://github.com/lukeocodes/changelog-log/commit/6ff874bfeb1dcd0b6e033cb8729e704866bc42ab))

## [0.1.5](https://github.com/lukeocodes/changelog-log/compare/changelog-log-v0.1.4...changelog-log-v0.1.5) (2025-10-18)


### Features

* add configurable log levels for debugging ([649c0be](https://github.com/lukeocodes/changelog-log/commit/649c0be5d9b78521512bab28dd4003b397c06d4a))

## [0.1.4](https://github.com/lukeocodes/changelog-log/compare/changelog-log-v0.1.3...changelog-log-v0.1.4) (2025-10-18)


### Features

* automatically infer project context from GitHub environment ([2e97682](https://github.com/lukeocodes/changelog-log/commit/2e976826b1a78f55905624f2a295187b802b483d))

## [0.1.3](https://github.com/lukeocodes/changelog-log/compare/changelog-log-v0.1.2...changelog-log-v0.1.3) (2025-10-18)


### Bug Fixes

* update route to 'community-projects' ([d16e129](https://github.com/lukeocodes/changelog-log/commit/d16e1299feabde1e9fca39c80a7f778ac6b5199f))

## [0.1.2](https://github.com/lukeocodes/changelog-log/compare/changelog-log-v0.1.1...changelog-log-v0.1.2) (2025-10-18)


### Features

* add detailed request logging for webhook failures ([d25ea75](https://github.com/lukeocodes/changelog-log/commit/d25ea75224f7f978cadae7708fbd6f7026889794))


### Bug Fixes

* remove destination from webhook payload ([f5d456c](https://github.com/lukeocodes/changelog-log/commit/f5d456cf52b086f97dd8cf8f7f6ba73eec0d067c))
* use 'route' instead of 'project' in webhook payload ([1d63406](https://github.com/lukeocodes/changelog-log/commit/1d63406fbbf673b715810c7c8aac01dc46a9bfe8))

## [0.1.1](https://github.com/lukeocodes/changelog-log/compare/changelog-log-v0.1.0...changelog-log-v0.1.1) (2025-10-18)


### Bug Fixes

* swap setup order to install pnpm before node caching ([457b020](https://github.com/lukeocodes/changelog-log/commit/457b02037a47481f3d082b3376cdfdf7c1530a1b))

## [0.1.0](https://github.com/lukeocodes/changelog-log/compare/changelog-log-v0.0.3...changelog-log-v0.1.0) (2025-10-18)


### ⚠ BREAKING CHANGES

* main.js no longer exports functions directly, use parser.js for imports

### Features

* add extra_body_json parameter and refactor parser ([eca44a7](https://github.com/lukeocodes/changelog-log/commit/eca44a739315b733c9cdf0d377523e93777eae29))

## [0.0.3](https://github.com/lukeocodes/changelog-log/compare/changelog-log-v0.0.2...changelog-log-v0.0.3) (2025-10-17)


### Bug Fixes

* setup pnpm before node to enable caching ([af61692](https://github.com/lukeocodes/changelog-log/commit/af61692b1c31fd78dd100892177e0e56ae7907de))

## [0.0.2](https://github.com/lukeocodes/changelog-log/compare/changelog-log-v0.0.1...changelog-log-v0.0.2) (2025-10-17)


### Features

* add core GitHub Action for changelog monitoring ([70c2832](https://github.com/lukeocodes/changelog-log/commit/70c283292a049b7a22a66cf0986dc7e228090f3f))
* implement git diff-based changelog parsing ([d4319ef](https://github.com/lukeocodes/changelog-log/commit/d4319ef4d478fd9be7c7fa35241e38339b0b8d89))


### Bug Fixes

* add required permissions to release-please workflow ([99df09c](https://github.com/lukeocodes/changelog-log/commit/99df09c551426ed8aa04370e40721543603d8c88))

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
