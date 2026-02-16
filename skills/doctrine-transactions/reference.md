# Reference

# Doctrine Transactions

## Basic Transactions

### Implicit Transactions

By default, Doctrine wraps each `flush()` in a transaction:

```php
$user = new User();
$user->setEmail('test@example.com');

$em->persist($user);
$em->flush(); // Auto-commits in transaction
```

### Explicit Transactions

For multiple operations that must succeed or fail together:

```php
<?php
// src/Service/OrderService.php

class OrderService
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    public function createOrderWithPayment(User $user, array $items): Order
    {
        $this->em->beginTransaction();

        try {
            // Create order
            $order = new Order();
            $order->setCustomer($user);
            $order->setStatus(OrderStatus::PENDING);

            foreach ($items as $item) {
                $orderItem = new OrderItem();
                $orderItem->setProduct($item['product']);
                $orderItem->setQuantity($item['quantity']);
                $order->addItem($orderItem);
            }

            $this->em->persist($order);

            // Create payment
            $payment = new Payment();
            $payment->setOrder($order);
            $payment->setAmount($order->getTotal());
            $this->em->persist($payment);

            $this->em->flush();
            $this->em->commit();

            return $order;

        } catch (\Exception $e) {
            $this->em->rollback();
            throw $e;
        }
    }
}
```

### Using Transactional Helper

Cleaner approach:

```php
public function createOrder(User $user, array $items): Order
{
    return $this->em->wrapInTransaction(function () use ($user, $items) {
        $order = new Order();
        $order->setCustomer($user);

        foreach ($items as $item) {
            $order->addItem(new OrderItem($item));
        }

        $this->em->persist($order);

        return $order;
    });
}
```

## Flush Strategies

### Single Flush (Recommended)

```php
// Good: Single flush for all changes
$user = new User();
$user->setEmail('test@example.com');
$em->persist($user);

$profile = new Profile();
$profile->setUser($user);
$em->persist($profile);

$em->flush(); // One transaction, one commit
```

### Avoid Multiple Flushes

```php
// Bad: Multiple flushes = multiple transactions
$user = new User();
$em->persist($user);
$em->flush(); // Transaction 1

$profile = new Profile();
$profile->setUser($user);
$em->persist($profile);
$em->flush(); // Transaction 2 - not atomic!
```

### Flush Only When Needed

```php
// Service layer flushes
class UserService
{
    public function register(string $email): User
    {
        $user = new User();
        $user->setEmail($email);
        $this->em->persist($user);
        $this->em->flush(); // Service controls transaction boundary
        return $user;
    }
}

// Controller doesn't flush
class UserController
{
    #[Route('/register', methods: ['POST'])]
    public function register(Request $request, UserService $service): Response
    {
        $user = $service->register($request->get('email'));
        return new Response('Created', 201);
    }
}
```

## Optimistic Locking

Prevent concurrent modification conflicts:

```php
<?php
// src/Entity/Article.php

#[ORM\Entity]
class Article
{
    #[ORM\Version]
    #[ORM\Column(type: 'integer')]
    private int $version = 1;

    public function getVersion(): int
    {
        return $this->version;
    }
}
```

Usage:

```php
use Doctrine\ORM\OptimisticLockException;

public function updateArticle(int $id, string $content, int $expectedVersion): void
{
    $article = $this->em->find(Article::class, $id);

    // Lock with expected version
    $this->em->lock($article, LockMode::OPTIMISTIC, $expectedVersion);

    $article->setContent($content);

    try {
        $this->em->flush();
    } catch (OptimisticLockException $e) {
        // Version mismatch - someone else modified it
        throw new ConflictException('Article was modified by another user');
    }
}
```

## Pessimistic Locking

Lock rows in database:

```php
use Doctrine\DBAL\LockMode;

public function processPayment(int $orderId): void
{
    $this->em->beginTransaction();

    try {
        // Lock the row for update
        $order = $this->em->find(
            Order::class,
            $orderId,
            LockMode::PESSIMISTIC_WRITE
        );

        if ($order->getStatus() !== OrderStatus::PENDING) {
            throw new \Exception('Order already processed');
        }

        $order->setStatus(OrderStatus::PROCESSING);
        $this->em->flush();
        $this->em->commit();

    } catch (\Exception $e) {
        $this->em->rollback();
        throw $e;
    }
}
```

Lock modes:
- `PESSIMISTIC_READ`: Shared lock (SELECT ... FOR SHARE)
- `PESSIMISTIC_WRITE`: Exclusive lock (SELECT ... FOR UPDATE)

## Error Handling

### Connection Lost

```php
use Doctrine\DBAL\Exception\ConnectionLost;

try {
    $this->em->flush();
} catch (ConnectionLost $e) {
    // Reconnect and retry
    $this->em->getConnection()->connect();
    $this->em->flush();
}
```

### Constraint Violations

```php
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

try {
    $user = new User();
    $user->setEmail($email);
    $this->em->persist($user);
    $this->em->flush();
} catch (UniqueConstraintViolationException $e) {
    throw new DuplicateEmailException('Email already exists');
}
```

## EntityManager State

### After Exception

After a rollback, the EntityManager may be in an inconsistent state:

```php
try {
    $this->em->flush();
} catch (\Exception $e) {
    $this->em->rollback();

    // Clear the EntityManager
    $this->em->clear();

    // Re-fetch entities if needed
    $user = $this->em->find(User::class, $userId);
}
```

### Clearing EntityManager

```php
// Clear all managed entities
$this->em->clear();

// Clear specific entity type
$this->em->clear(User::class);
```

## Best Practices

1. **Single flush per operation**: Group related changes
2. **Service layer transactions**: Controllers don't manage transactions
3. **Use wrapInTransaction**: Cleaner than try/catch
4. **Optimistic locking**: For concurrent editing scenarios
5. **Clear after rollback**: Reset EntityManager state
6. **Short transactions**: Don't hold locks too long

```php
// Good pattern
class OrderService
{
    public function createOrder(CreateOrderDTO $dto): Order
    {
        return $this->em->wrapInTransaction(function () use ($dto) {
            $order = new Order();
            // ... build order
            $this->em->persist($order);
            return $order;
        });
    }
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

