# Reference

# Testing API Platform

## Setup

```bash
composer require --dev api-platform/core
composer require --dev zenstruck/foundry
```

## Basic API Tests

### Test Collection

```php
<?php
// tests/Functional/Api/ProductTest.php

namespace App\Tests\Functional\Api;

use ApiPlatform\Symfony\Bundle\Test\ApiTestCase;
use App\Tests\Factory\ProductFactory;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class ProductTest extends ApiTestCase
{
    use Factories;
    use ResetDatabase;

    public function testGetCollection(): void
    {
        ProductFactory::createMany(30);

        $response = static::createClient()->request('GET', '/api/products');

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('content-type', 'application/ld+json; charset=utf-8');
        $this->assertJsonContains([
            '@context' => '/api/contexts/Product',
            '@type' => 'hydra:Collection',
            'hydra:totalItems' => 30,
        ]);
        $this->assertCount(20, $response->toArray()['hydra:member']); // Default pagination
    }

    public function testGetItem(): void
    {
        $product = ProductFactory::createOne(['name' => 'Test Product']);

        $response = static::createClient()->request(
            'GET',
            '/api/products/' . $product->getId()
        );

        $this->assertResponseIsSuccessful();
        $this->assertJsonContains([
            '@type' => 'Product',
            'name' => 'Test Product',
        ]);
    }

    public function testGetItemNotFound(): void
    {
        static::createClient()->request('GET', '/api/products/999999');

        $this->assertResponseStatusCodeSame(404);
    }
}
```

### Test Create

```php
public function testCreateProduct(): void
{
    $response = static::createClient()->request('POST', '/api/products', [
        'json' => [
            'name' => 'New Product',
            'price' => 1999,
            'description' => 'A great product',
        ],
    ]);

    $this->assertResponseStatusCodeSame(201);
    $this->assertResponseHeaderSame('content-type', 'application/ld+json; charset=utf-8');
    $this->assertJsonContains([
        '@type' => 'Product',
        'name' => 'New Product',
        'price' => 1999,
    ]);
    $this->assertMatchesResourceItemJsonSchema(Product::class);
}

public function testCreateProductValidation(): void
{
    static::createClient()->request('POST', '/api/products', [
        'json' => [
            'name' => '', // Invalid: empty
            'price' => -100, // Invalid: negative
        ],
    ]);

    $this->assertResponseStatusCodeSame(422);
    $this->assertJsonContains([
        '@type' => 'ConstraintViolationList',
    ]);
}
```

### Test Update

```php
public function testUpdateProduct(): void
{
    $product = ProductFactory::createOne(['name' => 'Old Name']);

    static::createClient()->request('PUT', '/api/products/' . $product->getId(), [
        'json' => [
            'name' => 'New Name',
            'price' => $product->getPrice(),
        ],
    ]);

    $this->assertResponseIsSuccessful();
    $this->assertJsonContains(['name' => 'New Name']);
}

public function testPatchProduct(): void
{
    $product = ProductFactory::createOne(['name' => 'Old Name']);

    static::createClient()->request('PATCH', '/api/products/' . $product->getId(), [
        'headers' => ['Content-Type' => 'application/merge-patch+json'],
        'json' => ['name' => 'Patched Name'],
    ]);

    $this->assertResponseIsSuccessful();
    $this->assertJsonContains(['name' => 'Patched Name']);
}
```

### Test Delete

```php
public function testDeleteProduct(): void
{
    $product = ProductFactory::createOne();

    static::createClient()->request('DELETE', '/api/products/' . $product->getId());

    $this->assertResponseStatusCodeSame(204);

    // Verify deleted
    static::createClient()->request('GET', '/api/products/' . $product->getId());
    $this->assertResponseStatusCodeSame(404);
}
```

## Testing with Authentication

