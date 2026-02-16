# Symfony Quality Checks Reference

## Preferred sequence
1. `./vendor/bin/php-cs-fixer fix --dry-run --diff`
2. `./vendor/bin/phpstan analyse`
3. `./vendor/bin/phpunit` (or pest if project uses it)

## Report
- command
- pass/fail
- top failing artifact
- first remediation step
