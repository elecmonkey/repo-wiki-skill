#!/usr/bin/env node
"use strict";

/**
 * Check whether a generated repository wiki directory is large and structured enough.
 *
 * Usage:
 *   node scripts/wiki_quality_check.js docs/wiki
 *   node scripts/wiki_quality_check.js docs/wiki --profile huge
 */

const fs = require("fs");
const path = require("path");

const PROFILES = {
  large: {
    minMarkdownFiles: 30,
    minWords: 250000,
    minNonBlankLines: 15000,
    minHeadings: 1200,
    minH2: 400,
    minFileRefs: 1800,
    minCodeFences: 80,
    minTables: 120,
  },
  huge: {
    minMarkdownFiles: 80,
    minWords: 600000,
    minNonBlankLines: 35000,
    minHeadings: 2600,
    minH2: 900,
    minFileRefs: 4500,
    minCodeFences: 200,
    minTables: 300,
  },
  massive: {
    minMarkdownFiles: 150,
    minWords: 1200000,
    minNonBlankLines: 70000,
    minHeadings: 5200,
    minH2: 1800,
    minFileRefs: 9000,
    minCodeFences: 400,
    minTables: 600,
  },
};

function usage() {
  console.log(`Usage: node scripts/wiki_quality_check.js <wiki_dir_or_md> [options]\n\nOptions:\n  --profile <large|huge|massive>    Threshold profile, default huge\n  --min-files <number>              Override minimum Markdown file count\n  --min-words <number>              Override minimum word count\n  --min-lines <number>              Override minimum non-blank line count\n  --min-headings <number>           Override minimum heading count\n  --min-h2 <number>                 Override minimum H2 count\n  --min-file-refs <number>          Override minimum backticked path references\n  --min-code-fences <number>        Override minimum fenced code block count\n  --min-tables <number>             Override minimum Markdown table count\n  -h, --help                        Show this help`);
}

function parseArgs(argv) {
  const args = { target: null, profile: "huge", overrides: {} };
  const positional = [];
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else if (arg === "--profile") {
      args.profile = argv[++i];
    } else if (arg === "--min-files") {
      args.overrides.minMarkdownFiles = Number(argv[++i]);
    } else if (arg === "--min-words") {
      args.overrides.minWords = Number(argv[++i]);
    } else if (arg === "--min-lines") {
      args.overrides.minNonBlankLines = Number(argv[++i]);
    } else if (arg === "--min-headings") {
      args.overrides.minHeadings = Number(argv[++i]);
    } else if (arg === "--min-h2") {
      args.overrides.minH2 = Number(argv[++i]);
    } else if (arg === "--min-file-refs") {
      args.overrides.minFileRefs = Number(argv[++i]);
    } else if (arg === "--min-code-fences") {
      args.overrides.minCodeFences = Number(argv[++i]);
    } else if (arg === "--min-tables") {
      args.overrides.minTables = Number(argv[++i]);
    } else {
      positional.push(arg);
    }
  }
  args.target = positional[0] || null;
  if (!args.target) throw new Error("Missing wiki directory or Markdown file path");
  if (!PROFILES[args.profile]) throw new Error(`Unknown profile: ${args.profile}`);
  for (const [key, value] of Object.entries(args.overrides)) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a non-negative number`);
  }
  return args;
}

function collectMarkdownFiles(target) {
  const resolved = path.resolve(target);
  const stats = fs.statSync(resolved);
  if (stats.isFile()) return [resolved];
  if (!stats.isDirectory()) throw new Error(`Target is not a file or directory: ${resolved}`);

  const files = [];
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") walk(full);
      } else if (entry.isFile() && /\.mdx?$/i.test(entry.name)) {
        files.push(full);
      }
    }
  }
  walk(resolved);
  return files;
}

function stripCodeBlocks(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, " ");
}

function countWords(markdown) {
  const text = stripCodeBlocks(markdown)
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
  const cjk = text.match(/[\u3400-\u9fff]/g) || [];
  const words = text.match(/[A-Za-z0-9_]+(?:[-'][A-Za-z0-9_]+)*/g) || [];
  return words.length + cjk.length;
}

function countTables(lines) {
  let tables = 0;
  for (let i = 1; i < lines.length; i += 1) {
    if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i])) {
      if (lines[i - 1] && lines[i - 1].includes("|")) tables += 1;
    }
  }
  return tables;
}

function analyze(files) {
  const totals = {
    markdownFiles: files.length,
    words: 0,
    nonBlankLines: 0,
    headings: 0,
    h2: 0,
    fileRefs: new Set(),
    codeFences: 0,
    tables: 0,
  };

  for (const file of files) {
    const markdown = fs.readFileSync(file, "utf8");
    const lines = markdown.split(/\r?\n/);
    totals.words += countWords(markdown);
    totals.nonBlankLines += lines.filter((line) => line.trim()).length;
    totals.headings += lines.filter((line) => /^#{1,6}\s+\S/.test(line)).length;
    totals.h2 += lines.filter((line) => /^##\s+\S/.test(line)).length;
    totals.codeFences += Math.floor((markdown.match(/^```/gm) || []).length / 2);
    totals.tables += countTables(lines);
    for (const match of markdown.matchAll(/`([^`\n]+\.[A-Za-z0-9]{1,12}(?::\d+)?)`/g)) {
      totals.fileRefs.add(match[1]);
    }
  }

  return {
    ...totals,
    fileRefs: totals.fileRefs.size,
  };
}

function label(key) {
  return {
    markdownFiles: "Markdown files",
    words: "words",
    nonBlankLines: "non-blank lines",
    headings: "headings",
    h2: "H2 sections",
    fileRefs: "unique file references",
    codeFences: "fenced code blocks",
    tables: "Markdown tables",
  }[key];
}

function main() {
  const args = parseArgs(process.argv);
  const target = path.resolve(args.target);
  const files = collectMarkdownFiles(target);
  const thresholds = { ...PROFILES[args.profile], ...args.overrides };
  const metrics = analyze(files);
  const checks = [
    ["markdownFiles", metrics.markdownFiles, thresholds.minMarkdownFiles],
    ["words", metrics.words, thresholds.minWords],
    ["nonBlankLines", metrics.nonBlankLines, thresholds.minNonBlankLines],
    ["headings", metrics.headings, thresholds.minHeadings],
    ["h2", metrics.h2, thresholds.minH2],
    ["fileRefs", metrics.fileRefs, thresholds.minFileRefs],
    ["codeFences", metrics.codeFences, thresholds.minCodeFences],
    ["tables", metrics.tables, thresholds.minTables],
  ];

  console.log(`# Wiki quality check: ${target}`);
  console.log(`Profile: ${args.profile}`);
  console.log(`Markdown files scanned: ${files.length}`);
  console.log("");
  console.log("| Metric | Actual | Minimum | Status |");
  console.log("| --- | ---: | ---: | --- |");

  let ok = true;
  for (const [key, actual, minimum] of checks) {
    const passed = actual >= minimum;
    if (!passed) ok = false;
    console.log(`| ${label(key)} | ${actual} | ${minimum} | ${passed ? "PASS" : "FAIL"} |`);
  }

  console.log("");
  if (!ok) {
    console.error("Wiki is likely too small or under-structured for a large codebase. Add missing pages and expand evidence-backed coverage before finalizing.");
    process.exit(1);
  }
  console.log("Wiki passes minimum size and structure checks.");
}

try {
  main();
} catch (error) {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}
