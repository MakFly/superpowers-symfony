---
name: symfony:symfony-voters
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Implement Symfony voters for consistent authorization decisions across controllers, API operations, and domain transitions.
---

# Symfony Voters (Symfony)

## Use when
- Authorization rules are resource/action specific.
- Access logic is duplicated or inconsistent across entry points.

## Default workflow
1. Define subject/action matrix.
2. Implement voter decision logic with explicit deny reasons where useful.
3. Wire checks in controllers/API operations/security expressions.
4. Add unit/functional tests for role/ownership/state combinations.
5. Verify forbidden behavior and error contracts.

## Guardrails
- Keep auth decisions centralized in voters or dedicated policy services.
- Do not embed access logic in templates/controllers ad hoc.
- Cover ownership and state-transition permissions.

## Output contract
- Voter logic changed.
- Integration points using voter checks.
- Test evidence for denied/allowed matrix.

## References
- `reference.md`
- `docs/complexity-tiers.md`
