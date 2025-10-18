#!/usr/bin/env node
"use strict";

const fs = require("fs");
const {
  parseSections,
  extractVersionAndDate,
  splitEntries,
} = require("./parser");

async function cli() {
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes("-h") || args.includes("--help")) {
    console.log("Changelog Parser CLI");
    console.log("");
    console.log("Usage:");
    console.log(
      "  node cli.js <file>              # Parse latest entry from changelog"
    );
    console.log("  cat file | node cli.js          # Parse from stdin");
    console.log("");
    console.log("Options:");
    console.log("  -h, --help                      # Show this help message");
    console.log(
      '  --extra \'{"key":"value"}\'       # Add extra fields to output'
    );
    console.log(
      "  --all                           # Parse all entries instead of just latest"
    );
    console.log("");
    console.log("Examples:");
    console.log(
      "  node cli.js CHANGELOG.md                              # Parse latest entry"
    );
    console.log(
      "  node cli.js CHANGELOG.md --all                        # Parse all entries"
    );
    console.log(
      '  node cli.js CHANGELOG.md --extra \'{"project":"myapp"}\' # Add custom fields'
    );
    process.exit(0);
  }

  // Parse options
  const parseAll = args.includes("--all");

  let extraBody = {};
  const extraIndex = args.indexOf("--extra");
  let extraValue = null;

  if (extraIndex !== -1 && args[extraIndex + 1]) {
    extraValue = args[extraIndex + 1];
    try {
      extraBody = JSON.parse(extraValue);
    } catch (err) {
      console.error(`Error parsing --extra JSON: ${err.message}`);
      process.exit(1);
    }
  }

  // Get input source - find first arg that's not a flag or extra value
  let input = "";
  const fileArg = args.find(
    (arg, idx) =>
      !arg.startsWith("-") &&
      arg !== extraValue &&
      (idx === 0 || args[idx - 1] !== "--extra")
  );

  if (fileArg) {
    // Read from file
    try {
      input = fs.readFileSync(fileArg, "utf8");
    } catch (err) {
      console.error(`Error reading file: ${err.message}`);
      process.exit(1);
    }
  } else {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    input = Buffer.concat(chunks).toString("utf8");
  }

  if (!input.trim()) {
    console.error("Error: No input provided");
    console.error("Use --help for usage information");
    process.exit(1);
  }

  // Split the changelog into entries
  const sepPattern = "^##\\s+.*$";
  const entries = splitEntries(input, sepPattern);

  if (entries.length === 0) {
    console.error("Error: No changelog entries found");
    process.exit(1);
  }

  // Parse entries
  const results = [];
  const entriesToProcess = parseAll ? entries : [entries[0]];

  for (const entry of entriesToProcess) {
    const sections = parseSections(entry.text);
    const meta = extractVersionAndDate(entry.header);

    const payload = {
      header: entry.header,
      version: meta.version,
      date: meta.date,
      sections,
      ...extraBody,
    };

    results.push(payload);
  }

  // Output as array if multiple, single object if one
  if (results.length === 1) {
    console.log(JSON.stringify(results[0], null, 2));
  } else {
    console.log(JSON.stringify(results, null, 2));
  }
}

cli().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
