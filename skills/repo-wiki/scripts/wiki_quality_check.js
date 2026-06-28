#!/usr/bin/env node
"use strict";

/**
 * Check whether a generated repository wiki directory is large, structured,
 * and not obviously padded with repeated templates or file-index shards.
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
    minDeepDivePages: 12,
    minDeepDivePageWords: 1200,
    minDeepDiveFileRefsPerPage: 8,
    minDeepDiveSignalsPerPage: 4,
    maxIndexPageRatio: 0.45,
    maxRepeatedLineRatio: 0.18,
    maxRepeatedParagraphRatio: 0.12,
    maxBannedPhraseHits: 0,
    maxGenericPhraseHits: 20,
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
    minDeepDivePages: 25,
    minDeepDivePageWords: 1500,
    minDeepDiveFileRefsPerPage: 10,
    minDeepDiveSignalsPerPage: 5,
    maxIndexPageRatio: 0.4,
    maxRepeatedLineRatio: 0.16,
    maxRepeatedParagraphRatio: 0.1,
    maxBannedPhraseHits: 0,
    maxGenericPhraseHits: 40,
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
    minDeepDivePages: 45,
    minDeepDivePageWords: 1800,
    minDeepDiveFileRefsPerPage: 12,
    minDeepDiveSignalsPerPage: 5,
    maxIndexPageRatio: 0.35,
    maxRepeatedLineRatio: 0.14,
    maxRepeatedParagraphRatio: 0.08,
    maxBannedPhraseHits: 0,
    maxGenericPhraseHits: 80,
  },
};

const DEEP_DIVE_PATTERNS = [
  /\barchitecture\b/i,
  /\bdesign\b/i,
  /\bflow(s)?\b/i,
  /\bruntime\b/i,
  /\balgorithm(s)?\b/i,
  /\binvariant(s)?\b/i,
  /\bfailure[-_ ]?mode(s)?\b/i,
  /\bmaintainer[-_ ]?notes?\b/i,
  /\btesting\b/i,
  /\bsubsystem(s)?\b/i,
  /(^|\/)architecture\//i,
  /(^|\/)subsystems\//i,
  /架构/,
  /设计/,
  /流程/,
  /算法/,
  /不变量/,
  /失败模式/,
  /维护/,
  /测试/,
  /子系统/,
];

const INDEX_PAGE_PATTERNS = [
  /(^|\/)file[-_ ]?index/i,
  /(^|\/)symbol[-_ ]?index/i,
  /(^|\/)reference\/.*index/i,
  /文件索引/,
  /符号索引/,
];

const BANNED_PADDING_PATTERNS = [
  /维护视角\s*\d+/g,
  /本页是自动生成的/g,
  /This page is automatically generated/gi,
  /Generated\s+\d+\s+pages?/gi,
  /该文件位于.*顶层区域为/g,
];

const GENERIC_PADDING_PATTERNS = [
  /需要维护者确认/g,
  /修改前先查看同目录测试/g,
  /先把这些文件当作证据入口/g,
  /入口、数据结构、执行路径、错误路径、测试/g,
  /run the narrowest tests?/gi,
  /needs maintainer confirmation/gi,
];

const DEEP_DIVE_SIGNAL_PATTERNS = {
  design: [/\bdesign\b/i, /\barchitecture\b/i, /架构/, /设计/],
  flow: [/\bflow(s)?\b/i, /\bruntime\b/i, /\bsequence\b/i, /流程/, /调用链/, /数据流/, /控制流/],
  tradeoff: [/\btrade[- ]?off(s)?\b/i, /\balternative(s)?\b/i, /\bdecision(s)?\b/i, /取舍/, /权衡/, /决策/, /替代方案/],
  invariant: [/\binvariant(s)?\b/i, /\bcontract(s)?\b/i, /\bassumption(s)?\b/i, /不变量/, /约束/, /契约/, /假设/],
  failure: [/\bfailure[-_ ]?mode(s)?\b/i, /\berror path(s)?\b/i, /\brecover(y|ies)\b/i, /失败模式/, /错误路径/, /恢复/, /边界情况/],
  testing: [/\btest(s|ing)?\b/i, /\bfixture(s)?\b/i, /\bsnapshot(s)?\b/i, /测试/, /快照/, /覆盖/],
  maintainer: [/\bmaintainer(s)?\b/i, /\bsafe edit(s)?\b/i, /\brisk(s)?\b/i, /维护/, /安全修改/, /风险/],
};

function usage() {
  console.log(`Usage: node scripts/wiki_quality_check.js <wiki_dir_or_md> [options]\n\nOptions:\n  --profile <large|huge|massive>     Threshold profile (ignored when --loc is set)\n  --loc <number>                     Project lines of code; computes thresholds dynamically\n  --min-files <number>               Override minimum Markdown file count\n  --min-words <number>               Override minimum word count\n  --min-lines <number>               Override minimum non-blank line count\n  --min-headings <number>            Override minimum heading count\n  --min-h2 <number>                  Override minimum H2 count\n  --min-file-refs <number>           Override minimum backticked path references\n  --min-code-fences <number>         Override minimum fenced code block count\n  --min-tables <number>              Override minimum Markdown table count\n  --min-deep-dive-pages <number>     Override minimum qualified deep-dive page count\n  --min-deep-dive-page-words <number> Override words required for each qualified deep-dive page\n  --min-deep-dive-file-refs <number> Override file references required for each qualified deep-dive page\n  --min-deep-dive-signals <number>   Override distinct design-quality signals required per deep-dive page\n  --max-index-page-ratio <number>    Override maximum index/catalog page ratio, 0-1\n  --max-repeated-line-ratio <number> Override maximum repeated non-trivial line ratio, 0-1\n  --max-repeated-paragraph-ratio <number> Override maximum repeated paragraph ratio, 0-1\n  --max-banned-phrase-hits <number>  Override maximum known padding phrase hits\n  --max-generic-phrase-hits <number> Override maximum generic caution/padding phrase hits\n  -h, --help                         Show this help`);
}

function computeFromLoc(loc) {
  const minMarkdownFiles = Math.max(10, Math.round(loc / 2000));
  const minWords = Math.round(loc * 4);
  const minNonBlankLines = Math.round(minWords * 0.06);
  const minHeadings = Math.round(minWords / 200);
  const minH2 = Math.round(minHeadings / 3);
  const minFileRefs = Math.round(loc * 0.07);
  const minCodeFences = Math.max(20, Math.round(minMarkdownFiles * 2));
  const minTables = Math.max(15, Math.round(minMarkdownFiles * 3));
  const minDeepDivePages = Math.max(5, Math.round(minMarkdownFiles * 0.3));
  return {
    minMarkdownFiles,
    minWords,
    minNonBlankLines,
    minHeadings,
    minH2,
    minFileRefs,
    minCodeFences,
    minTables,
    minDeepDivePages,
    minDeepDivePageWords: 800,
    minDeepDiveFileRefsPerPage: 6,
    minDeepDiveSignalsPerPage: 4,
    maxIndexPageRatio: 0.45,
    maxRepeatedLineRatio: 0.18,
    maxRepeatedParagraphRatio: 0.12,
    maxBannedPhraseHits: 0,
    maxGenericPhraseHits: Math.max(10, Math.round(loc / 2000)),
  };
}

function parseArgs(argv) {
  const args = { target: null, profile: "huge", loc: null, overrides: {} };
  const positional = [];
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else if (arg === "--profile") {
      args.profile = argv[++i];
    } else if (arg === "--loc") {
      args.loc = Number(argv[++i]);
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
    } else if (arg === "--min-deep-dive-pages") {
      args.overrides.minDeepDivePages = Number(argv[++i]);
    } else if (arg === "--min-deep-dive-page-words") {
      args.overrides.minDeepDivePageWords = Number(argv[++i]);
    } else if (arg === "--min-deep-dive-file-refs") {
      args.overrides.minDeepDiveFileRefsPerPage = Number(argv[++i]);
    } else if (arg === "--min-deep-dive-signals") {
      args.overrides.minDeepDiveSignalsPerPage = Number(argv[++i]);
    } else if (arg === "--max-index-page-ratio") {
      args.overrides.maxIndexPageRatio = Number(argv[++i]);
    } else if (arg === "--max-repeated-line-ratio") {
      args.overrides.maxRepeatedLineRatio = Number(argv[++i]);
    } else if (arg === "--max-repeated-paragraph-ratio") {
      args.overrides.maxRepeatedParagraphRatio = Number(argv[++i]);
    } else if (arg === "--max-banned-phrase-hits") {
      args.overrides.maxBannedPhraseHits = Number(argv[++i]);
    } else if (arg === "--max-generic-phrase-hits") {
      args.overrides.maxGenericPhraseHits = Number(argv[++i]);
    } else {
      positional.push(arg);
    }
  }
  args.target = positional[0] || null;
  if (!args.target) throw new Error("Missing wiki directory or Markdown file path");
  if (!args.loc && !PROFILES[args.profile]) throw new Error(`Unknown profile: ${args.profile}`);
  if (args.loc !== null && (!Number.isFinite(args.loc) || args.loc <= 0)) throw new Error("--loc must be a positive number");
  for (const [key, value] of Object.entries(args.overrides)) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a non-negative number`);
    if (key.startsWith("max") && key.endsWith("Ratio") && value > 1) throw new Error(`${key} must be between 0 and 1`);
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

function normalizeLine(line) {
  return line
    .trim()
    .replace(/`[^`]+`/g, "`<code>`")
    .replace(/\d+/g, "<n>")
    .replace(/\s+/g, " ");
}

function normalizeParagraph(paragraph) {
  return paragraph
    .trim()
    .replace(/`[^`]+`/g, "`<code>`")
    .replace(/\d+/g, "<n>")
    .replace(/\s+/g, " ");
}

function repeatedRatio(counts) {
  let total = 0;
  let repeated = 0;
  for (const count of counts.values()) {
    total += count;
    if (count > 1) repeated += count - 1;
  }
  return total === 0 ? 0 : repeated / total;
}

function matchesAny(value, patterns) {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

function countMatches(markdown, patterns) {
  let hits = 0;
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    hits += (markdown.match(pattern) || []).length;
  }
  return hits;
}

function countDeepDiveSignals(markdown) {
  let signals = 0;
  for (const patterns of Object.values(DEEP_DIVE_SIGNAL_PATTERNS)) {
    if (matchesAny(markdown, patterns)) signals += 1;
  }
  return signals;
}

function collectFileRefs(markdown) {
  const refs = new Set();
  for (const match of markdown.matchAll(/`([^`\n]+\.[A-Za-z0-9]{1,12}(?::\d+)?)`/g)) {
    refs.add(match[1]);
  }
  return refs;
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function analyze(files, targetRoot, thresholds) {
  const totals = {
    markdownFiles: files.length,
    words: 0,
    nonBlankLines: 0,
    headings: 0,
    h2: 0,
    fileRefs: new Set(),
    codeFences: 0,
    tables: 0,
    deepDivePages: 0,
    deepDiveCandidatePages: 0,
    indexPages: 0,
    bannedPhraseHits: 0,
    genericPhraseHits: 0,
  };

  const repeatedLines = new Map();
  const repeatedParagraphs = new Map();

  for (const file of files) {
    const markdown = fs.readFileSync(file, "utf8");
    const lines = markdown.split(/\r?\n/);
    const relative = path.relative(targetRoot, file).split(path.sep).join("/");
    const pageWords = countWords(markdown);
    const pageFileRefs = collectFileRefs(markdown);

    totals.words += pageWords;
    totals.nonBlankLines += lines.filter((line) => line.trim()).length;
    totals.headings += lines.filter((line) => /^#{1,6}\s+\S/.test(line)).length;
    totals.h2 += lines.filter((line) => /^##\s+\S/.test(line)).length;
    totals.codeFences += Math.floor((markdown.match(/^```/gm) || []).length / 2);
    totals.tables += countTables(lines);
    for (const fileRef of pageFileRefs) totals.fileRefs.add(fileRef);

    const firstLines = lines.slice(0, 8).join("\n");
    const isDeepDiveCandidate = matchesAny(relative, DEEP_DIVE_PATTERNS) || matchesAny(firstLines, DEEP_DIVE_PATTERNS);
    if (isDeepDiveCandidate) {
      totals.deepDiveCandidatePages += 1;
      const signals = countDeepDiveSignals(markdown);
      if (
        pageWords >= thresholds.minDeepDivePageWords &&
        pageFileRefs.size >= thresholds.minDeepDiveFileRefsPerPage &&
        signals >= thresholds.minDeepDiveSignalsPerPage
      ) {
        totals.deepDivePages += 1;
      }
    }
    if (matchesAny(relative, INDEX_PAGE_PATTERNS) || matchesAny(firstLines, INDEX_PAGE_PATTERNS)) totals.indexPages += 1;
    totals.bannedPhraseHits += countMatches(markdown, BANNED_PADDING_PATTERNS);
    totals.genericPhraseHits += countMatches(markdown, GENERIC_PADDING_PATTERNS);

    for (const line of lines) {
      const normalized = normalizeLine(line);
      if (normalized.length >= 80 && !normalized.startsWith("|") && !normalized.startsWith("```")) increment(repeatedLines, normalized);
    }
    for (const paragraph of stripCodeBlocks(markdown).split(/\n\s*\n/)) {
      const normalized = normalizeParagraph(paragraph);
      if (normalized.length >= 160 && !normalized.startsWith("|")) increment(repeatedParagraphs, normalized);
    }
  }

  return {
    ...totals,
    fileRefs: totals.fileRefs.size,
    indexPageRatio: totals.markdownFiles === 0 ? 0 : totals.indexPages / totals.markdownFiles,
    repeatedLineRatio: repeatedRatio(repeatedLines),
    repeatedParagraphRatio: repeatedRatio(repeatedParagraphs),
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
    deepDivePages: "qualified deep-dive pages",
    deepDiveCandidatePages: "deep-dive candidate pages",
    indexPageRatio: "index/catalog page ratio",
    repeatedLineRatio: "repeated long line ratio",
    repeatedParagraphRatio: "repeated paragraph ratio",
    bannedPhraseHits: "known padding phrase hits",
    genericPhraseHits: "generic caution/padding phrase hits",
  }[key];
}

function formatValue(value) {
  return typeof value === "number" && value > 0 && value < 1 ? value.toFixed(3) : String(value);
}

function main() {
  const args = parseArgs(process.argv);
  const target = path.resolve(args.target);
  const files = collectMarkdownFiles(target);
  const baseThresholds = args.loc ? computeFromLoc(args.loc) : PROFILES[args.profile];
  const thresholds = { ...baseThresholds, ...args.overrides };
  const targetRoot = fs.statSync(target).isDirectory() ? target : path.dirname(target);
  const metrics = analyze(files, targetRoot, thresholds);
  const minimumChecks = [
    ["markdownFiles", metrics.markdownFiles, thresholds.minMarkdownFiles],
    ["words", metrics.words, thresholds.minWords],
    ["nonBlankLines", metrics.nonBlankLines, thresholds.minNonBlankLines],
    ["headings", metrics.headings, thresholds.minHeadings],
    ["h2", metrics.h2, thresholds.minH2],
    ["fileRefs", metrics.fileRefs, thresholds.minFileRefs],
    ["codeFences", metrics.codeFences, thresholds.minCodeFences],
    ["tables", metrics.tables, thresholds.minTables],
    ["deepDivePages", metrics.deepDivePages, thresholds.minDeepDivePages],
  ];
  const maximumChecks = [
    ["indexPageRatio", metrics.indexPageRatio, thresholds.maxIndexPageRatio],
    ["repeatedLineRatio", metrics.repeatedLineRatio, thresholds.maxRepeatedLineRatio],
    ["repeatedParagraphRatio", metrics.repeatedParagraphRatio, thresholds.maxRepeatedParagraphRatio],
    ["bannedPhraseHits", metrics.bannedPhraseHits, thresholds.maxBannedPhraseHits],
    ["genericPhraseHits", metrics.genericPhraseHits, thresholds.maxGenericPhraseHits],
  ];

  console.log(`# Wiki quality check: ${target}`);
  console.log(args.loc ? `Estimated from LOC: ${args.loc}` : `Profile: ${args.profile}`);
  console.log(`Markdown files scanned: ${files.length}`);
  console.log(`Deep-dive candidates found: ${metrics.deepDiveCandidatePages}`);
  console.log(`Deep-dive qualification: each counted page needs >= ${thresholds.minDeepDivePageWords} words, >= ${thresholds.minDeepDiveFileRefsPerPage} file refs, and >= ${thresholds.minDeepDiveSignalsPerPage} distinct design-quality signals.`);
  console.log("");
  console.log("| Metric | Actual | Required | Status |");
  console.log("| --- | ---: | ---: | --- |");

  let ok = true;
  for (const [key, actual, minimum] of minimumChecks) {
    const passed = actual >= minimum;
    if (!passed) ok = false;
    console.log(`| ${label(key)} | ${formatValue(actual)} | >= ${formatValue(minimum)} | ${passed ? "PASS" : "FAIL"} |`);
  }
  for (const [key, actual, maximum] of maximumChecks) {
    const passed = actual <= maximum;
    if (!passed) ok = false;
    console.log(`| ${label(key)} | ${formatValue(actual)} | <= ${formatValue(maximum)} | ${passed ? "PASS" : "FAIL"} |`);
  }

  console.log("");
  if (!ok) {
    console.error("Wiki is likely too small, under-structured, or too template/index-driven for a large codebase. Add evidence-backed deep dives, reduce repetition, and improve design-oriented coverage before finalizing.");
    process.exit(1);
  }
  console.log("Wiki passes minimum size, structure, and anti-padding checks. Human review for design quality is still required.");
}

try {
  main();
} catch (error) {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}
