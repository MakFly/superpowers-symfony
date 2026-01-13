# Reference

# Quality Checks for Symfony

## Tools Overview

| Tool | Purpose | Config File |
|------|---------|-------------|
| PHP-CS-Fixer | Code style | `.php-cs-fixer.dist.php` |
| PHPStan | Static analysis | `phpstan.neon` |
| Psalm | Type safety | `psalm.xml` |

## PHP-CS-Fixer

### Installation

```bash
composer require --dev friendsofphp/php-cs-fixer
```

### Configuration

```php
<?php
// .php-cs-fixer.dist.php

$finder = (new PhpCsFixer\Finder())
    ->in(__DIR__)
    ->exclude('var')
    ->exclude('vendor')
    ->exclude('node_modules')
;

return (new PhpCsFixer\Config())
    ->setRules([
        '@Symfony' => true,
        '@Symfony:risky' => true,
        'array_syntax' => ['syntax' => 'short'],
        'ordered_imports' => ['sort_algorithm' => 'alpha'],
        'no_unused_imports' => true,
        'declare_strict_types' => true,
        'strict_param' => true,
        'native_function_invocation' => [
            'include' => ['@compiler_optimized'],
            'scope' => 'namespaced',
        ],
        'global_namespace_import' => [
            'import_classes' => true,
            'import_constants' => false,
            'import_functions' => false,
        ],
        'blank_line_before_statement' => [
            'statements' => ['return', 'throw', 'try'],
        ],
    ])
    ->setFinder($finder)
    ->setRiskyAllowed(true)
;
```

### Usage

```bash
# Check for issues (dry run)
./vendor/bin/php-cs-fixer fix --dry-run --diff

# Fix issues
./vendor/bin/php-cs-fixer fix

# Fix single file
./vendor/bin/php-cs-fixer fix src/Entity/User.php
```

## PHPStan

### Installation

```bash
composer require --dev phpstan/phpstan
composer require --dev phpstan/phpstan-symfony
composer require --dev phpstan/phpstan-doctrine
```

### Configuration

```neon
# phpstan.neon
includes:
    - vendor/phpstan/phpstan-symfony/extension.neon
    - vendor/phpstan/phpstan-doctrine/extension.neon

parameters:
    level: 8  # Max strictness
    paths:
        - src
        - tests
    excludePaths:
        - src/Kernel.php

    # Symfony container
    symfony:
        containerXmlPath: var/cache/dev/App_KernelDevDebugContainer.xml

    # Doctrine
    doctrine:
        objectManagerLoader: tests/object-manager.php

    # Ignore patterns
    ignoreErrors:
        - '#Property .* is never read, only written#'

    # Treat phpdoc as authoritative
    treatPhpDocTypesAsCertain: false
```

### Usage

```bash
# Analyse
./vendor/bin/phpstan analyse

# Generate baseline (for legacy projects)
./vendor/bin/phpstan analyse --generate-baseline

# With specific level
./vendor/bin/phpstan analyse --level=6
```

### PHPStan Levels

| Level | Checks |
|-------|--------|
| 0 | Basic checks |
| 1 | Possibly undefined variables |
| 2 | Unknown methods on $this |
| 3 | Return types, parameter types |
| 4 | Basic dead code |
| 5 | Argument types |
| 6 | Strict types |
| 7 | Union types |
| 8 | Nullable types |
| 9 | Mixed type handling |

## Psalm

### Installation

```bash
composer require --dev vimeo/psalm
./vendor/bin/psalm --init
```

### Configuration

```xml
<!-- psalm.xml -->
<?xml version="1.0"?>
<psalm
    errorLevel="2"
    resolveFromConfigFile="true"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns="https://getpsalm.org/schema/config"
    xsi:schemaLocation="https://getpsalm.org/schema/config vendor/vimeo/psalm/config.xsd"
    findUnusedBaselineEntry="true"
    findUnusedCode="true"
>
    <projectFiles>
        <directory name="src" />
        <ignoreFiles>
            <directory name="vendor" />
        </ignoreFiles>
    </projectFiles>

    <plugins>
        <pluginClass class="Psalm\SymfonyPsalmPlugin\Plugin" />
    </plugins>
</psalm>
```

### Usage

```bash
# Analyse
./vendor/bin/psalm

# Fix issues automatically
./vendor/bin/psalm --alter --issues=all

# Generate baseline
./vendor/bin/psalm --set-baseline=psalm-baseline.xml
```

## Composer Scripts

```json
{
    "scripts": {
        "cs": "./vendor/bin/php-cs-fixer fix --dry-run --diff",
        "cs:fix": "./vendor/bin/php-cs-fixer fix",
        "stan": "./vendor/bin/phpstan analyse",
        "psalm": "./vendor/bin/psalm",
        "test": "./vendor/bin/pest",
        "check": [
            "@cs",
            "@stan",
            "@test"
        ]
    }
}
```

Usage:

```bash
composer run-script check
composer cs:fix
```

## CI Configuration

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: mbstring, xml, ctype, iconv, intl
          coverage: xdebug

      - name: Install dependencies
        run: composer install --prefer-dist --no-progress

      - name: PHP-CS-Fixer
        run: ./vendor/bin/php-cs-fixer fix --dry-run --diff

      - name: PHPStan
        run: ./vendor/bin/phpstan analyse

      - name: Tests
        run: ./vendor/bin/pest --coverage --min=80
```

## Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run CS fixer on staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR "*.php")

if [ -n "$STAGED_FILES" ]; then
    ./vendor/bin/php-cs-fixer fix --config=.php-cs-fixer.dist.php $STAGED_FILES
    git add $STAGED_FILES
fi

# Run PHPStan
./vendor/bin/phpstan analyse --no-progress

if [ $? -ne 0 ]; then
    echo "PHPStan found errors. Fix them before committing."
    exit 1
fi
```

## Best Practices

1. **Max PHPStan level**: Start at level 5, work up to 8
2. **Use baseline**: For legacy code, generate baseline
3. **CI enforcement**: Block merges on quality failures
4. **Pre-commit hooks**: Catch issues before commit
5. **Fix as you go**: Don't let tech debt accumulate
