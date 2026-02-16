---
name: symfony:functional-tests
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Create robust Symfony functional tests for HTTP contracts, validation, authorization, and persistence side effects.
---

# Functional Tests (Symfony)

## Use when
- Validating real HTTP-level behavior end-to-end inside Symfony kernel.
- Protecting API/controller contracts against regressions.

## Default workflow
1. Identify contract under test (status, payload, side effects).
2. Build fixture setup for deterministic state.
3. Execute request via test client and assert response contract.
4. Assert persistence/async side effects where relevant.
5. Cover unauthorized, invalid payload, and not-found branches.

## Guardrails
- Keep tests deterministic and isolated.
- Avoid over-mocking for functional layer.
- Assert business-significant output, not incidental formatting.

## Output contract
- Functional test cases added/updated.
- Scenario matrix covered.
- Command output and residual coverage gaps.

## References
- `reference.md`
- `docs/complexity-tiers.md`
