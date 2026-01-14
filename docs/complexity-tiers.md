# Complexity Tiers (Symfony)

Use this to adapt the level of detail automatically based on project complexity.

## Simple
**Signals**: Single bundle, basic CRUD, no async.
**Example**: Create entity + controller + basic validation.

## Medium
**Signals**: API Platform, DTOs, validation, services.
**Example**: Resource + DTO + processor/provider + tests.

## Complex
**Signals**: CQRS, Messenger, multiple bounded contexts.
**Example**: Command/handler + async transport + domain services.
