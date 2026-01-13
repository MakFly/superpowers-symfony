---
name: symfony:using-symfony-superpowers
description: Entry point for Symfony Superpowers - lightweight workflow guidance and command map.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Symfony Superpowers (Compact)

## When to use
- Symfony 6.4/7.x/8.x, API Platform, Doctrine, Messenger

## How to operate
1. Detect Symfony version and API Platform presence.
2. Prefer services and actions over controller logic.
3. Ask before starting any server or running Docker.
4. Use the project’s runner (Docker/DDEV/host) as detected.

## Recommended entry skills
- `quality-checks`, `tdd-with-pest` or `tdd-with-phpunit`
- `doctrine-migrations`, `doctrine-relations`
- `api-platform-resources`, `api-platform-serialization`
- `symfony-messenger`, `symfony-voters`

## Commands (only if user asks to run)
- `/superpowers-symfony:write-plan`
- `/superpowers-symfony:execute-plan`
- `/superpowers-symfony:symfony-check`
- `/superpowers-symfony:symfony-tdd-pest`
