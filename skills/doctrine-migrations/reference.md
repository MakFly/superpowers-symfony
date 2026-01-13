# Reference

# Doctrine Migrations

## Installation

```bash
composer require doctrine/doctrine-migrations-bundle
```

## Basic Commands

```bash
# Generate migration from entity changes
bin/console make:migration

# Or using doctrine directly
bin/console doctrine:migrations:diff

# Run pending migrations
bin/console doctrine:migrations:migrate

# Check status
bin/console doctrine:migrations:status

# List all migrations
bin/console doctrine:migrations:list
```

## Migration Workflow

### 1. Modify Entity

```php
<?php
// src/Entity/User.php

#[ORM\Entity]
class User
{
    // Add new property
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $avatarUrl = null;
}
```

### 2. Generate Migration

```bash
bin/console make:migration
```

Generated file:

```php
<?php
// migrations/Version20240115120000.php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20240115120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add avatar_url column to user table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user ADD avatar_url VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user DROP avatar_url');
    }
}
```

### 3. Run Migration

```bash
# Dry run first
bin/console doctrine:migrations:migrate --dry-run

# Execute
bin/console doctrine:migrations:migrate
```

## Advanced Migrations

### Data Migration

```php
public function up(Schema $schema): void
{
    // Schema change
    $this->addSql('ALTER TABLE user ADD status VARCHAR(20) NOT NULL DEFAULT \'active\'');

    // Data migration
    $this->addSql("UPDATE user SET status = 'inactive' WHERE last_login < DATE_SUB(NOW(), INTERVAL 1 YEAR)");
}
```

### Multiple Statements

```php
public function up(Schema $schema): void
{
    $this->addSql('ALTER TABLE order ADD customer_id INT DEFAULT NULL');
    $this->addSql('ALTER TABLE order ADD CONSTRAINT FK_ORDER_CUSTOMER FOREIGN KEY (customer_id) REFERENCES customer (id)');
    $this->addSql('CREATE INDEX IDX_ORDER_CUSTOMER ON order (customer_id)');
}
```

### Using Schema Object

```php
public function up(Schema $schema): void
{
    $table = $schema->getTable('user');
    $table->addColumn('avatar_url', 'string', [
        'length' => 255,
        'notnull' => false,
    ]);
    $table->addIndex(['avatar_url'], 'idx_user_avatar');
}
```

### Conditional Migration

```php
public function up(Schema $schema): void
{
    // Only for MySQL
    if ($this->connection->getDatabasePlatform()->getName() === 'mysql') {
        $this->addSql('ALTER TABLE user ENGINE=InnoDB');
    }
}

public function preUp(Schema $schema): void
{
    // Check before running
    $count = $this->connection->fetchOne('SELECT COUNT(*) FROM user WHERE status IS NULL');
    if ($count > 0) {
        throw new \Exception('Cannot migrate: null status values exist');
    }
}

public function postUp(Schema $schema): void
{
    // Verify after running
    $this->connection->executeQuery('ANALYZE TABLE user');
}
```

## Rollback

```bash
# Rollback last migration
bin/console doctrine:migrations:migrate prev

# Rollback to specific version
bin/console doctrine:migrations:migrate Version20240101000000

# Rollback all
bin/console doctrine:migrations:migrate first
```

## Version Control

```bash
# Mark migration as executed (without running)
bin/console doctrine:migrations:version --add Version20240115120000

# Remove from version table
bin/console doctrine:migrations:version --delete Version20240115120000
```

## Configuration

```yaml
# config/packages/doctrine_migrations.yaml
doctrine_migrations:
    migrations_paths:
        'DoctrineMigrations': '%kernel.project_dir%/migrations'
    all_or_nothing: true
    transactional: true
    check_database_platform: true
    organize_migrations: none # none, year, year_and_month
```

## Production Best Practices

### 1. Always Test Migrations

```bash
# On staging
bin/console doctrine:migrations:migrate --dry-run
bin/console doctrine:migrations:migrate

# Verify schema
bin/console doctrine:schema:validate
```

### 2. Backup Before Migration

```bash
# MySQL
mysqldump -u user -p database > backup_$(date +%Y%m%d_%H%M%S).sql

# PostgreSQL
pg_dump -U user database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Non-Blocking Migrations

For large tables, consider:

```php
// Instead of adding NOT NULL column directly
public function up(Schema $schema): void
{
    // Step 1: Add nullable column
    $this->addSql('ALTER TABLE user ADD status VARCHAR(20) DEFAULT NULL');
}

// In next migration after data backfill
public function up(Schema $schema): void
{
    // Step 2: Make it NOT NULL
    $this->addSql('ALTER TABLE user MODIFY status VARCHAR(20) NOT NULL');
}
```

### 4. CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Run migrations
  run: |
    php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
```

## Schema Validation

```bash
# Validate mapping
bin/console doctrine:schema:validate

# Compare schema with entities
bin/console doctrine:schema:update --dump-sql
```

## Common Issues

### Migration Already Executed

```bash
# Force re-run (dangerous!)
bin/console doctrine:migrations:execute Version20240115120000 --up

# Or mark as not executed
bin/console doctrine:migrations:version --delete Version20240115120000
bin/console doctrine:migrations:migrate
```

### Conflicting Migrations

When multiple developers create migrations:

1. Pull latest changes
2. Rollback your migration: `bin/console doctrine:migrations:migrate prev`
3. Delete your migration file
4. Regenerate: `bin/console make:migration`
