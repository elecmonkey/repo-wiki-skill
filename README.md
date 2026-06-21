# repo-wiki-skill

A Codex Skill for generating a large, multi-page Markdown wiki directory from a large repository.

It is designed for codebases with hundreds of thousands of lines of code, where maintainers need a navigable wiki instead of one long document.

## Install

```bash
npx skills add elecmonkey/repo-wiki-skill
```

## Use

```text
Use $repo-wiki-skill to read this repository and create a detailed wiki directory for new maintainers.
```

By default, the Skill should create `docs/wiki/` with linked Markdown pages.

## Helper scripts

```bash
node scripts/repo_snapshot.js <repo_root> --output /tmp/repo-snapshot.md
node scripts/wiki_quality_check.js <wiki_dir> --profile huge
```
