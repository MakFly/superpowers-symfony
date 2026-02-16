# Functional Tests Reference (Symfony)

Use this reference for implementation details and review criteria specific to `functional-tests`.


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- ./vendor/bin/phpunit --filter=...
- ./vendor/bin/phpunit
- ./vendor/bin/pest --filter=...

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