```php
public function testAuthenticatedUserCanCreate(): void
{
    $user = UserFactory::createOne();

    static::createClient()->request('POST', '/api/products', [
        'auth_bearer' => $this->getToken($user->object()),
        'json' => [
            'name' => 'New Product',
            'price' => 1999,
        ],
    ]);

    $this->assertResponseStatusCodeSame(201);
}

public function testUnauthenticatedUserCannotCreate(): void
{
    static::createClient()->request('POST', '/api/products', [
        'json' => [
            'name' => 'New Product',
            'price' => 1999,
        ],
    ]);

    $this->assertResponseStatusCodeSame(401);
}

public function testOnlyOwnerCanUpdate(): void
{
    $owner = UserFactory::createOne();
    $otherUser = UserFactory::createOne();
    $product = ProductFactory::createOne(['owner' => $owner]);

    // Owner can update
    static::createClient()->request('PUT', '/api/products/' . $product->getId(), [
        'auth_bearer' => $this->getToken($owner->object()),
        'json' => ['name' => 'Updated'],
    ]);
    $this->assertResponseIsSuccessful();

    // Other user cannot
    static::createClient()->request('PUT', '/api/products/' . $product->getId(), [
        'auth_bearer' => $this->getToken($otherUser->object()),
        'json' => ['name' => 'Hacked'],
    ]);
    $this->assertResponseStatusCodeSame(403);
}
```

## Testing Filters

```php
public function testSearchFilter(): void
{
    ProductFactory::createOne(['name' => 'Apple iPhone']);
    ProductFactory::createOne(['name' => 'Samsung Galaxy']);
    ProductFactory::createOne(['name' => 'Apple iPad']);

    $response = static::createClient()->request('GET', '/api/products?name=Apple');

    $this->assertResponseIsSuccessful();
    $this->assertCount(2, $response->toArray()['hydra:member']);
}

public function testRangeFilter(): void
{
    ProductFactory::createOne(['price' => 500]);
    ProductFactory::createOne(['price' => 1500]);
    ProductFactory::createOne(['price' => 3000]);

    $response = static::createClient()->request(
        'GET',
        '/api/products?price[gte]=1000&price[lte]=2000'
    );

    $this->assertResponseIsSuccessful();
    $this->assertCount(1, $response->toArray()['hydra:member']);
}

public function testOrderFilter(): void
{
    ProductFactory::createOne(['name' => 'Zebra']);
    ProductFactory::createOne(['name' => 'Apple']);
    ProductFactory::createOne(['name' => 'Banana']);

    $response = static::createClient()->request('GET', '/api/products?order[name]=asc');

    $this->assertResponseIsSuccessful();
    $data = $response->toArray()['hydra:member'];
    $this->assertEquals('Apple', $data[0]['name']);
    $this->assertEquals('Banana', $data[1]['name']);
    $this->assertEquals('Zebra', $data[2]['name']);
}
```

## Testing Pagination

```php
public function testPagination(): void
{
    ProductFactory::createMany(50);

    // First page
    $response = static::createClient()->request('GET', '/api/products');
    $data = $response->toArray();

    $this->assertCount(20, $data['hydra:member']); // Default per page
    $this->assertEquals(50, $data['hydra:totalItems']);
    $this->assertArrayHasKey('hydra:view', $data);
    $this->assertArrayHasKey('hydra:next', $data['hydra:view']);

    // Second page
    $response = static::createClient()->request('GET', '/api/products?page=2');
    $data = $response->toArray();

    $this->assertCount(20, $data['hydra:member']);
}

public function testCustomItemsPerPage(): void
{
    ProductFactory::createMany(20);

    $response = static::createClient()->request('GET', '/api/products?itemsPerPage=5');
    $data = $response->toArray();

    $this->assertCount(5, $data['hydra:member']);
}
```

## Testing Schema

```php
public function testResponseMatchesSchema(): void
{
    ProductFactory::createOne();

    static::createClient()->request('GET', '/api/products');

    $this->assertMatchesResourceCollectionJsonSchema(Product::class);
}

public function testItemMatchesSchema(): void
{
    $product = ProductFactory::createOne();

    static::createClient()->request('GET', '/api/products/' . $product->getId());

    $this->assertMatchesResourceItemJsonSchema(Product::class);
}
```

## Best Practices

1. **Use Foundry factories**: Consistent test data
2. **Reset database**: Use `ResetDatabase` trait
3. **Test both success and failure**: Validation, auth, not found
4. **Test filters and pagination**: These are common API features
5. **Schema assertions**: Verify response structure
6. **Authentication tests**: Test both authenticated and anonymous


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- ./vendor/bin/phpunit --filter=Api
- ./vendor/bin/phpstan analyse
- php bin/console debug:router

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

