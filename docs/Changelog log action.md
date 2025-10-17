## Changelog log action

### What it does

- **Monitors** changes to well-known changelog file patterns on `main`.
- **Understands entries** split by a configurable separator (default: lines starting with `##`).
- **Parses** each new entry into nested JSON (sections and bullets).
- **Posts** the JSON payload to a developer-provided webhook URL.

### Design highlights

- **Trigger**: Pushes to `main` with path filters matching `CHANGELOG*.md` (configurable via `file_globs`).
- **Separator**: Default `entry_separator_regex` is `^##\s+.*$` to align with Keep a Changelog style. Override as needed.
- **Parser**: Detects `###` subsections (e.g., Added, Changed, Fixed) and collects bullets under each.
- **Posting**: Sends one payload per newly added entry. Failures are logged but do not halt processing of subsequent entries.
- **Dependencies**: Uses `changelog-parser` via `pnpm` inside the composite action; falls back to a regex-based splitter if parsing fails.

### Configuration

- **Inputs** (action):
  - **file_globs**: Comma-separated globs to watch. Default includes common `CHANGELOG.md` locations.
  - **entry_separator_regex**: Multiline regex for entry headers. Default `^##\s+.*$`.
  - **webhook_url**: Destination URL. Recommended to set via a secret.
  - **webhook_headers_json**: Optional JSON string for extra headers.
  - **http_method**: Default `POST`.
  - **include_body_raw**: Whether to include the raw entry text in payload.

### Environment and secrets

- **Create a repository secret** `CHANGELOG_WEBHOOK_URL` with your destination URL and reference it in the workflow inputs.
- For local testing (outside of GitHub Actions), you may export environment variables instead of a `.env` file. If you prefer a `.env`, create one locally (uncommitted) and load it before running the script. Never commit `.env` files.

### pnpm and runtime

- The action sets up Node.js 20 and installs dependencies with `pnpm` at runtime.

### JSON payload shape

```json
{
  "filePath": "CHANGELOG.md",
  "commit": { "before": "<sha>", "after": "<sha>" },
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

### Example workflow

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
      - uses: ./
        with:
          webhook_url: ${{ secrets.CHANGELOG_WEBHOOK_URL }}
```

### External usage

Consumers of the action from another repository can reference it once published to GitHub Marketplace or via a git ref:

```yaml
- uses: owner/repo@v1
  with:
    webhook_url: ${{ secrets.CHANGELOG_WEBHOOK_URL }}
```

### Architectural decisions

- Implemented as a **composite action** with a Node script to avoid external dependencies and bundling.
- Default entry header regex favors **Keep a Changelog** style but is configurable for other formats.
- Diffing uses `git show` and `git diff` between `before` and `after` SHAs provided by the push event.
