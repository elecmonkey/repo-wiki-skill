# Repo Wiki Structure Reference

Use this reference when drafting or checking a comprehensive **wiki directory** for a large repository. Adapt file names and depth to the actual codebase.

## Default Directory Layout

```text
docs/wiki/
├── index.md
├── repository-map.md
├── architecture/
│   ├── overview.md
│   ├── dependency-graph.md
│   └── runtime-flows.md
├── modules/
│   ├── <simple-module>.md
│   └── <complex-module>/
│       ├── index.md
│       ├── architecture.md
│       ├── key-flows.md
│       ├── important-files.md
│       ├── testing.md
│       └── maintainer-notes.md
├── subsystems/
│   ├── <simple-subsystem>.md
│   └── <complex-subsystem>/
│       ├── index.md
│       ├── design.md
│       ├── algorithms.md
│       ├── data-flow.md
│       ├── failure-modes.md
│       └── maintainer-notes.md
├── development/
│   ├── setup.md
│   ├── build-and-test.md
│   ├── configuration.md
│   └── release-and-operations.md
├── maintainer-playbook.md
└── reference/
    ├── glossary.md
    ├── file-index.md
    ├── symbol-index.md
    └── open-questions.md
```

## Page Guidance

### `index.md`

- State the audience: code learners, new maintainers, and maintainers under pressure from a large codebase.
- Link to every major page.
- Provide recommended reading paths for first-time readers, feature contributors, debugging, release work, and subsystem ownership.
- Include a concise executive summary.

### `repository-map.md`

- Include a top-level directory table with purpose, importance, owner/responsibility if inferable, and when to edit.
- Mention generated, vendored, cache, fixture, and build-output areas explicitly.
- Explain major languages, package managers, build systems, and generated artifacts.

### `architecture/`

- Explain system boundaries, major components, dependency direction, and integration points.
- Include Mermaid or Graphviz diagrams where helpful.
- Trace primary runtime flows such as CLI invocation, HTTP request, background job, compiler pipeline, plugin lifecycle, or data sync.

### `modules/`

Create one page for a simple package, crate, app, service, library, or major directory only when it is small enough to explain clearly in one document. For any non-trivial module, create a subdirectory with multiple pages. A complex module should usually have `index.md`, architecture, key flows, important files/symbols, testing, and maintainer notes. Merge tiny modules only when they share one responsibility.

### `subsystems/`

Create dedicated pages or subdirectories for the hardest or riskiest areas: algorithms, parsers, compilers, schedulers, state machines, caching, concurrency, persistence, network boundaries, security, plugin systems, migrations, or error handling. Use a single Markdown file only for simple subsystems. For complex subsystems, create a subdirectory with separate pages for design, algorithms, data flow, failure modes, tests, and maintainer notes.

### `development/`

Document setup, build, test, lint, debug, configuration, CI, release, deployment, and operations with exact commands found in the repository.

### `maintainer-playbook.md`

Include common change recipes, safe edit points, risky areas, troubleshooting, dependency update strategy, and how to add tests.

### `reference/`

Include glossary, file index, symbol index, and open questions. The file and symbol indexes should be practical navigation aids, not raw dumps.

## Per-Module Page Template

Use this template only for simple modules that fit in one page. For complex modules, split these sections across a module subdirectory.

```markdown
# <Module or Directory>

## Purpose

<What this module owns.>

## Key files and symbols

| File | Symbols | Why it matters |
| --- | --- | --- |
| `<path>` | `<function/class/type>` | <role> |

## How it works

<Narrative explanation of control/data flow.>

## Dependencies

<Internal and external dependencies.>

## Important invariants

- <Invariant or assumption>

## Tests

<Relevant test files and what behavior they cover.>

## Maintainer notes

<How to change safely, pitfalls, and likely regressions.>
```

## Complex Module or Subsystem Directory Template

Use a directory when a module or subsystem has multiple responsibilities, many important files, non-trivial algorithms, public API surface, substantial tests, or frequent maintainer changes:

