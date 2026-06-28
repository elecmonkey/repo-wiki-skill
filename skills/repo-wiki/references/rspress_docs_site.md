# Optional Rspress Documentation Site Guide

Use this reference only when the user explicitly asks to turn the generated wiki into a documentation site, publishable docs, Rspress site, static docs site, or similar. Do not make this part of the default wiki-generation workflow.

## Official facts to preserve

- Rspress is installed as `@rspress/core`, not `rspress`.
- Current Rspress requires Node.js `20.19+` or `22.12+`.
- New projects can be scaffolded with `npm create rspress@latest`, `pnpm create rspress@latest`, `yarn create rspress`, `bun create rspress@latest`, or `deno init --npm rspress@latest`.
- Existing projects can be set up manually by installing `@rspress/core -D` and adding scripts that call `rspress dev`, `rspress build`, and `rspress preview`.
- Config imports should use `import { defineConfig } from '@rspress/core';`.
- Rspress default document root is `docs`; default build output is `doc_build`.
- Rspress uses file-system routing: `docs/index.md` maps to `/`, `docs/wiki/index.md` maps to `/wiki/`, and `docs/wiki/foo.md` maps to `/wiki/foo`.
- Rspress supports `_nav.json` for top-level navigation and `_meta.json` for sidebar metadata. Prefer declarative navigation/sidebar files for large generated wiki directories.
- Rspress can generate `llms.txt`, `llms-full.txt`, and per-route Markdown output by setting `llms: true`; Rspress documents this as experimental, and recommends the official `@rspress/plugin-llms` fallback if SSG-MD cannot be enabled because of SSR incompatibility.
- Rspress excludes files starting with `_` from routing by default through `route.excludeConvention`, so `_nav.json` and `_meta.json` are metadata files rather than pages.

## Intent

The primary skill output remains a multi-page Markdown wiki directory, usually `docs/wiki/`. When site deployment is requested, add a thin Rspress documentation site around that wiki without reducing wiki depth or replacing the wiki structure.

## Required setup behavior

1. Tell the user that this is an optional publishing step separate from writing the wiki.
2. Install or activate the Rspress-related skills before doing detailed Rspress work when such skills are available. The user does not need to ask separately for a second product-level decision; the request to publish/deploy the wiki as an Rspress site is enough intent to add these local agent guidance skills, while still following the current environment's sandbox, network, and approval rules.
   - Prefer installing from `rstackjs/agent-skills` with the `skills` CLI.
   - Install `rspress-best-practices` for Rspress project structure, config, MDX, navigation, deployment, and debugging guidance.
   - Install `rspress-description-generator` when creating or polishing many documentation pages, because Rspress uses descriptions for SEO/search/AI-readable outputs.
   - Install `rspress-custom-theme` only when the user asks for theme customization or the chosen template/site already has a custom theme.
   - Use the available skill discovery/installation workflow, such as `find-skills` or `skill-installer` when present in the current agent environment. If running commands directly is appropriate, examples are:

     ```bash
     npx skills add rstackjs/agent-skills --skill rspress-best-practices
     npx skills add rstackjs/agent-skills --skill rspress-description-generator
     npx skills add rstackjs/agent-skills --skill rspress-custom-theme
     ```

   - If a Rspress Skill is already installed, read that Skill before editing the docs site.
   - If installing skills is blocked by network, permissions, or the current environment, continue with repository inspection plus current Rspress docs/package metadata; do not invent project-specific conventions.
3. Inspect the target repository before choosing commands:
   - `package.json`
   - workspace files such as `pnpm-workspace.yaml`, `rush.json`, `nx.json`, `turbo.json`, or `lerna.json`
   - existing docs directories and site configs
   - current package manager lockfiles
4. Prefer the repository's existing package manager and style.
5. Keep generated wiki content in `docs/wiki/` unless the user requests another path.

## Recommended site layout

Prefer a layout that wraps the wiki instead of flattening it:

```text
<repo>/
├── docs/
│   ├── index.md
│   ├── _nav.json
│   ├── _meta.json
│   └── wiki/
│       ├── index.md
│       ├── repository-map.md
│       ├── architecture/
│       ├── modules/
│       ├── subsystems/
│       ├── development/
│       └── reference/
├── rspress.config.ts
├── tsconfig.json
└── package.json
```

If the repository already has a docs app or website package, adapt to that existing app instead of creating another top-level site.

### Dependency placement strategy

Decide where to install `@rspress/core` and related dependencies based on the repository structure:

1. **Root has `package.json` and is NOT a workspace root** (no `workspaces` field, no `pnpm-workspace.yaml`, `rush.json`, `nx.json`, `turbo.json`, or `lerna.json`) → install `@rspress/core` at the root, place `rspress.config.ts` at the root.
2. **Root has `package.json` and IS a workspace root** → create a `docs/package.json` (or reuse an existing docs package) as a workspace member, install `@rspress/core` there, place `rspress.config.ts` inside `docs/`.
3. **Root has no `package.json`** → create `docs/package.json` as a self-contained package, install `@rspress/core` there, place `rspress.config.ts` inside `docs/`.

The goal is to avoid polluting the project root when it is not already an npm package, and to keep all docs-site changes scoped to the docs directory whenever the root is a workspace. If an existing docs sub-package already exists, always prefer it over creating a new one.

## Implementation checklist

### 1. Confirm publishing scope

Confirm or infer:

- whether the user wants only a local preview or also deployment
- desired `base` path if the site is hosted under a subpath such as GitHub Pages project pages
- whether docs should live in the root package or an existing docs package
- whether search, sidebar grouping, nav links, `llms.txt`, or theme customization are required

### 2. Install Rspress

Follow the dependency placement strategy above to determine the correct package. Use Node tooling with the repository's package manager:

