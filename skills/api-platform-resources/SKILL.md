---
name: symfony:api-platform-resources
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Build stable API Platform resource contracts with explicit operations, serialization groups, validation, and security boundaries.
---

# API Platform Resources (Symfony)

## Use when
- Creating or modifying API Platform resources/operations.
- Aligning payload contract, security, and validation behavior.

## Default workflow
1. Define resource contract and operation set (collection/item/custom operations).
2. Configure normalization/denormalization groups explicitly.
3. Attach validation constraints and operation-specific security.
4. Ensure provider/processor or controller boundaries are clean.
5. Add functional tests per operation and status behavior.

## Guardrails
- Avoid exposing internal entity fields by default.
- Keep security expressions close to operations.
- Version contract changes intentionally.

## Output contract
- Resource/operation changes.
- Serialization/security decisions.
- Functional validation results.

## References
- `reference.md`
- `docs/complexity-tiers.md`
