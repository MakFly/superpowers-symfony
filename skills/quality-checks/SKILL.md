---
name: symfony:quality-checks
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Run Symfony quality gates (style, static analysis, tests) with deterministic sequencing and severity-prioritized remediation output.
---

# Quality Checks (Symfony)

## Use when
- Before merge/release.
- After cross-layer refactors.

## Default workflow
1. Detect canonical project scripts/wrappers.
2. Run style/static gates before full tests.
3. Execute targeted then full tests according to change scope.
4. Classify findings by severity and confidence.
5. Propose minimal remediation order.

## Guardrails
- Preserve exact failing commands in report.
- Separate code issues from environment/config drift.
- Flag flaky tests explicitly.

## Output contract
- Gate-by-gate status.
- Blocking findings (ordered).
- Suggested fix sequence.

## References
- `reference.md`
- `docs/complexity-tiers.md`
