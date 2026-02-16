---

name: symfony:bootstrap-check
allowed-tools:
  - Read
  - Glob
  - Grep
description: Inspect Symfony project bootstrap health and identify configuration/runtime blockers before implementation.
---

# Bootstrap Check (Symfony)

## Use when
- The task explicitly involves bootstrap check in a Symfony codebase.
- You need targeted guidance with minimal detours.

## Default workflow
1. Discover current constraints and existing patterns before editing.
2. Implement the smallest change that satisfies the requested behavior.
3. Validate with the strongest fast checks available in this repository.
4. Summarize changed files, verification, and remaining risk.

## Guardrails
- Keep changes minimal and focused on the active task.
- Reuse project conventions over introducing new architecture.
- Prefer deterministic checks over speculative changes.
- If behavior is unclear, surface assumptions explicitly before broad refactors.

## Progressive disclosure
- Start with this file.
- Load references only when needed for implementation details.

## Output contract
- What changed.
- Why this approach was selected.
- What was validated (command + outcome).
- Any residual risk or follow-up.

## References
- `reference.md`
- `docs/complexity-tiers.md`
