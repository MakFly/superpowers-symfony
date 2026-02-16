---

name: symfony:tdd-with-pest
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Apply RED-GREEN-REFACTOR with Pest in Symfony, producing minimal safe implementation and strong tests.
---

# Tdd With Pest (Symfony)

## Use when
- The task explicitly involves tdd with pest in a Symfony codebase.
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
