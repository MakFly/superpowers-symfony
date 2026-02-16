---
name: symfony:api-platform-state-providers
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Implement performant API Platform State Providers with explicit query strategy, security-aware filtering, and predictable output mapping.
---

# API Platform State Providers (Symfony)

## Use when
- Read operations need custom query logic.
- Default Doctrine provider is insufficient for performance or contract needs.

## Default workflow
1. Define read use case and output contract.
2. Implement provider with explicit repository query strategy.
3. Enforce user/tenant/security filtering in query path.
4. Map query result to response DTO/resource consistently.
5. Add functional tests for visibility, pagination, and edge conditions.

## Guardrails
- Prevent over-fetching and N+1 by design.
- Keep provider read-only; no write side effects.
- Handle not-found and forbidden semantics explicitly.

## Output contract
- Provider and query strategy changes.
- Security/data visibility guarantees.
- Test results for functional read paths.

## References
- `reference.md`
- `docs/complexity-tiers.md`
