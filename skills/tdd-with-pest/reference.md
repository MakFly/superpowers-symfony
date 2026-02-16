# Reference

# TDD with Pest PHP for Symfony

## Installation

```bash
composer require pestphp/pest --dev --with-all-dependencies
composer require pestphp/pest-plugin-symfony --dev
composer require zenstruck/foundry --dev

# Initialize Pest
./vendor/bin/pest --init
```

## Test Execution

```bash
# Docker
docker compose exec php ./vendor/bin/pest --parallel

# Host
./vendor/bin/pest --parallel

# Single file
./vendor/bin/pest tests/Unit/Service/OrderServiceTest.php

# With filter
./vendor/bin/pest --filter "creates order"

# With coverage
./vendor/bin/pest --coverage --min=80
```

## RED Phase - Failure First

Write tests before implementation. Use Foundry for factories.

### Unit Test Example

```php
<?php
// tests/Unit/Service/OrderServiceTest.php

use App\Service\OrderService;
use App\Entity\Order;
use App\Entity\User;
use function Zenstruck\Foundry\Persistence\persist;

beforeEach(function () {
    $this->orderService = $this->getContainer()->get(OrderService::class);
});

it('creates an order for a user', function () {
    // Arrange
    $user = persist(User::class, [
        'email' => 'test@example.com',
    ]);

    // Act
    $order = $this->orderService->createOrder($user->object(), [
        ['productId' => 1, 'quantity' => 2],
    ]);

    // Assert
    expect($order)
        ->toBeInstanceOf(Order::class)
        ->and($order->getCustomer())->toBe($user->object())
        ->and($order->getItems())->toHaveCount(1);
});

it('throws exception for empty items', function () {
    $user = persist(User::class);

    $this->orderService->createOrder($user->object(), []);
})->throws(InvalidArgumentException::class, 'Order must have at least one item');
```

### Functional Test Example

```php
<?php
// tests/Functional/Api/OrderTest.php

use App\Entity\User;
use function Zenstruck\Foundry\Persistence\persist;

it('creates an order via API', function () {
    // Arrange
    $user = persist(User::class, ['email' => 'test@example.com']);

    // Act
    $response = $this->client
        ->loginUser($user->object())
        ->request('POST', '/api/orders', [
            'json' => [
                'items' => [
                    ['productId' => 1, 'quantity' => 2],
                ],
            ],
        ]);

    // Assert
    expect($response->getStatusCode())->toBe(201)
        ->and($response->toArray())->toHaveKey('id');
});

it('requires authentication', function () {
    $response = $this->client->request('POST', '/api/orders', [
        'json' => ['items' => []],
    ]);

    expect($response->getStatusCode())->toBe(401);
});
```

## GREEN Phase - Minimal Code

Write the simplest code to pass. No extras. No premature optimization.

```php
<?php
// src/Service/OrderService.php

class OrderService
{
    public function createOrder(User $user, array $items): Order
    {
        if (empty($items)) {
            throw new \InvalidArgumentException('Order must have at least one item');
        }

        $order = new Order();
        $order->setCustomer($user);
        $order->setStatus(OrderStatus::PENDING);

        foreach ($items as $item) {
            $orderItem = new OrderItem();
            $orderItem->setProductId($item['productId']);
            $orderItem->setQuantity($item['quantity']);
            $order->addItem($orderItem);
        }

        $this->em->persist($order);
        $this->em->flush();

        return $order;
    }
}
```

## REFACTOR Phase

Once green, improve:
- Extract services from controllers
- Create value objects for complex data
- Add repository methods for queries

## Foundry Integration

```php
<?php
// tests/Factory/UserFactory.php

namespace App\Tests\Factory;

use App\Entity\User;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;

final class UserFactory extends PersistentProxyObjectFactory
{
    public static function class(): string
    {
        return User::class;
    }

    protected function defaults(): array
    {
        return [
            'email' => self::faker()->unique()->email(),
            'password' => 'hashed_password',
            'roles' => ['ROLE_USER'],
        ];
    }

    public function admin(): self
    {
        return $this->with(['roles' => ['ROLE_ADMIN']]);
    }
}
```

Usage:

```php
use App\Tests\Factory\UserFactory;

// Single user
$user = UserFactory::createOne();

// With specific attributes
$admin = UserFactory::createOne()->admin();

// Multiple
$users = UserFactory::createMany(5);

// Without persisting
$user = UserFactory::new()->withoutPersisting()->create();
```

## Pest Expectations

```php
// Basic
expect($value)->toBe($expected);
expect($value)->toEqual($expected);
expect($value)->toBeTrue();
expect($value)->toBeFalse();
expect($value)->toBeNull();
expect($value)->toBeEmpty();

// Types
expect($value)->toBeInstanceOf(Order::class);
expect($value)->toBeArray();
expect($value)->toBeString();
expect($value)->toBeInt();

// Arrays
expect($array)->toHaveCount(3);
expect($array)->toHaveKey('id');
expect($array)->toContain($item);

// Strings
expect($string)->toContain('substring');
expect($string)->toStartWith('prefix');
expect($string)->toMatch('/pattern/');

// Chaining
expect($order)
    ->toBeInstanceOf(Order::class)
    ->and($order->getStatus())->toBe(OrderStatus::PENDING)
    ->and($order->getItems())->toHaveCount(2);
```

## Key Principles

- Every production change requires a failing test first
- Use Foundry factories for realistic test data
- Functional tests for HTTP, unit tests for services
- Keep tests deterministic - no random delays
- One assertion concept per test (can chain related expects)


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

