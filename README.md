# changelog-log

A GitHub Action that watches for changelog file changes on your default branch, parses new entries, and sends them as structured JSON payloads to a webhook endpoint.

## Features

- 🔍 **Detects new changelog entries** using configurable patterns (default: Keep a Changelog format)
- 📝 **Parses entries into structured JSON** with sections and bullet points
- 🚀 **Posts to any webhook endpoint** with customizable headers and HTTP methods
- 🔧 **Highly configurable** with glob patterns and regex separators
- 📦 **Uses changelog-parser** with intelligent fallback to regex parsing

## Usage

### Basic Example

```yaml
name: Changelog Log
on:
  push:
    branches: [main]
    paths:
      - "**/CHANGELOG*.md"
      - "**/changelog*.md"

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

### Advanced Configuration

```yaml
- uses: lukeocodes/changelog-log@v1
  with:
    webhook_url: ${{ secrets.CHANGELOG_WEBHOOK_URL }}
    file_globs: "CHANGELOG.md,**/CHANGELOG*.md"
    entry_separator_regex: "^##\\s+.*$"
    http_method: "POST"
    webhook_headers_json: '{"X-Api-Key":"${{ secrets.API_KEY }}"}'
    include_body_raw: "false"
```

## Inputs

| Input                   | Description                                 | Required | Default                                                                          |
| ----------------------- | ------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `webhook_url`           | Destination URL for JSON payloads           | Yes      | -                                                                                |
| `file_globs`            | Comma-separated glob patterns to watch      | No       | `CHANGELOG.md,**/CHANGELOG.md,**/changelog.md,**/CHANGELOG*.md,**/changelog*.md` |
| `entry_separator_regex` | Regex matching the start of an entry header | No       | `^##\s+.*$`                                                                      |
| `http_method`           | HTTP method to use when sending             | No       | `POST`                                                                           |
| `webhook_headers_json`  | Optional JSON string of extra headers       | No       | -                                                                                |
| `include_body_raw`      | Include raw entry body in payload           | No       | `false`                                                                          |

## JSON Payload Structure

The action sends a JSON payload for each new changelog entry detected:

```json
{
  "filePath": "CHANGELOG.md",
  "commit": {
    "before": "abc123...",
    "after": "def456..."
  },
  "header": "## [1.2.3] - 2025-10-17",
  "version": "1.2.3",
  "date": "2025-10-17",
  "sections": {
    "root": ["General note before subsections"],
    "Added": ["New feature X", "Another bullet"],
    "Changed": ["Behavior Y updated"],
    "Fixed": ["Bug Z"]
  },
  "bodyRaw": "... only when include_body_raw=true ..."
}
```

## How It Works

1. **Monitors Changes**: Watches for pushes to the main branch affecting changelog files
2. **Detects New Entries**: Compares the changelog before and after the commit using git diff
3. **Parses Structure**: Extracts version, date, and organizes content by sections (Added, Changed, Fixed, etc.)
4. **Sends Webhook**: Posts each new entry as JSON to your configured endpoint

## Setup

1. **Add the workflow** to `.github/workflows/changelog-log.yml` in your repository
2. **Create a secret** named `CHANGELOG_WEBHOOK_URL` with your webhook endpoint
3. **Commit a changelog entry** to trigger the action

## Development

This project uses:

- **pnpm** for package management
- **release-please** for automated releases
- **conventional commits** for clean release notes

See the [docs/](./docs) directory for architectural decisions and detailed configuration.

## License

MIT

## Contributing

Contributions welcome! Please follow conventional commit format for your PRs.
