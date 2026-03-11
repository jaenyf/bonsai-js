# Stability Policy

Bonsai follows Semantic Versioning for the documented package entrypoints:

- `bonsai-js`
- `bonsai-js/stdlib`

## Compatibility Guarantees

- Supported runtimes are Node.js 18 and newer, plus current Bun releases.
- CI smoke-tests the packed npm artifact on Node 18, 20, and 22.
- The root runtime exports and stdlib subpath exports are treated as stable public API.
- Documented expression syntax and evaluator behavior are covered by semver.

## Compatibility Boundaries

The following are not public API and may change in minor releases:

- Internal modules under `src/*`
- Build artifact filenames other than the documented package exports
- Benchmark numbers and internal performance heuristics
- Error message wording, unless code depends on a specific exported error class

## AST Contract

`validate().ast` is a supported advanced API, but new syntax can add new AST node variants in minor releases. Consumers should avoid exhaustive switches without a default branch if they want forward compatibility.

## Release Discipline

- Public API additions require tests.
- Public API removals or semantic changes require a major version bump.
- Any change to documented syntax, options, or exports must update `README.md`, `CHANGELOG.md`, and relevant package smoke tests.
