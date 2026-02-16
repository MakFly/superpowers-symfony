# Reference

# Doctrine Fixtures with Foundry

Foundry provides modern, type-safe factories for creating test data.

## Installation

```bash
composer require zenstruck/foundry --dev
composer require doctrine/doctrine-fixtures-bundle --dev
```

## Creating Factories

```bash
# Generate factory for entity
bin/console make:factory User
```

```php
<?php
// tests/Factory/UserFactory.php

namespace App\Tests\Factory;

use App\Entity\User;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;

/**
 * @extends PersistentProxyObjectFactory<User>
 */
final class UserFactory extends PersistentProxyObjectFactory
{
    public static function class(): string
    {
        return User::class;
    }

    protected function defaults(): array
    {
        return [
            'email' => self::faker()->unique()->safeEmail(),
            'password' => 'hashed_password', // Or use UserPasswordHasherInterface
            'roles' => ['ROLE_USER'],
            'createdAt' => \DateTimeImmutable::createFromMutable(
                self::faker()->dateTimeBetween('-1 year')
            ),
        ];
    }

    // Named states for common variations
    public function admin(): self
    {
        return $this->with(['roles' => ['ROLE_ADMIN']]);
    }

    public function verified(): self
    {
        return $this->with(['verifiedAt' => new \DateTimeImmutable()]);
    }

    public function withPosts(int $count = 3): self
    {
        return $this->afterPersist(function (User $user) use ($count) {
            PostFactory::createMany($count, ['author' => $user]);
        });
    }
}
```

## Using Factories

### In Tests

```php
<?php

use App\Tests\Factory\UserFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class UserTest extends WebTestCase
{
    use Factories;
    use ResetDatabase;

    public function testSomething(): void
    {
        // Create single entity
        $user = UserFactory::createOne();

        // Create with specific attributes
        $admin = UserFactory::createOne([
            'email' => 'admin@example.com',
            'roles' => ['ROLE_ADMIN'],
        ]);

        // Create multiple
        $users = UserFactory::createMany(5);

        // Use named state
        $verifiedAdmin = UserFactory::new()
            ->admin()
            ->verified()
            ->create();

        // Create without persisting
        $transientUser = UserFactory::new()
            ->withoutPersisting()
            ->create();

        // Access the entity
        $entity = $user->object(); // Returns User entity
        $email = $user->getEmail(); // Proxy forwards method calls
    }
}
```

### In Fixtures

```php
<?php
// src/DataFixtures/AppFixtures.php

namespace App\DataFixtures;

use App\Tests\Factory\UserFactory;
use App\Tests\Factory\PostFactory;
use App\Tests\Factory\TagFactory;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class AppFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        // Create admin user
        $admin = UserFactory::createOne([
            'email' => 'admin@example.com',
        ])->admin();

        // Create regular users with posts
        UserFactory::createMany(10, function () {
            return [
                'posts' => PostFactory::createMany(rand(1, 5)),
            ];
        });

        // Create tags
        $tags = TagFactory::createSequence([
            ['name' => 'PHP'],
            ['name' => 'Symfony'],
            ['name' => 'Doctrine'],
            ['name' => 'API Platform'],
        ]);

        // Create posts with random tags
        PostFactory::createMany(20, function () use ($tags) {
            return [
                'tags' => $tags->random(rand(1, 3))->all(),
            ];
        });
    }
}
```

Load fixtures:

```bash
bin/console doctrine:fixtures:load
```

## Factory Features

### Sequences

```php
// Sequential data
$users = UserFactory::createSequence([
    ['email' => 'user1@example.com'],
    ['email' => 'user2@example.com'],
    ['email' => 'user3@example.com'],
]);

// With callback
$users = UserFactory::createSequence(
    fn(int $i) => ['email' => "user{$i}@example.com"]
)->count(10);
```

### Relationships

```php
<?php
// tests/Factory/PostFactory.php

final class PostFactory extends PersistentProxyObjectFactory
{
    protected function defaults(): array
    {
        return [
            'title' => self::faker()->sentence(),
            'content' => self::faker()->paragraphs(3, true),
            'author' => UserFactory::new(), // Creates new User
            'status' => PostStatus::DRAFT,
        ];
    }

    public function published(): self
    {
        return $this->with([
            'status' => PostStatus::PUBLISHED,
            'publishedAt' => new \DateTimeImmutable(),
        ]);
    }

    public function withTags(array $tags = []): self
    {
        return $this->afterPersist(function (Post $post) use ($tags) {
            foreach ($tags as $tag) {
                $post->addTag($tag instanceof Tag ? $tag : TagFactory::createOne(['name' => $tag])->object());
            }
        });
    }
}
```

Usage:

```php
// Explicit author
$user = UserFactory::createOne();
$post = PostFactory::createOne(['author' => $user]);

// Auto-created author
$post = PostFactory::createOne(); // Creates user automatically

// With tags
$post = PostFactory::new()
    ->published()
    ->withTags(['PHP', 'Symfony'])
    ->create();
```

### afterPersist Hook

```php
protected function initialize(): static
{
    return $this->afterPersist(function (User $user): void {
        // Runs after entity is persisted
        // Useful for creating related entities
        ProfileFactory::createOne(['user' => $user]);
    });
}
```

### Lazy Values

```php
protected function defaults(): array
{
    return [
        'slug' => fn() => self::faker()->slug(),
        'author' => lazy(fn() => UserFactory::createOne()),
    ];
}
```

## Test Database Reset

```php
use Zenstruck\Foundry\Test\ResetDatabase;

class MyTest extends WebTestCase
{
    use ResetDatabase; // Resets database before each test

    // Or for specific reset behavior:
    // use ResetDatabase { resetSchema as protected; }
}
```

Configuration:

```yaml
# config/packages/test/zenstruck_foundry.yaml
zenstruck_foundry:
    database_resetter:
        enabled: true
        strategy: schema # or 'migrate'
```

## Factory Best Practices

1. **Minimal defaults**: Only set required fields
2. **Use states**: Create named states for common variations
3. **Relationships**: Let factories create related entities by default
4. **Realistic data**: Use Faker for realistic test data
5. **Don't over-factory**: Simple data can be created inline

```php
// Good: Factory with minimal, realistic defaults
protected function defaults(): array
{
    return [
        'email' => self::faker()->unique()->safeEmail(),
        'roles' => ['ROLE_USER'],
    ];
}

// Bad: Too many defaults, unrealistic data
protected function defaults(): array
{
    return [
        'email' => 'test@test.com', // Not unique!
        'firstName' => 'Test',
        'lastName' => 'User',
        'phone' => '123456789',
        // ... 20 more fields
    ];
}
```


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- php bin/console doctrine:migrations:diff
- php bin/console doctrine:migrations:migrate
- ./vendor/bin/phpunit --filter=Doctrine

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

