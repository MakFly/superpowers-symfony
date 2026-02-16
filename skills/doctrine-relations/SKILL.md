---
name: symfony:doctrine-relations
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Model Doctrine relations with correct ownership, cascades, fetch strategy, and schema integrity for production-safe Symfony domains.
---

# Doctrine Relations (Symfony)

## Use when
- Designing entity associations or fixing relation bugs.
- Addressing N+1/performance issues tied to relation mapping.

## Default workflow
1. Identify true domain ownership and cardinality.
2. Define owning/inverse sides and cascade/orphan rules explicitly.
3. Validate DB-level constraints and indexes.
4. Align fetch mode and query strategy with use cases.
5. Add tests for relation lifecycle and persistence consistency.

## Guardrails
- Avoid broad cascade operations by default.
- Keep relation collections consistent on both sides.
- Prefer explicit joins over implicit lazy loading in hot paths.

## Output contract
- Mapping/schema changes.
- Fetch strategy decisions.
- Tests proving integrity.

## References
- `reference.md`
- `docs/complexity-tiers.md`
