---
name: symfony:doctrine-migrations
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Produce safe Doctrine migrations with rollout strategy, backward compatibility, and operationally aware schema evolution.
---

# Doctrine Migrations (Symfony)

## Use when
- Evolving schema in non-trivial environments.
- Needing additive-first rollout strategies.

## Default workflow
1. Plan additive and backward-compatible migration path.
2. Generate migration and review SQL for lock/risk profile.
3. Split schema and data migrations when needed.
4. Validate migration up/down and release ordering.
5. Document irreversible steps and mitigation.

## Guardrails
- Avoid destructive changes in same release as read-path switch.
- Review generated SQL before execution in critical DBs.
- Keep migration names/descriptions domain-meaningful.

## Output contract
- Migration strategy and files.
- SQL/risk notes.
- Validation and rollback posture.

## References
- `reference.md`
- `docs/complexity-tiers.md`
