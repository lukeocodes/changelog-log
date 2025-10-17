## Architecture decisions - changelog log

### Why a composite action (not Docker/JS bundled)?

- Avoids runtime bundling and third-party dependencies; uses the runner's Node.
- Simpler review as plain YAML + JS; easier for contributors to modify.

### Single source of truth for defaults

- Default values are defined in `action.yml` only.
- The `main.js` script parses `action.yml` at runtime to read defaults using `js-yaml`.
- This ensures defaults are never duplicated and always stay in sync.

### Changelog parsing approach

- Default separator regex `^##\s+.*$` chosen to match Keep a Changelog headers.
- Entries are considered "new" if their header line appears in the new file but not in the old file at `before`.
- Subsections detected via `###` headings; bullets are `-`, `*`, `+`, or numbered lists.

### Webhook delivery

- Uses Node's built-in `http/https` modules to post JSON.
- Supports extra headers via `webhook_headers_json` input.

### Security and secrets

- Webhook URL should be provided via a repository secret and not committed.
- If testing locally, prefer environment variables or a local uncommitted `.env` file.
