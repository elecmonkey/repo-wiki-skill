# Repo Wiki Structure Reference

Use this reference when drafting or checking a comprehensive repository wiki. Adapt section names and depth to the actual repository.

## Default Outline

1. `# <Repository Name> Wiki`
2. `## Audience and Reading Guide`
   - State that the document is for code learners and new maintainers.
   - Explain the suggested reading path for first-time readers, feature contributors, and maintainers.
3. `## Executive Summary`
   - Purpose, main capabilities, runtime shape, and technology stack.
   - One paragraph describing the most important architectural idea.
4. `## Repository at a Glance`
   - Top-level directory table with purpose, importance, and when to edit.
   - Major languages, package managers, build systems, and generated artifacts.
5. `## Quickstart and Developer Workflow`
   - Install, build, test, lint, run, debug, and common commands.
   - Environment variables and local prerequisites.
6. `## Architecture Overview`
   - System boundaries and major components.
   - Mermaid or Graphviz diagram.
   - Key runtime paths and dependency direction.
7. `## End-to-End Execution Paths`
   - CLI invocation, HTTP request, background job, compiler pipeline, plugin lifecycle, or other primary flows.
   - Sequence or flow diagrams when helpful.
8. `## Module and Directory Deep Dive`
   - One subsection per meaningful module/package/directory.
   - For each: responsibility, key files, important symbols, dependencies, tests, extension points, and maintenance notes.
9. `## Core Subsystems`
   - Dedicated sections for the most important code areas.
   - Include algorithms, state machines, data models, concurrency, caching, persistence, security, I/O, and error handling as applicable.
10. `## Algorithms, Data Structures, and Invariants`
    - Explain non-trivial algorithms with pseudocode, complexity, and KaTeX formulas where useful.
    - State invariants and what breaks if they are violated.
11. `## Configuration and Build System`
    - Config files, build graph, code generation, bundling, feature flags, and environment handling.
12. `## Testing Strategy`
    - Test types, locations, commands, fixtures, mocks, integration boundaries, and coverage gaps.
13. `## Release, Packaging, Deployment, and Operations`
    - Publish/deploy flow, CI, versioning, artifacts, observability, rollback, and operational runbooks when present.
14. `## Maintainer Playbook`
    - Common change recipes: add a feature, add an API, update schema/config, add tests, debug failures, update dependencies.
    - Safe edit points and risky areas.
15. `## Troubleshooting`
    - Common setup, build, test, runtime, and integration failures.
16. `## Glossary`
    - Domain terms, abbreviations, internal names, and important concepts.
17. `## File and Symbol Index`
    - Important files and symbols with short explanations.
18. `## Open Questions and Follow-Up Work`
    - Explicit uncertainties, missing docs, missing tests, or areas that need maintainer confirmation.

## Per-Module Template

Use this template for each substantial module:

```markdown
### <Module or Directory>

**Purpose:** <What this module owns.>

**Key files and symbols:**

| File | Symbols | Why it matters |
| --- | --- | --- |
| `<path>` | `<function/class/type>` | <role> |

**How it works:** <Narrative explanation of control/data flow.>

**Dependencies:** <Internal and external dependencies.>

**Important invariants:**

- <Invariant or assumption>

**Tests:** <Relevant test files and what behavior they cover.>

**Maintainer notes:** <How to change safely, pitfalls, and likely regressions.>
```

## Coverage Rubric

Classify repository areas by depth:

- **Deep dive:** entry points, core domain logic, complex algorithms, security/persistence/network boundaries, plugin/public APIs, code with many tests or many dependents.
- **Medium coverage:** ordinary feature modules, adapters, UI components, utility packages, examples that demonstrate public behavior.
- **Light coverage:** generated files, fixtures, snapshots, simple constants, vendored code, lock files, assets, build outputs.
- **Mention only:** caches, dependency directories, temporary output, minified bundles, and files explicitly marked generated unless they define public API or behavior.

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

- The wiki has a table of contents or clear heading hierarchy.
- The first 10 minutes of reading provide a useful mental model.
- Every top-level directory is covered.
- Every major runtime path is traced.
- Core algorithms and tradeoffs have dedicated explanations.
- Tests and tooling are documented with exact commands.
- Maintainer playbook includes concrete change recipes.
- Unknowns are explicit and bounded.
- The output is valid Markdown with fenced diagram/math blocks.
