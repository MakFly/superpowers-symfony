---
name: symfony:runner-selection
description: Select and configure the appropriate command runner based on Docker Compose standard, Symfony Docker (FrankenPHP), or host environment
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Runner Selection

This skill helps you select the appropriate command runner based on your environment setup.

## Environment Detection

The plugin automatically detects your environment:

1. **Symfony Docker** (FrankenPHP/Caddy)
   - Detected via `compose.yaml` with frankenphp/caddy references
   - Or presence of `frankenphp/` directory or `Caddyfile`

2. **Docker Compose Standard**
   - Detected via `docker-compose.yml` or `compose.yaml`
   - Service name auto-detected (`php`, `app`, or first service)

3. **Host Environment**
   - Fallback when no Docker configuration found
   - Uses local PHP installation

## Command Mapping

### Symfony Docker

```bash
# PHP execution
docker compose exec php php script.php

# Symfony Console
docker compose exec php bin/console cache:clear

# Composer
docker compose exec php composer require package

# Tests
docker compose exec php ./vendor/bin/phpunit
docker compose exec php ./vendor/bin/pest
```

### Docker Compose Standard

```bash
# PHP execution (service name may vary: php, app, etc.)
docker compose exec app php script.php

# Symfony Console
docker compose exec app bin/console cache:clear

# Composer
docker compose exec app composer require package

# Tests
docker compose exec app ./vendor/bin/phpunit
```

### Host Environment

```bash
# PHP execution
php script.php

# Symfony Console
php bin/console cache:clear

# Composer
composer require package

# Tests
./vendor/bin/phpunit
./vendor/bin/pest
```

## Switching Runners

If Docker is configured but not running, you have two options:

### Option 1: Start Docker

```bash
# Symfony Docker
docker compose up -d --wait

# Docker Compose standard
docker compose up -d
```

### Option 2: Use Host Tools

Continue with host PHP/Composer if available.

## Best Practices

1. **Consistency**: Use the same runner throughout a session
2. **Docker preference**: Prefer Docker for reproducibility
3. **Host for speed**: Use host tools for quick iterations if Docker is slow
4. **CI/CD**: Always use Docker in CI for consistency

## Troubleshooting

### Docker not found

```bash
# Check Docker installation
docker --version
docker compose version
```

### Service not running

```bash
# Check running containers
docker compose ps

# View logs
docker compose logs -f
```

### Permission issues

```bash
# Fix file ownership (Symfony Docker)
docker compose exec php chown -R $(id -u):$(id -g) .
```
