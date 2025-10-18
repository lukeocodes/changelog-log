"use strict";

const { execSync } = require("child_process");

let changelogParser = null;
try {
  changelogParser = require("changelog-parser");
} catch (_) {
  changelogParser = null;
}

function getAddedLines(beforeSha, afterSha, filePath) {
  if (!afterSha) return "";
  try {
    // Get the unified diff showing only added lines
    let diffCmd;
    if (!beforeSha || /^0+$/.test(beforeSha)) {
      // New file or initial commit - all content is "added"
      diffCmd = `git show ${afterSha}:${filePath}`;
    } else {
      // Get diff between commits, showing added lines only
      diffCmd = `git diff ${beforeSha} ${afterSha} -- ${filePath}`;
    }

    const diffOutput = execSync(diffCmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    if (!beforeSha || /^0+$/.test(beforeSha)) {
      // For new files, return full content
      return diffOutput;
    }

    // Parse unified diff to extract only added lines
    const lines = diffOutput.split("\n");
    const addedLines = [];

    for (const line of lines) {
      // Lines starting with '+' but not '+++' are additions
      if (line.startsWith("+") && !line.startsWith("+++")) {
        // Remove the '+' prefix
        addedLines.push(line.slice(1));
      }
    }

    return addedLines.join("\n");
  } catch (err) {
    console.error(`Failed to get diff for ${filePath}: ${String(err)}`);
    return "";
  }
}

function getChangedFiles(beforeSha, afterSha) {
  if (!afterSha) return [];
  try {
    if (!beforeSha || /^0+$/.test(beforeSha)) {
      const list = execSync("git ls-files", { encoding: "utf8" });
      return list.split("\n").filter(Boolean);
    }
    const diff = execSync(`git diff --name-only ${beforeSha} ${afterSha}`, {
      encoding: "utf8",
    });
    return diff.split("\n").filter(Boolean);
  } catch (err) {
    console.error(`Failed to compute changed files: ${String(err)}`);
    return [];
  }
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globToRegExp(glob) {
  let re = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "**"[0]) {
        if (glob.slice(i, i + 2) === "**") {
          re += ".*";
          i += 2;
          continue;
        }
      }
      re += "[^/]*";
      i += 1;
    } else if (c === "?") {
      re += ".";
      i += 1;
    } else if (c === ".") {
      re += "\\.";
      i += 1;
    } else if (c === "/") {
      re += "/";
      i += 1;
    } else {
      re += escapeRegExp(c);
      i += 1;
    }
  }
  return new RegExp(`^${re}$`);
}

function filterByGlobs(files, globsCsv) {
  const globs = (globsCsv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (globs.length === 0) return files;
  const patterns = globs.map(globToRegExp);
  return files.filter((f) => patterns.some((p) => p.test(f)));
}

function getLineAt(text, idx) {
  let start = text.lastIndexOf("\n", idx) + 1;
  if (start < 0) start = 0;
  let end = text.indexOf("\n", idx);
  if (end === -1) end = text.length;
  return text.slice(start, end);
}

function splitEntries(content, sepPattern) {
  if (!content) return [];
  const re = new RegExp(sepPattern, "gm");
  const indices = [];
  let match;
  while ((match = re.exec(content)) !== null) {
    indices.push({
      index: match.index,
      header: getLineAt(content, match.index).trim(),
    });
  }
  if (indices.length === 0) return [];
  const entries = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].index;
    const end = i + 1 < indices.length ? indices[i + 1].index : content.length;
    const slice = content.slice(start, end).trim();
    entries.push({ header: indices[i].header, text: slice });
  }
  return entries;
}

async function splitEntriesWithParser(content, sepPattern) {
  if (!content) return [];
  if (!changelogParser) return splitEntries(content, sepPattern);
  try {
    const parsed = await changelogParser({ text: content });
    const versions = Array.isArray(parsed && parsed.versions)
      ? parsed.versions
      : [];
    if (versions.length === 0) return splitEntries(content, sepPattern);
    const results = [];
    for (const v of versions) {
      const title = v.title || v.version || "Unreleased";
      const dateStr = v.date ? ` - ${v.date}` : "";
      const header = `## ${title}${dateStr}`.trim();
      const body = (v.body || "").trim();
      const text = `${header}\n${body}`.trim();
      results.push({ header, text });
    }
    return results;
  } catch (err) {
    console.error(`Parser fallback due to error: ${String(err)}`);
    return splitEntries(content, sepPattern);
  }
}

function parseSections(entryText) {
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
  return sections;
}

function extractVersionAndDate(headerLine) {
  const versionMatch = headerLine.match(
    /\b(\d+\.\d+\.\d+(?:[-+A-Za-z0-9\.]+)?)\b/
  );
  const dateMatch = headerLine.match(/(\d{4}[-\/]\d{2}[-\/]\d{2})/);
  return {
    version: versionMatch ? versionMatch[1] : null,
    date: dateMatch ? dateMatch[1] : null,
  };
}

module.exports = {
  getAddedLines,
  getChangedFiles,
  escapeRegExp,
  globToRegExp,
  filterByGlobs,
  splitEntries,
  splitEntriesWithParser,
  parseSections,
  extractVersionAndDate,
};
