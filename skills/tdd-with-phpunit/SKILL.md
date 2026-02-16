---
name: symfony:tdd-with-phpunit
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Apply strict RED-GREEN-REFACTOR with PHPUnit in Symfony, emphasizing deterministic tests and behavior-first design.
---

# TDD with PHPUnit (Symfony)

## Use when
- Implementing domain/services/controllers with high regression risk.
- Reproducing and fixing bugs through executable specs.

## Default workflow
1. Write failing PHPUnit test for target behavior.
2. Implement minimum code to pass.
3. Refactor structure while preserving behavior.
4. Expand tests for edge and negative cases.
5. Run focused then full suite.

## Guardrails
- Avoid brittle assertions on internals.
- Keep test setup explicit and isolated.
- Use fixtures/builders consistently.

## Output contract
- RED test case.
- GREEN implementation.
- REFACTOR summary and final check output.

## References
- `reference.md`
- `docs/complexity-tiers.md`