```bash
pnpm add @rspress/core -D
```

Equivalent commands:

```bash
npm install @rspress/core -D
yarn add @rspress/core -D
bun add @rspress/core -D
deno add npm:@rspress/core -D
```

Do not install `rspress`; that was the old package name. Do not add dependencies blindly in a monorepo; pick the correct workspace/package first.

### 3. Add scripts

Add scripts that match the repository's naming style. For a repository that already has many commands, prefer `docs:*` names to avoid conflicting with app build scripts:

```json
{
  "scripts": {
    "docs:dev": "rspress dev",
    "docs:build": "rspress build",
    "docs:preview": "rspress preview"
  }
}
```

For a standalone docs package, the canonical script names are also acceptable:

```json
{
  "scripts": {
    "dev": "rspress dev",
    "build": "rspress build",
    "preview": "rspress preview"
  }
}
```

If the repository already has docs scripts, extend those instead of replacing them.

### 4. Add or update Rspress config

Create or update `rspress.config.ts`. Keep the config minimal at first:

```ts
import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: 'docs',
  title: '<Repository Name> Wiki',
  description: 'Maintainer-oriented repository wiki',
  llms: true,
});
```

Add `base` only when the deployment target needs it:

```ts
import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: 'docs',
  base: '/<repo-name>/',
  title: '<Repository Name> Wiki',
  description: 'Maintainer-oriented repository wiki',
  llms: true,
});
```

Only add `outDir`, theme config, logo, custom search, plugins, or custom routing when the user asks or the repository already uses them.

### 4.1. Configure diagram and math plugins

The wiki uses Mermaid and KaTeX by default. If the user explicitly requests a documentation site, Graphviz (DOT) diagrams are also available. Install only the plugins the wiki actually uses.

| Feature | Package | Import |
| --- | --- | --- |
| Mermaid (` ```mermaid `) | `rspress-plugin-mermaid` | `import mermaid from 'rspress-plugin-mermaid'` |
| KaTeX (`$...$`, `$$...$$`) | `rspress-plugin-katex` | `import katex from 'rspress-plugin-katex'` |
| Graphviz (` ```dot `, docs site only) | `rspress-plugin-viz` | `import viz from 'rspress-plugin-viz'` |

Install needed packages and add them to `rspress.config.ts` plugins array:

```ts
import { defineConfig } from '@rspress/core';
import mermaid from 'rspress-plugin-mermaid';
import katex from 'rspress-plugin-katex';
import viz from 'rspress-plugin-viz';

export default defineConfig({
  root: 'docs',
  title: '<Repository Name> Wiki',
  plugins: [mermaid(), katex(), viz()],
  llms: true,
});
```

Only include the plugins actually used in the wiki. Omit `viz` unless the wiki contains ` ```dot ` blocks.

### 5. Add `tsconfig.json` when needed

If the repository does not already have a compatible TypeScript config for the docs site, add the minimal Rspress-oriented config from the official manual setup and include `docs`, `theme`, and `rspress.config.ts`. If the repository already has TypeScript configuration, extend it in the repository's style instead of overwriting it.

### 6. Preserve wiki navigation

Ensure `docs/wiki/index.md` remains the main human navigation hub. For Rspress navigation, prefer `_nav.json` and `_meta.json` over a large hand-written `themeConfig.sidebar` in `rspress.config.ts`.

A minimal root nav can be:

```json
[
  {
    "text": "Wiki",
    "link": "/wiki/",
    "activeMatch": "^/wiki/"
  }
]
```

For a large wiki, use a root `docs/_meta.json` to create a global sidebar, or use per-directory `wiki/**/_meta.json` files to group sections. Suggested top-level groups:

- Overview
- Architecture
- Modules
- Subsystems
- Development
- Maintainer Playbook
- Reference

Avoid manually listing hundreds of pages in `rspress.config.ts` unless generated and maintainable.

### 7. Check Markdown and routing issues

Rspress has dead-link checking enabled by default during builds. For generated wiki content:

- avoid files and folders with the same name in the same directory, such as `foo.md` and `foo/index.md`
- use relative Markdown links that match file-system routing
- keep `_meta.json`, `_nav.json`, fragments, and helper files valid so they do not become accidental routes
- add `route.exclude` only for real non-page files inside `docs`

### 8. Build and fix

Run the local build command, then fix broken Markdown links, unsupported syntax, config errors, and missing dependencies:

```bash
pnpm docs:build
```

Use the package manager and script names actually present in the repository. `rspress dev`, `rspress build`, and `rspress preview` also accept `--base` when you need to test a deployment base path.

### 9. Deployment notes

If the user asks for deployment, add a short deployment page or README section covering the selected host. Keep host-specific instructions separate from the core wiki. Common targets include GitHub Pages, Vercel, Netlify, and internal static hosting.

Do not add CI deployment without explicit user approval. CI changes can publish content, require secrets, or affect repository policy.

## Quality rules

- Do not let site work shrink the wiki content or replace deep pages with a superficial website shell.
- Do not move `docs/wiki/` unless required by the existing docs app or requested by the user.
- Do not overwrite an existing docs site without preserving its structure and scripts.
- Do not assume a public deployment target.
- Keep Rspress setup minimal unless the user asks for polish.
- Enable `llms: true` when it does not conflict with the site, because generated `llms.txt` and `llms-full.txt` are useful for AI-readable wiki publishing. If the experimental built-in SSG-MD path fails because of SSR incompatibility, use the official `@rspress/plugin-llms` fallback instead of removing AI-readable output entirely.
- After site setup, rerun the wiki quality gate and the docs build:

```bash
node <skill_dir>/scripts/wiki_quality_check.js docs/wiki --profile huge
pnpm docs:build
```
