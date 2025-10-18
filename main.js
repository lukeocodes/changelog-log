"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const yaml = require("js-yaml");
const {
  getAddedLines,
  getChangedFiles,
  filterByGlobs,
  splitEntriesWithParser,
  parseSections,
  extractVersionAndDate,
} = require("./parser");

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

function maskSensitiveHeaders(headers) {
  const masked = {};
  const sensitiveKeys = [
    "authorization",
    "x-api-key",
    "x-dx-logs-key",
    "api-key",
    "apikey",
    "token",
  ];

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      masked[key] = value ? `${value.substring(0, 4)}...` : "[REDACTED]";
    } else {
      masked[key] = value;
    }
  }
  return masked;
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
            const requestDetails = {
              url: `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}${
                u.pathname
              }${u.search || ""}`,
              method: options.method,
              headers: maskSensitiveHeaders(options.headers),
              body: bodyObj,
            };
            const errorMsg = `HTTP ${
              res.statusCode
            }: ${body}\n\nRequest Details:\n${JSON.stringify(
              requestDetails,
              null,
              2
            )}`;
            reject(new Error(errorMsg));
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
  const extraBodyJson = process.env.EXTRA_BODY_JSON || "";
  const httpMethod = (
    process.env.HTTP_METHOD ||
    defaults.http_method ||
    "POST"
  ).toUpperCase();
  const includeBodyRaw =
    String(
      process.env.INCLUDE_BODY_RAW || defaults.include_body_raw || "false"
    ).toLowerCase() === "true";
  const includeGithubContext =
    String(
      process.env.INCLUDE_GITHUB_CONTEXT ||
        defaults.include_github_context ||
        "true"
    ).toLowerCase() === "true";
  const before = process.env.BEFORE || process.env.GITHUB_EVENT_BEFORE || "";
  const after = process.env.AFTER || process.env.GITHUB_SHA || "";

  // Extract GitHub context from environment
  const githubRepository = process.env.GITHUB_REPOSITORY || "";
  const githubRepositoryOwner = process.env.GITHUB_REPOSITORY_OWNER || "";
  const githubRef = process.env.GITHUB_REF || "";
  const githubRefName = process.env.GITHUB_REF_NAME || "";
  const githubWorkflow = process.env.GITHUB_WORKFLOW || "";
  const githubActor = process.env.GITHUB_ACTOR || "";
  const githubServerUrl = process.env.GITHUB_SERVER_URL || "https://github.com";

  // Build project context with intelligent defaults
  const projectName =
    process.env.PROJECT_NAME ||
    (githubRepository ? githubRepository.split("/")[1] : "");
  const projectOwner = process.env.PROJECT_OWNER || githubRepositoryOwner;
  const repositoryUrl =
    process.env.REPOSITORY_URL ||
    (githubRepository ? `${githubServerUrl}/${githubRepository}` : "");

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

  let extraBody = {};
  if (extraBodyJson && extraBodyJson.trim().length > 0) {
    try {
      extraBody = JSON.parse(extraBodyJson);
    } catch (e) {
      coreLog(
        `Invalid EXTRA_BODY_JSON. Using empty extra body. Error: ${String(e)}`
      );
      extraBody = {};
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

    // Get only the lines that were added in this commit
    const addedContent = getAddedLines(before, after, relPath);

    if (!addedContent || addedContent.trim().length === 0) {
      coreLog(`No additions detected in ${relPath}`);
      continue;
    }

    coreLog(`Processing additions from ${relPath}`);

    // Parse the added content to find changelog entries
    const addedEntries = await splitEntriesWithParser(addedContent, sepPattern);

    if (addedEntries.length === 0) {
      coreLog(`No new changelog entries found in additions to ${relPath}`);
      continue;
    }

    for (const entry of addedEntries) {
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

      // Add project context if available
      if (projectName) payload.project = projectName;
      if (projectOwner) payload.owner = projectOwner;
      if (repositoryUrl) payload.repository = repositoryUrl;

      // Add GitHub context if enabled
      if (includeGithubContext) {
        payload.github = {
          repository: githubRepository,
          ref: githubRef,
          refName: githubRefName,
          workflow: githubWorkflow,
          actor: githubActor,
        };
      }

      // Merge extra body fields last so they can override defaults
      Object.assign(payload, extraBody);

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
