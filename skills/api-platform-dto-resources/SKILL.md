---
name: symfony:api-platform-dto-resources
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Implement DTO-first API Platform resources (input/output DTOs, providers, processors) to decouple HTTP contracts from persistence models.
---

# API Platform DTO Resources (Symfony)

## Use when
- API shape diverges from Doctrine entities.
- Strong boundary between domain and transport is required.

## Default workflow
1. Define input/output DTO contracts first.
2. Implement Provider (entity -> output DTO) for read paths.
3. Implement Processor (input DTO -> domain/persistence) for write paths.
4. Keep mapping explicit and testable.
5. Add functional + unit tests for DTO mapping and operation behavior.

## Guardrails
- Do not leak entities directly when DTO boundary is chosen.
- Keep mapping logic centralized, not spread across controllers.
- Validate DTOs with explicit constraints.

## Output contract
- DTO/provider/processor artifacts changed.
- Mapping decisions and invariants.
- Verification and open risks.

## References
- `reference.md`
- `docs/complexity-tiers.md`
