# Doctrine Migrations Reference

## Command set
- `php bin/console doctrine:migrations:diff`
- `php bin/console doctrine:migrations:migrate`
- `php bin/console doctrine:migrations:execute --down <Version>`

## Safe rollout model
1. additive schema
2. dual-write/read transition if needed
3. data backfill
4. cleanup migration later
