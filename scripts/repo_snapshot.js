#!/usr/bin/env node
"use strict";

/**
 * Generate a Markdown snapshot to guide whole-repository wiki creation.
 *
 * Usage:
 *   node scripts/repo_snapshot.js <repo_root> --output /tmp/repo-snapshot.md
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_EXCLUDE_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  ".idea",
  ".vscode",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "target",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "__pycache__",
]);

const IMPORTANT_NAMES = new Set([
  "README",
  "README.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "LICENSE",
  "Makefile",
  "Dockerfile",
  "docker-compose.yml",
  "package.json",
  "pnpm-workspace.yaml",
  "yarn.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "Cargo.toml",
  "Cargo.lock",
  "go.mod",
  "go.sum",
  "pyproject.toml",
  "requirements.txt",
  "requirements-dev.txt",
  "setup.py",
  "pom.xml",
  "build.gradle",
  "settings.gradle",
  "tsconfig.json",
  "vite.config.ts",
  "webpack.config.js",
  "rollup.config.js",
  "eslint.config.js",
  ".eslintrc",
  ".prettierrc",
]);

const LANG_BY_EXT = new Map([
  [".ts", "TypeScript"],
  [".tsx", "TypeScript React"],
  [".js", "JavaScript"],
  [".jsx", "JavaScript React"],
  [".mjs", "JavaScript"],
  [".cjs", "JavaScript"],
  [".py", "Python"],
  [".rs", "Rust"],
  [".go", "Go"],
  [".java", "Java"],
  [".kt", "Kotlin"],
  [".kts", "Kotlin"],
  [".c", "C"],
  [".h", "C/C++ Header"],
  [".cc", "C++"],
  [".cpp", "C++"],
  [".hpp", "C++ Header"],
  [".cs", "C#"],
  [".rb", "Ruby"],
  [".php", "PHP"],
  [".swift", "Swift"],
  [".scala", "Scala"],
  [".sh", "Shell"],
  [".bash", "Shell"],
  [".zsh", "Shell"],
  [".sql", "SQL"],
  [".md", "Markdown"],
  [".mdx", "MDX"],
  [".json", "JSON"],
  [".yaml", "YAML"],
  [".yml", "YAML"],
  [".toml", "TOML"],
  [".xml", "XML"],
  [".html", "HTML"],
  [".css", "CSS"],
  [".scss", "SCSS"],
]);

function parseArgs(argv) {
  const args = {
    root: ".",
    output: null,
    maxFiles: 800,
    excludeDirs: [],
  };
  const positional = [];
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output" || arg === "-o") {
      args.output = argv[++i];
    } else if (arg === "--max-files") {
      args.maxFiles = Number(argv[++i]);
    } else if (arg === "--exclude-dir") {
      args.excludeDirs.push(argv[++i]);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length > 0) args.root = positional[0];
  if (!Number.isFinite(args.maxFiles) || args.maxFiles < 1) {
    throw new Error("--max-files must be a positive number");
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/repo_snapshot.js [repo_root] [options]\n\nOptions:\n  -o, --output <file>       Write Markdown to this file instead of stdout\n      --max-files <number>  Maximum file paths in tree sample, default 800\n      --exclude-dir <name>  Exclude a directory name; may be repeated\n  -h, --help                Show this help`);
}

function shouldSkipDir(name, excludes) {
  return excludes.has(name) || (name.startsWith(".") && name !== ".github" && name !== ".gitlab");
}

function walkFiles(root, excludes) {
  const files = [];
  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!shouldSkipDir(entry.name, excludes)) walk(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  }
  walk(root);
  return files;
}

function relativePath(file, root) {
  return path.relative(root, file).split(path.sep).join("/");
}

function topDir(relative) {
  return relative.includes("/") ? relative.split("/", 1)[0] : ".";
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function sortedEntriesByCount(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function lineCount(file) {
  try {
    const text = fs.readFileSync(file, "utf8");
    if (text.length === 0) return 0;
    return text.split("\n").length;
  } catch {
    return null;
  }
}

function buildMarkdown(root, files, maxFiles) {
  const relatives = files.map((file) => relativePath(file, root));
  const byTop = new Map();
  const byExt = new Map();
  const byLang = new Map();

  for (const file of files) {
    const relative = relativePath(file, root);
    const ext = path.extname(file).toLowerCase() || "[no extension]";
    increment(byTop, topDir(relative));
    increment(byExt, ext);
    increment(byLang, LANG_BY_EXT.get(ext) || "Other");
  }

  const important = [];
  const tests = [];
  const likelyEntrypoints = [];
  const largest = [];

  for (const file of files) {
    const relative = relativePath(file, root);
    const name = path.basename(file);
    const stem = name.replace(path.extname(name), "");
    const lower = relative.toLowerCase();

    if (
      IMPORTANT_NAMES.has(name) ||
      IMPORTANT_NAMES.has(stem) ||
      relative.startsWith("docs/") ||
      relative.startsWith(".github/") ||
      relative.startsWith(".gitlab/")
    ) {
      important.push(relative);
    }

    if (lower.includes("test") || lower.includes("spec") || lower.includes("fixture")) {
      tests.push(relative);
    }

    if (
      relative.endsWith("main.go") ||
      relative.endsWith("main.rs") ||
      relative.endsWith("index.ts") ||
      relative.endsWith("index.tsx") ||
      relative.endsWith("index.js") ||
      relative.endsWith("cli.ts") ||
      relative.endsWith("cli.js") ||
      relative.endsWith("app.py") ||
      relative.endsWith("server.py") ||
      relative.includes("/bin/") ||
      relative.startsWith("cmd/")
    ) {
      likelyEntrypoints.push(relative);
    }

    const ext = path.extname(file).toLowerCase();
    if (LANG_BY_EXT.has(ext) || ext === ".txt" || ext === "") {
      const count = lineCount(file);
      if (count !== null) largest.push([count, relative]);
    }
  }

  largest.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1]));
  relatives.sort();

  const out = [];
  out.push(`# Repository Snapshot: \`${root}\``);
  out.push("");
  out.push("## Summary");
  out.push("");
  out.push(`- Files scanned: ${files.length}`);
  out.push(`- Top-level areas: ${byTop.size}`);
  out.push("");

  out.push("## Top-Level Areas");
  out.push("");
  out.push("| Area | File count |");
  out.push("| --- | ---: |");
  for (const [area, count] of sortedEntriesByCount(byTop)) out.push(`| \`${area}\` | ${count} |`);
  out.push("");

  out.push("## Languages and File Types");
  out.push("");
  out.push("| Language/type | Files |");
  out.push("| --- | ---: |");
  for (const [lang, count] of sortedEntriesByCount(byLang)) out.push(`| ${lang} | ${count} |`);
  out.push("");
  out.push("| Extension | Files |");
  out.push("| --- | ---: |");
  for (const [ext, count] of sortedEntriesByCount(byExt).slice(0, 30)) out.push(`| \`${ext}\` | ${count} |`);
  out.push("");

  out.push("## Important Documentation and Config Candidates");
  out.push("");
  for (const item of [...new Set(important)].sort().slice(0, 200)) out.push(`- \`${item}\``);
  if (important.length === 0) out.push("- None detected by filename heuristics.");
  out.push("");

  out.push("## Likely Entrypoints");
  out.push("");
  for (const item of [...new Set(likelyEntrypoints)].sort().slice(0, 200)) out.push(`- \`${item}\``);
  if (likelyEntrypoints.length === 0) out.push("- None detected by filename heuristics; inspect package metadata and source roots manually.");
  out.push("");

  out.push("## Tests, Specs, and Fixtures");
  out.push("");
  for (const item of [...new Set(tests)].sort().slice(0, 200)) out.push(`- \`${item}\``);
  if (tests.length === 0) out.push("- None detected by filename heuristics.");
  out.push("");

  out.push("## Largest Text/Code Files");
  out.push("");
  out.push("| Lines | File |");
  out.push("| ---: | --- |");
  for (const [count, item] of largest.slice(0, 25)) out.push(`| ${count} | \`${item}\` |`);
  out.push("");

  out.push(`## File Tree Sample (first ${Math.min(maxFiles, relatives.length)} files)`);
  out.push("");
  for (const item of relatives.slice(0, maxFiles)) out.push(`- \`${item}\``);
  if (relatives.length > maxFiles) out.push(`- ... ${relatives.length - maxFiles} more files omitted by --max-files`);
  out.push("");

  out.push("## Suggested Reading Plan");
  out.push("");
  out.push("1. Read root README and package/build metadata.");
  out.push("2. Inspect likely entrypoints and source roots.");
  out.push("3. Trace the primary runtime path end-to-end.");
  out.push("4. Read tests around core modules to confirm behavior and edge cases.");
  out.push("5. Review build, CI, release, and operational configuration.");
  out.push("6. Draft the wiki, then verify every top-level area is covered.");
  out.push("");

  return out.join("\n");
}

function main() {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Root is not a directory: ${root}`);
  }
  const excludes = new Set([...DEFAULT_EXCLUDE_DIRS, ...args.excludeDirs]);
  const files = walkFiles(root, excludes);
  const markdown = buildMarkdown(root, files, args.maxFiles);
  if (args.output) {
    fs.writeFileSync(path.resolve(args.output), markdown, "utf8");
  } else {
    process.stdout.write(markdown + "\n");
  }
}

try {
  main();
} catch (error) {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}
