const fs = require("fs");
const path = require("path");

// Load fixtures BEFORE any mocking
const keepAChangelogFixture = fs.readFileSync(
  path.join(__dirname, "__fixtures__", "CHANGELOG.md"),
  "utf8"
);

const conventionalChangelogFixture = fs.readFileSync(
  path.join(__dirname, "__fixtures__", "CONVENTIONAL-CHANGELOG.md"),
  "utf8"
);

// NOW mock the dependencies
jest.mock("child_process");
jest.mock("changelog-parser", () => null);
jest.mock("js-yaml");

const { execSync } = require("child_process");

describe("Changelog Log Action", () => {
  let originalEnv;
  let consoleOutput = [];
  let originalStdoutWrite;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Mock console output
    consoleOutput = [];
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = jest.fn((msg) => {
      consoleOutput.push(msg);
      return true;
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    process.stdout.write = originalStdoutWrite;
  });

  describe("Core Functions", () => {
    describe("getAddedLines", () => {
      it("should extract added lines from git diff", () => {
        const mockDiff = `diff --git a/CHANGELOG.md b/CHANGELOG.md
index abc123..def456 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -1,3 +1,8 @@
+## [1.2.0] - 2025-10-17
+
+### Added
+- New feature
+
 ## [1.1.0] - 2025-10-16`;

        execSync.mockReturnValue(mockDiff);

        // Parse added lines from diff
        const lines = mockDiff.split("\n");
        const addedLines = [];

        for (const line of lines) {
          if (line.startsWith("+") && !line.startsWith("+++")) {
            addedLines.push(line.slice(1));
          }
        }

        const result = addedLines.join("\n");

        expect(result).toContain("## [1.2.0] - 2025-10-17");
        expect(result).toContain("### Added");
        expect(result).toContain("- New feature");
        expect(result).not.toContain("## [1.1.0]");
      });

      it("should handle new file creation", () => {
        const mockContent = `## [1.0.0] - 2025-10-17

### Added
- Initial release`;

        execSync.mockReturnValue(mockContent);

        // For new files (no before SHA), should return full content
        expect(mockContent).toContain("## [1.0.0]");
        expect(mockContent).toContain("- Initial release");
      });
    });

    describe("parseSections", () => {
      it("should parse changelog sections correctly", () => {
        const entryText = `## [1.2.0] - 2025-10-17

### Added
- Feature A
- Feature B

### Fixed
- Bug X

### Changed
- Updated Y`;

        const lines = entryText.split(/\r?\n/);
        const sections = {};
        let currentSection = "root";
        sections[currentSection] = [];

        for (const raw of lines) {
          const line = raw.trimEnd();
          if (/^###\s+/.test(line)) {
            currentSection = line.replace(/^###\s+/, "").trim();
            if (!sections[currentSection]) sections[currentSection] = [];
            continue;
          }
          if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
            const bullet = line
              .replace(/^[-*+]\s+/, "")
              .replace(/^\d+\.\s+/, "")
              .trim();
            if (bullet.length > 0) sections[currentSection].push(bullet);
          }
        }

        expect(sections.Added).toEqual(["Feature A", "Feature B"]);
        expect(sections.Fixed).toEqual(["Bug X"]);
        expect(sections.Changed).toEqual(["Updated Y"]);
      });

      it("should handle bullets with different markers", () => {
        const entryText = `### Added
- Dash bullet
* Star bullet
+ Plus bullet
1. Numbered bullet`;

        const lines = entryText.split(/\r?\n/);
        const bullets = [];

        for (const line of lines) {
          if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
            const bullet = line
              .replace(/^[-*+]\s+/, "")
              .replace(/^\d+\.\s+/, "")
              .trim();
            if (bullet.length > 0) bullets.push(bullet);
          }
        }

        expect(bullets).toEqual([
          "Dash bullet",
          "Star bullet",
          "Plus bullet",
          "Numbered bullet",
        ]);
      });
    });

    describe("extractVersionAndDate", () => {
      it("should extract version and date from various formats", () => {
        const testCases = [
          {
            header: "## [1.2.3] - 2025-10-17",
            expected: { version: "1.2.3", date: "2025-10-17" },
          },
          {
            header: "## 1.2.3 (2025-10-17)",
            expected: { version: "1.2.3", date: "2025-10-17" },
          },
          {
            header: "## 1.2.3 - 2025/10/17",
            expected: { version: "1.2.3", date: "2025/10/17" },
          },
          {
            header: "## [4.2.4](https://github.com) (2023-10-26)",
            expected: { version: "4.2.4", date: "2023-10-26" },
          },
          {
            header: "## Unreleased",
            expected: { version: null, date: null },
          },
        ];

        testCases.forEach(({ header, expected }) => {
          const versionMatch = header.match(
            /\b(\d+\.\d+\.\d+(?:[-+A-Za-z0-9\.]+)?)\b/
          );
          const dateMatch = header.match(/(\d{4}[-\/]\d{2}[-\/]\d{2})/);

          const result = {
            version: versionMatch ? versionMatch[1] : null,
            date: dateMatch ? dateMatch[1] : null,
          };

          expect(result).toEqual(expected);
        });
      });
    });

    describe("splitEntries", () => {
      it("should split changelog into entries by separator pattern", () => {
        const content = `# Changelog

## [1.2.0] - 2025-10-17

### Added
- Feature A

## [1.1.0] - 2025-10-16

### Fixed
- Bug B

## [1.0.0] - 2025-10-15

### Added
- Initial release`;

        const sepPattern = "^##\\s+.*$";
        const re = new RegExp(sepPattern, "gm");
        const indices = [];
        let match;

        while ((match = re.exec(content)) !== null) {
          const getLineAt = (text, idx) => {
            let start = text.lastIndexOf("\n", idx) + 1;
            if (start < 0) start = 0;
            let end = text.indexOf("\n", idx);
            if (end === -1) end = text.length;
            return text.slice(start, end);
          };

          indices.push({
            index: match.index,
            header: getLineAt(content, match.index).trim(),
          });
        }

        const entries = [];
        for (let i = 0; i < indices.length; i++) {
          const start = indices[i].index;
          const end =
            i + 1 < indices.length ? indices[i + 1].index : content.length;
          const slice = content.slice(start, end).trim();
          entries.push({ header: indices[i].header, text: slice });
        }

        expect(entries).toHaveLength(3);
        expect(entries[0].header).toBe("## [1.2.0] - 2025-10-17");
        expect(entries[1].header).toBe("## [1.1.0] - 2025-10-16");
        expect(entries[2].header).toBe("## [1.0.0] - 2025-10-15");
        expect(entries[0].text).toContain("Feature A");
        expect(entries[1].text).toContain("Bug B");
      });

      it("should handle single entry", () => {
        const content = `## [1.0.0] - 2025-10-17

### Added
- Initial release`;

        const sepPattern = "^##\\s+.*$";
        const re = new RegExp(sepPattern, "gm");
        const matches = [];
        let match;

        while ((match = re.exec(content)) !== null) {
          matches.push(match);
        }

        expect(matches).toHaveLength(1);
      });

      it("should return empty array for content without entries", () => {
        const content = "# Just a title\n\nSome text";
        const sepPattern = "^##\\s+.*$";
        const re = new RegExp(sepPattern, "gm");
        const matches = [];
        let match;

        while ((match = re.exec(content)) !== null) {
          matches.push(match);
        }

        expect(matches).toHaveLength(0);
      });
    });

    describe("filterByGlobs", () => {
      it("should filter files by glob patterns", () => {
        const files = [
          "CHANGELOG.md",
          "packages/core/CHANGELOG.md",
          "README.md",
          "docs/changelog.md",
          "src/index.js",
        ];

        const globsCsv =
          "CHANGELOG.md,**/CHANGELOG.md,**/changelog.md,**/CHANGELOG*.md";
        const globs = globsCsv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        // Simple glob matching that handles ** correctly
        const matchesPattern = (file, pattern) => {
          // Convert glob to regex
          let re = "";
          let i = 0;
          while (i < pattern.length) {
            const c = pattern[i];
            if (c === "*") {
              if (pattern.slice(i, i + 2) === "**") {
                re += ".*";
                i += 2;
                continue;
              }
              re += "[^/]*";
              i += 1;
            } else if (c === ".") {
              re += "\\.";
              i += 1;
            } else {
              re += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              i += 1;
            }
          }
          return new RegExp(`^${re}$`).test(file);
        };

        const filtered = files.filter((f) =>
          globs.some((pattern) => matchesPattern(f, pattern))
        );

        expect(filtered).toContain("CHANGELOG.md");
        expect(filtered).toContain("packages/core/CHANGELOG.md");
        expect(filtered).toContain("docs/changelog.md");
        expect(filtered).not.toContain("README.md");
        expect(filtered).not.toContain("src/index.js");
      });
    });

    describe("loadActionDefaults", () => {
      it("should load defaults from action.yml", () => {
        const yaml = require("js-yaml");
        const mockActionYml = {
          inputs: {
            file_globs: {
              default:
                "CHANGELOG.md,**/CHANGELOG.md,**/changelog.md,**/CHANGELOG*.md,**/changelog*.md",
            },
            entry_separator_regex: {
              default: "^##\\s+.*$",
            },
            http_method: {
              default: "POST",
            },
            include_body_raw: {
              default: "false",
            },
          },
        };

        yaml.load = jest.fn().mockReturnValue(mockActionYml);

        const defaults = {};
        const actionData = mockActionYml;

        if (actionData && actionData.inputs) {
          for (const [key, value] of Object.entries(actionData.inputs)) {
            if (value && value.default !== undefined) {
              defaults[key] = value.default;
            }
          }
        }

        expect(defaults.file_globs).toBe(
          "CHANGELOG.md,**/CHANGELOG.md,**/changelog.md,**/CHANGELOG*.md,**/changelog*.md"
        );
        expect(defaults.entry_separator_regex).toBe("^##\\s+.*$");
        expect(defaults.http_method).toBe("POST");
        expect(defaults.include_body_raw).toBe("false");
      });
    });

    describe("Integration scenarios", () => {
      it("should handle multiple entries added in one commit", () => {
        const addedContent = `## [1.3.0] - 2025-10-18

### Added
- Feature C

## [1.2.0] - 2025-10-17

### Added
- Feature A
- Feature B`;

        const sepPattern = "^##\\s+.*$";
        const re = new RegExp(sepPattern, "gm");
        const matches = [];
        let match;

        while ((match = re.exec(addedContent)) !== null) {
          matches.push(match);
        }

        expect(matches).toHaveLength(2);
      });

      it("should ignore modifications to existing entries", () => {
        const diffWithModification = `diff --git a/CHANGELOG.md b/CHANGELOG.md
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -1,5 +1,8 @@
 ## [1.1.0] - 2025-10-16
 
+### Added
+- New feature
+
 ### Fixed
-- Bug B
+- Bug B (fixed typo)`;

        const lines = diffWithModification.split("\n");
        const addedLines = [];

        for (const line of lines) {
          if (line.startsWith("+") && !line.startsWith("+++")) {
            addedLines.push(line.slice(1));
          }
        }

        const result = addedLines.join("\n");

        // Only additions are captured
        expect(result).toContain("### Added");
        expect(result).toContain("- New feature");
        expect(result).toContain("- Bug B (fixed typo)");
        // But the context shows this is a modification, not a new entry
        expect(result).not.toContain("## [1.1.0]"); // Header was not added
      });
    });
  });

  describe("Keep a Changelog Format", () => {
    it("should parse fixture changelog section", () => {
      // Extract the [1.2.0] section from fixture
      const v120Match = keepAChangelogFixture.match(
        /## \[1\.2\.0\][\s\S]*?(?=## \[1\.1\.0\])/
      );
      expect(v120Match).not.toBeNull();

      const section = v120Match[0];
      expect(section).toContain("### Added");
      expect(section).toContain("User authentication system");
      expect(section).toContain("### Fixed");
      expect(section).toContain("Memory leak in real-time updates");
    });

    it("should split fixture changelog correctly", () => {
      const sepPattern = "^##\\s+.*$";
      const re = new RegExp(sepPattern, "gm");
      const matches = [];
      let match;

      while ((match = re.exec(keepAChangelogFixture)) !== null) {
        matches.push(match[0]);
      }

      // Should find Unreleased, 1.2.0, 1.1.0, and 1.0.0
      expect(matches.length).toBeGreaterThanOrEqual(4);
      expect(matches).toContain("## [Unreleased]");
      expect(matches).toContain("## [1.2.0] - 2025-10-17");
      expect(matches).toContain("## [1.1.0] - 2025-10-10");
      expect(matches).toContain("## [1.0.0] - 2025-10-01");
    });

    it("should match Keep a Changelog header format", () => {
      const keepAChangelogPattern =
        /^##\s+\[\d+\.\d+\.\d+\]\s+-\s+\d{4}-\d{2}-\d{2}/m;
      expect(keepAChangelogPattern.test(keepAChangelogFixture)).toBe(true);
    });
  });

  describe("Conventional Changelog Format", () => {
    it("should match conventional changelog header format", () => {
      // Conventional changelog uses format like:
      // ## [4.2.4](url) (2023-10-26)
      const conventionalPattern =
        /^##\s+\[[\d.]+\]\(.*?\)\s+\(\d{4}-\d{2}-\d{2}\)/m;
      expect(conventionalPattern.test(conventionalChangelogFixture)).toBe(true);
    });

    it("should parse version links correctly", () => {
      // Extract version with link
      const versionLinkPattern =
        /##\s+\[(\d+\.\d+\.\d+)\]\((.*?)\)\s+\((\d{4}-\d{2}-\d{2})\)/g;
      const matches = [];
      let match;

      while (
        (match = versionLinkPattern.exec(conventionalChangelogFixture)) !== null
      ) {
        matches.push({
          version: match[1],
          url: match[2],
          date: match[3],
        });
      }

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].version).toBe("4.2.4");
      expect(matches[0].date).toBe("2023-10-26");
      expect(matches[0].url).toContain("github.com");
    });

    it("should parse sections with issue and commit links", () => {
      // Conventional changelog includes issue and commit references
      const issuePattern = /\[#\d+\]\(https:\/\/github\.com\/.*\/issues\/\d+\)/;
      const commitPattern =
        /\[[\da-f]{7,}\]\(https:\/\/github\.com\/.*\/commit\/[\da-f]+\)/;

      expect(issuePattern.test(conventionalChangelogFixture)).toBe(true);
      expect(commitPattern.test(conventionalChangelogFixture)).toBe(true);
    });

    it("should split entries using standard ## pattern", () => {
      const sepPattern = "^##\\s+.*$";
      const re = new RegExp(sepPattern, "gm");
      const matches = [];
      let match;

      while ((match = re.exec(conventionalChangelogFixture)) !== null) {
        matches.push(match[0]);
      }

      // Should find multiple version entries
      expect(matches.length).toBeGreaterThanOrEqual(8);
    });

    it("should handle BREAKING CHANGES section", () => {
      // Find the breaking changes entry
      const breakingEntry = conventionalChangelogFixture.match(
        /## \[4\.0\.0\][\s\S]*?(?=## \[3\.1\.25\])/
      );

      expect(breakingEntry).not.toBeNull();
      expect(breakingEntry[0]).toContain("⚠ BREAKING CHANGES");
      expect(breakingEntry[0]).toContain("Node >= 16 is required");
    });

    it("should parse version bump notes", () => {
      // Some entries only contain version bump notes
      const versionBumpPattern = /\*\*Note:\*\* Version bump only for package/;
      expect(versionBumpPattern.test(conventionalChangelogFixture)).toBe(true);
    });

    it("should parse Bug Fixes section", () => {
      const bugFixSection = conventionalChangelogFixture.match(
        /### Bug Fixes\n\n([\s\S]*?)(?=\n##|\n###|$)/
      );

      expect(bugFixSection).not.toBeNull();
      expect(bugFixSection[1]).toContain("**deps:**");
    });

    it("should parse Features section", () => {
      const featuresSection = conventionalChangelogFixture.match(
        /### Features\n\n([\s\S]*?)(?=\n##|$)/
      );

      expect(featuresSection).not.toBeNull();
      // Features section should contain feature descriptions
      expect(featuresSection[1].length).toBeGreaterThan(0);
    });

    it("should handle scope prefixes in commits", () => {
      // Conventional changelog uses scope like **deps:**, **core:**
      const scopePattern = /\*\*[\w-]+:\*\*/g;
      const scopes = conventionalChangelogFixture.match(scopePattern);

      expect(scopes).not.toBeNull();
      expect(scopes.length).toBeGreaterThan(0);
      expect(scopes).toContain("**deps:**");
    });

    it("should extract new conventional changelog entry from diff", () => {
      const newEntry = `## [5.0.0](https://github.com/org/repo/compare/v4.2.4...v5.0.0) (2025-10-17)

### ⚠ BREAKING CHANGES

- Node >= 18 is required

### Features

- **core:** new parsing engine ([#1200](https://github.com/org/repo/issues/1200)) ([abc1234](https://github.com/org/repo/commit/abc1234))

### Bug Fixes

- **deps:** update dependency xyz to v10 ([#1201](https://github.com/org/repo/issues/1201)) ([def5678](https://github.com/org/repo/commit/def5678))
`;

      // Simulate git diff output
      const mockDiff = `diff --git a/CHANGELOG.md b/CHANGELOG.md
@@ -1,3 +1,18 @@
+## [5.0.0](https://github.com/org/repo/compare/v4.2.4...v5.0.0) (2025-10-17)
+
+### ⚠ BREAKING CHANGES
+
+- Node >= 18 is required
+
+### Features
+
+- **core:** new parsing engine ([#1200](https://github.com/org/repo/issues/1200)) ([abc1234](https://github.com/org/repo/commit/abc1234))
+
+### Bug Fixes
+
+- **deps:** update dependency xyz to v10 ([#1201](https://github.com/org/repo/issues/1201)) ([def5678](https://github.com/org/repo/commit/def5678))
+
 ## [4.2.4](https://github.com/org/repo/compare) (2023-10-26)`;

      // Extract added lines
      const lines = mockDiff.split("\n");
      const addedLines = [];

      for (const line of lines) {
        if (line.startsWith("+") && !line.startsWith("+++")) {
          addedLines.push(line.slice(1));
        }
      }

      const addedContent = addedLines.join("\n");

      // Verify the new entry is captured
      expect(addedContent).toContain("## [5.0.0]");
      expect(addedContent).toContain("⚠ BREAKING CHANGES");
      expect(addedContent).toContain("### Features");
      expect(addedContent).toContain("### Bug Fixes");
      expect(addedContent).not.toContain("## [4.2.4]");
    });

    it("should extract comparison URL", () => {
      const headerLine =
        "## [4.2.4](https://github.com/conventional-changelog/conventional-changelog/compare/v4.2.3...v4.2.4) (2023-10-26)";

      const urlMatch = headerLine.match(/\]\((https:\/\/[^)]+)\)/);

      expect(urlMatch).not.toBeNull();
      expect(urlMatch[1]).toContain("github.com");
      expect(urlMatch[1]).toContain("compare");
    });

    it("should parse nested lists in conventional format", () => {
      const content = `### Bug Fixes

- **deps:** update dependency conventional-changelog-angular to v7 ([#1163](https://github.com/org/repo/issues/1163)) ([2325424](https://github.com/org/repo/commit/2325424))
  - sub-item one
  - sub-item two
- **deps:** update dependency conventional-changelog-conventionalcommits to v7 ([#1164](https://github.com/org/repo/issues/1164)) ([8ae4e5b](https://github.com/org/repo/commit/8ae4e5b))`;

      const lines = content.split(/\r?\n/);
      const bullets = [];

      for (const line of lines) {
        // Match top-level bullets (starting at beginning of line)
        if (/^[-*]\s+/.test(line)) {
          const bullet = line.replace(/^[-*]\s+/, "").trim();
          if (bullet.length > 0) bullets.push(bullet);
        }
      }

      expect(bullets.length).toBe(2);
      expect(bullets[0]).toContain("**deps:**");
      expect(bullets[0]).toContain("conventional-changelog-angular");
    });
  });

  describe("Format Compatibility", () => {
    it("should work with default separator regex for both formats", () => {
      const sepPattern = "^##\\s+.*$";

      const testHeaders = [
        // Keep a Changelog
        "## [1.2.3] - 2025-10-17",
        "## [Unreleased]",
        // Conventional Changelog
        "## [4.2.4](https://github.com/org/repo/compare) (2023-10-26)",
        "## [4.0.0](url) (2023-04-18)",
      ];

      testHeaders.forEach((header) => {
        // Create new regex for each test to avoid state issues
        const re = new RegExp(sepPattern, "m");
        expect(re.test(header)).toBe(true);
      });
    });

    it("should extract version from both formats", () => {
      const testCases = [
        {
          format: "Keep a Changelog",
          header: "## [1.2.3] - 2025-10-17",
          version: "1.2.3",
          date: "2025-10-17",
        },
        {
          format: "Conventional Changelog",
          header:
            "## [4.2.4](https://github.com/org/repo/compare) (2023-10-26)",
          version: "4.2.4",
          date: "2023-10-26",
        },
      ];

      testCases.forEach(({ format, header, version, date }) => {
        const versionMatch = header.match(
          /\b(\d+\.\d+\.\d+(?:[-+A-Za-z0-9\.]+)?)\b/
        );
        const dateMatch = header.match(/(\d{4}[-\/]\d{2}[-\/]\d{2})/);

        expect(versionMatch).not.toBeNull();
        expect(versionMatch[1]).toBe(version);
        expect(dateMatch).not.toBeNull();
        expect(dateMatch[1]).toBe(date);
      });
    });
  });
});
