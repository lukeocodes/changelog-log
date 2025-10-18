# Changelog Log

GitHub Action that detects new changelog entries and posts them as structured JSON to a webhook.

## Features

- 🎯 Git diff-based - Only parses lines actually added
- 📝 Structured JSON output with sections and bullets
- 🚀 Posts to any webhook with custom headers
- 📋 Supports Keep a Changelog & Conventional Changelog formats
- 🔧 Configurable glob patterns and entry separators

## Quick Start

```yaml
name: Changelog Log
on:
  push:
    branches: [main]
    paths: ["**/CHANGELOG*.md"]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: lukeocodes/changelog-log@v1
        with:
          webhook_url: ${{ secrets.CHANGELOG_WEBHOOK_URL }}
```

## Configuration

| Input                   | Required | Default               | Description                                   |
| ----------------------- | -------- | --------------------- | --------------------------------------------- |
| `webhook_url`           | Yes      | -                     | Destination URL for JSON payload              |
| `file_globs`            | No       | `CHANGELOG.md,**/...` | Changelog file patterns to watch              |
| `entry_separator_regex` | No       | `^##\s+.*$`           | Regex for entry headers                       |
| `http_method`           | No       | `POST`                | HTTP method (POST/PUT/PATCH)                  |
| `webhook_headers_json`  | No       | -                     | Extra headers as JSON string                  |
| `extra_body_json`       | No       | -                     | Extra fields to merge into payload            |
| `include_body_raw`      | No       | `false`               | Include unparsed entry text                   |
| `log_level`             | No       | `warn`                | Log level (trace/debug/info/warn/error/fatal) |

## JSON Payload

```json
{
  "filePath": "CHANGELOG.md",
  "commit": { "before": "abc123...", "after": "def456..." },
  "header": "## [1.2.3] - 2025-10-17",
  "version": "1.2.3",
  "date": "2025-10-17",
  "sections": {
    "Added": ["New feature X"],
    "Fixed": ["Bug Z"]
  }
}
```

### Custom Fields

Use `extra_body_json` to add custom fields to the payload:

```yaml
- uses: lukeocodes/changelog-log@v1
  with:
    webhook_url: ${{ secrets.WEBHOOK_URL }}
    extra_body_json: '{"project":"myapp","environment":"production"}'
```

This will merge the extra fields into the payload:

```json
{
  "filePath": "CHANGELOG.md",
  "version": "1.2.3",
  "project": "myapp",
  "environment": "production",
  ...
}
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Use conventional commits for PRs.

## License

MIT © [Luke Oliff](https://lukeoliff.com)
