---
name: symfony:symfony-messenger
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
description: Implement reliable Symfony Messenger command/event workflows with idempotent handlers, retry strategy, and failure transport design.
---

# Symfony Messenger (Symfony)

## Use when
- Introducing async processing or decoupled command handling.
- Stabilizing retries/failures in message-driven features.

## Default workflow
1. Define message contract and transport routing.
2. Implement handler with idempotent side-effect design.
3. Configure retry strategy, failure transport, and monitoring hooks.
4. Separate transient vs permanent error handling.
5. Add tests for dispatch, handler behavior, and failure scenarios.

## Guardrails
- Never depend on exactly-once delivery semantics.
- Keep handlers small and deterministic.
- Include correlation identifiers for tracing.

## Output contract
- Message/handler/routing updates.
- Retry/failure policy decisions.
- Validation outcomes and residual operational risk.

## References
- `reference.md`
- `docs/complexity-tiers.md`