```text
modules/<complex-module>/
├── index.md              # scope, navigation, responsibility summary
├── architecture.md       # internal components and dependency direction
├── key-flows.md          # end-to-end flows through this module
├── important-files.md    # files, symbols, ownership, extension points
├── testing.md            # test files, fixtures, coverage gaps
└── maintainer-notes.md   # safe edits, risks, common changes

subsystems/<complex-subsystem>/
├── index.md              # scope and page index
├── design.md             # design goals, tradeoffs, invariants
├── algorithms.md         # algorithms, complexity, pseudocode, KaTeX
├── data-flow.md          # data/control flow and Mermaid/Graphviz diagrams
├── failure-modes.md      # errors, retries, recovery, edge cases
└── maintainer-notes.md   # safe edits, tests, debugging, risk areas
```

Add more pages when the code demands it, such as `api.md`, `state-machine.md`, `concurrency.md`, `persistence.md`, `security.md`, `migration-guide.md`, or `debugging.md`.

## Coverage Rubric

Classify repository areas by depth:

- **Deep dive:** entry points, core domain logic, complex algorithms, security/persistence/network boundaries, plugin/public APIs, code with many tests or many dependents.
- **Medium coverage:** ordinary feature modules, adapters, UI components, utility packages, examples that demonstrate public behavior.
- **Light coverage:** generated files, fixtures, snapshots, simple constants, vendored code, lock files, assets, build outputs.
- **Mention only:** caches, dependency directories, temporary output, minified bundles, and files explicitly marked generated unless they define public API or behavior.

## Minimum Size Rubric

Use these deliberately high targets across the whole wiki directory to avoid producing documentation too shallow for large-codebase maintainers:

| Profile | Use for | Minimums |
| --- | --- | --- |
| `large` | Substantial repos, tens of thousands of LOC | 30+ Markdown files, 250,000+ words, 15,000+ non-blank lines, 1,200+ headings, 400+ H2 sections, 1,800+ file references, 80+ code/diagram fences, 120+ tables |
| `huge` | Hundreds of thousands of LOC, monorepos, platforms, frameworks | 80+ Markdown files, 600,000+ words, 35,000+ non-blank lines, 2,600+ headings, 900+ H2 sections, 4,500+ file references, 200+ code/diagram fences, 300+ tables |
| `massive` | Very large monorepos or multi-product systems | 150+ Markdown files, 1,200,000+ words, 70,000+ non-blank lines, 5,200+ headings, 1,800+ H2 sections, 9,000+ file references, 400+ code/diagram fences, 600+ tables |

Run the quality gate on the wiki directory:

```bash
node <skill_dir>/scripts/wiki_quality_check.js <wiki_dir> --profile huge
```

If the checker fails, add missing pages and expand repository areas with evidence-backed explanations. Do not add filler just to satisfy counts.

## Evidence Standards

Prefer citations as inline file references rather than formal footnotes:

- Use backticked paths such as `src/index.ts` and `packages/core/src/planner.ts`.
- Mention symbol names exactly as written in code.
- Quote short snippets only when the exact code matters; otherwise paraphrase.
- If inferring intent, write "The code suggests..." or "This appears designed to...".
- If evidence conflicts, describe both sources and the likely resolution.

## Diagram Selection

- Use `flowchart TD` or `flowchart LR` for component and dependency maps.
- Use `sequenceDiagram` for request/command lifecycles.
- Use `stateDiagram-v2` for stateful workflows.
- Use Graphviz `digraph` with clusters for dense module graphs.
- Use KaTeX for formulas, scoring models, complexity, probability, or invariants.

## Final Review Checklist

- The output is a wiki directory with multiple linked Markdown pages.
- `index.md` links to every major page.
- The first 10 minutes of reading provide a useful mental model.
- Every top-level directory is covered.
- Every major runtime path is traced.
- Core algorithms and tradeoffs have dedicated pages or sections.
- Tests and tooling are documented with exact commands.
- Maintainer playbook includes concrete change recipes.
- Unknowns are explicit and bounded.
- The directory passes the applicable `wiki_quality_check.js` profile.
- The output is valid Markdown with fenced diagram/math blocks.
