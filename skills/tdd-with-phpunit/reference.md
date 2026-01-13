# Reference

# TDD with PHPUnit for Symfony

## Installation

PHPUnit comes with Symfony by default:

```bash
composer require --dev symfony/test-pack
composer require --dev zenstruck/foundry
```

## Test Execution

```bash
# Docker
docker compose exec php ./vendor/bin/phpunit

# Host
./vendor/bin/phpunit

# Single file
./vendor/bin/phpunit tests/Unit/Service/OrderServiceTest.php

# With filter
./vendor/bin/phpunit --filter testCreatesOrder

# With coverage
./vendor/bin/phpunit --coverage-html coverage/
```

## Test Types

### Unit Tests (TestCase)

For pure logic without Symfony container:

```php
<?php
// tests/Unit/ValueObject/MoneyTest.php

namespace App\Tests\Unit\ValueObject;

use App\ValueObject\Money;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function testAddsMoney(): void
    {
        $money1 = new Money(100, 'EUR');
        $money2 = new Money(50, 'EUR');

        $result = $money1->add($money2);

        $this->assertEquals(150, $result->getAmount());
        $this->assertEquals('EUR', $result->getCurrency());
    }

    public function testThrowsExceptionForDifferentCurrencies(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Cannot add different currencies');

        $money1 = new Money(100, 'EUR');
        $money2 = new Money(50, 'USD');

        $money1->add($money2);
    }
}
```

### Integration Tests (KernelTestCase)

For testing services with the container:

```php
<?php
// tests/Integration/Service/OrderServiceTest.php

namespace App\Tests\Integration\Service;

use App\Entity\User;
use App\Service\OrderService;
use App\Tests\Factory\UserFactory;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class OrderServiceTest extends KernelTestCase
{
    use Factories;
    use ResetDatabase;

    private OrderService $orderService;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->orderService = self::getContainer()->get(OrderService::class);
    }

    public function testCreatesOrderForUser(): void
    {
        // Arrange
        $user = UserFactory::createOne()->object();

        // Act
        $order = $this->orderService->createOrder($user, [
            ['productId' => 1, 'quantity' => 2],
        ]);

        // Assert
        $this->assertNotNull($order->getId());
        $this->assertSame($user, $order->getCustomer());
        $this->assertCount(1, $order->getItems());
    }

    public function testThrowsExceptionForEmptyItems(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $user = UserFactory::createOne()->object();
        $this->orderService->createOrder($user, []);
    }
}
```

### Functional Tests (WebTestCase)

For testing HTTP endpoints:

```php
<?php
// tests/Functional/Controller/OrderControllerTest.php

namespace App\Tests\Functional\Controller;

use App\Tests\Factory\UserFactory;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class OrderControllerTest extends WebTestCase
{
    use Factories;
    use ResetDatabase;

    public function testCreatesOrderViaApi(): void
    {
        $client = static::createClient();
        $user = UserFactory::createOne()->object();

        $client->loginUser($user);

        $client->request('POST', '/api/orders', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'items' => [
                ['productId' => 1, 'quantity' => 2],
            ],
        ]));

        $this->assertResponseStatusCodeSame(201);

        $response = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('id', $response);
    }

    public function testRequiresAuthentication(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/orders');

        $this->assertResponseStatusCodeSame(401);
    }

    public function testOnlyOwnerCanViewOrder(): void
    {
        $client = static::createClient();
        $owner = UserFactory::createOne()->object();
        $otherUser = UserFactory::createOne()->object();

        // Create order as owner
        $client->loginUser($owner);
        $client->request('POST', '/api/orders', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['items' => [['productId' => 1, 'quantity' => 1]]]));

        $response = json_decode($client->getResponse()->getContent(), true);
        $orderId = $response['id'];

        // Try to access as other user
        $client->loginUser($otherUser);
        $client->request('GET', "/api/orders/{$orderId}");

        $this->assertResponseStatusCodeSame(403);
    }
}
```

## RED-GREEN-REFACTOR Cycle

### RED: Write Failing Test First

```php
public function testCalculatesOrderTotal(): void
{
    $user = UserFactory::createOne()->object();

    $order = $this->orderService->createOrder($user, [
        ['productId' => 1, 'quantity' => 2, 'price' => 1000], // 10.00 EUR
        ['productId' => 2, 'quantity' => 1, 'price' => 500],  // 5.00 EUR
    ]);

    // This will fail - method doesn't exist yet
    $this->assertEquals(2500, $order->getTotal()->getAmount());
}
```

### GREEN: Implement Minimum Code

```php
public function getTotal(): Money
{
    $total = 0;
    foreach ($this->items as $item) {
        $total += $item->getPrice() * $item->getQuantity();
    }
    return new Money($total, 'EUR');
}
```

### REFACTOR: Improve Without Changing Behavior

```php
public function getTotal(): Money
{
    return array_reduce(
        $this->items->toArray(),
        fn(Money $carry, OrderItem $item) => $carry->add($item->getSubtotal()),
        Money::zero('EUR')
    );
}
```

## Assertions Reference

```php
// Equality
$this->assertEquals($expected, $actual);
$this->assertSame($expected, $actual);  // Strict type

// Boolean
$this->assertTrue($value);
$this->assertFalse($value);
$this->assertNull($value);
$this->assertNotNull($value);

// Arrays
$this->assertCount(3, $array);
$this->assertArrayHasKey('key', $array);
$this->assertContains($needle, $haystack);
$this->assertEmpty($array);

// Objects
$this->assertInstanceOf(Order::class, $object);

// Strings
$this->assertStringContainsString('needle', $haystack);
$this->assertMatchesRegularExpression('/pattern/', $string);

// Exceptions
$this->expectException(\InvalidArgumentException::class);
$this->expectExceptionMessage('message');
```

## Data Providers

```php
/**
 * @dataProvider invalidEmailProvider
 */
public function testRejectsInvalidEmails(string $email): void
{
    $this->expectException(ValidationException::class);

    $this->userService->register($email, 'password');
}

public static function invalidEmailProvider(): array
{
    return [
        'missing @' => ['invalidemail.com'],
        'missing domain' => ['test@'],
        'spaces' => ['test @example.com'],
        'empty' => [''],
    ];
}
```

## Best Practices

1. **One concept per test**: Test one behavior at a time
2. **Descriptive names**: `testCreatesOrderWithValidItems()`
3. **Arrange-Act-Assert**: Clear structure in each test
4. **Use factories**: Don't create entities manually
5. **Reset database**: Use `ResetDatabase` trait for isolation
