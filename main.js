"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const http = require("http");
const https = require("https");
const yaml = require("js-yaml");

let changelogParser = null;
try {
  changelogParser = require("changelog-parser");
} catch (_) {
  changelogParser = null;
}

function loadActionDefaults() {
  const defaults = {};
  try {
    const actionPath = path.join(__dirname, "action.yml");
    const actionContent = fs.readFileSync(actionPath, "utf8");
    const actionData = yaml.load(actionContent);

    if (actionData && actionData.inputs) {
      for (const [key, value] of Object.entries(actionData.inputs)) {
        if (value && value.default !== undefined) {
          defaults[key] = value.default;
        }
      }
    }
  } catch (err) {
    // If action.yml can't be read, we'll use inline fallbacks
    coreLog(`Warning: Could not load action.yml defaults: ${String(err)}`);
  }
  return defaults;
}

function readFileAtCommit(commitSha, filePath) {
  if (!commitSha || /^0+$/.test(commitSha)) {
    return "";
  }
  try {
    const out = execSync(`git show ${commitSha}:${filePath}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out;
  } catch (_) {
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
    coreLog(`Failed to compute changed files: ${String(err)}`);
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
    coreLog(`Parser fallback due to error: ${String(err)}`);
    return splitEntries(content, sepPattern);
  }
}

function getLineAt(text, idx) {
  let start = text.lastIndexOf("\n", idx) + 1;
  if (start < 0) start = 0;
  let end = text.indexOf("\n", idx);
  if (end === -1) end = text.length;
  return text.slice(start, end);
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

function postJSON(urlStr, method, extraHeaders, bodyObj) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const data = Buffer.from(JSON.stringify(bodyObj));
      const isHttps = u.protocol === "https:";
      const options = {
        method: method || "POST",
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + (u.search || ""),
        headers: Object.assign(
          {
            "Content-Type": "application/json",
            "Content-Length": String(data.length),
          },
          extraHeaders || {}
        ),
      };
      const req = (isHttps ? https : http).request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function coreLog(msg) {
  process.stdout.write(`${msg}\n`);
}

async function run() {
  const defaults = loadActionDefaults();

  const fileGlobs =
    process.env.FILE_GLOBS ||
    defaults.file_globs ||
    "CHANGELOG.md,**/CHANGELOG.md,**/changelog.md,**/CHANGELOG*.md,**/changelog*.md";
  const sepPattern =
    process.env.ENTRY_SEPARATOR_REGEX ||
    defaults.entry_separator_regex ||
    "^##\\s+.*$";
  const webhookUrl = process.env.WEBHOOK_URL;
  const headersJson = process.env.WEBHOOK_HEADERS_JSON || "";
  const httpMethod = (
    process.env.HTTP_METHOD ||
    defaults.http_method ||
    "POST"
  ).toUpperCase();
  const includeBodyRaw =
    String(
      process.env.INCLUDE_BODY_RAW || defaults.include_body_raw || "false"
    ).toLowerCase() === "true";
  const before = process.env.BEFORE || process.env.GITHUB_EVENT_BEFORE || "";
  const after = process.env.AFTER || process.env.GITHUB_SHA || "";

  if (!webhookUrl) {
    throw new Error("WEBHOOK_URL is required");
  }

  let extraHeaders = {};
  if (headersJson && headersJson.trim().length > 0) {
    try {
      extraHeaders = JSON.parse(headersJson);
    } catch (e) {
      coreLog(
        `Invalid WEBHOOK_HEADERS_JSON. Using empty headers. Error: ${String(e)}`
      );
      extraHeaders = {};
    }
  }

  const changed = filterByGlobs(getChangedFiles(before, after), fileGlobs);
  if (changed.length === 0) {
    coreLog("No changed changelog files detected.");
    return;
  }

  coreLog(`Changed candidate files: ${JSON.stringify(changed)}`);

  for (const relPath of changed) {
    const absPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(absPath)) continue;

    const newContent = fs.readFileSync(absPath, "utf8");
    const oldContent = readFileAtCommit(before, relPath);

    const newEntries = await splitEntriesWithParser(newContent, sepPattern);
    const oldEntries = await splitEntriesWithParser(oldContent, sepPattern);

    const oldHeaders = new Set(oldEntries.map((e) => e.header));
    const newlyAdded = newEntries.filter((e) => !oldHeaders.has(e.header));

    if (newlyAdded.length === 0) {
      coreLog(`No new entries detected in ${relPath}`);
      continue;
    }

    for (const entry of newlyAdded) {
      const sections = parseSections(entry.text);
      const meta = extractVersionAndDate(entry.header);
      const payload = {
        filePath: relPath,
        commit: { before, after },
        header: entry.header,
        version: meta.version,
        date: meta.date,
        sections,
      };
      if (includeBodyRaw) payload.bodyRaw = entry.text;

      coreLog(`Posting changelog entry from ${relPath}: ${entry.header}`);
      try {
        const res = await postJSON(
          webhookUrl,
          httpMethod,
          extraHeaders,
          payload
        );
        coreLog(`Posted successfully: HTTP ${res.statusCode}`);
      } catch (err) {
        coreLog(`Failed to post entry: ${String(err)}`);
      }
    }
  }
}

run().catch((err) => {
  process.stderr.write(`${String(err)}\n`);
  process.exit(1);
});
