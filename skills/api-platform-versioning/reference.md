# Reference

# API Platform Versioning

## Versioning Strategies

### 1. URI Versioning (Recommended)

```php
<?php
// src/Entity/Product.php

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;

// Version 1
#[ApiResource(
    uriTemplate: '/v1/products',
    shortName: 'Product',
    operations: [
        new GetCollection(uriTemplate: '/v1/products'),
        new Get(uriTemplate: '/v1/products/{id}'),
    ],
    normalizationContext: ['groups' => ['product:read:v1']],
)]

// Version 2 - same entity, different representation
#[ApiResource(
    uriTemplate: '/v2/products',
    shortName: 'ProductV2',
    operations: [
        new GetCollection(uriTemplate: '/v2/products'),
        new Get(uriTemplate: '/v2/products/{id}'),
    ],
    normalizationContext: ['groups' => ['product:read:v2']],
)]
class Product
{
    #[Groups(['product:read:v1', 'product:read:v2'])]
    private ?int $id = null;

    #[Groups(['product:read:v1', 'product:read:v2'])]
    private string $name;

    // V1: price in cents as integer
    #[Groups(['product:read:v1'])]
    private int $price;

    // V2: price as Money object
    #[Groups(['product:read:v2'])]
    private Money $priceAmount;

    // V2 only: new field
    #[Groups(['product:read:v2'])]
    private ?string $sku = null;
}
```

### 2. Separate DTOs per Version

```php
<?php
// src/Dto/V1/ProductOutput.php

namespace App\Dto\V1;

final class ProductOutput
{
    public function __construct(
        public int $id,
        public string $name,
        public int $price, // Cents
    ) {}
}

// src/Dto/V2/ProductOutput.php

namespace App\Dto\V2;

final class ProductOutput
{
    public function __construct(
        public int $id,
        public string $name,
        public array $price, // {amount: 1999, currency: 'EUR'}
        public ?string $sku,
        public array $metadata,
    ) {}
}
```

```php
<?php
// src/Entity/Product.php

use App\Dto\V1\ProductOutput as ProductOutputV1;
use App\Dto\V2\ProductOutput as ProductOutputV2;

#[ApiResource(
    uriTemplate: '/v1/products',
    operations: [
        new Get(
            uriTemplate: '/v1/products/{id}',
            output: ProductOutputV1::class,
            provider: ProductV1Provider::class,
        ),
    ],
)]
#[ApiResource(
    uriTemplate: '/v2/products',
    operations: [
        new Get(
            uriTemplate: '/v2/products/{id}',
            output: ProductOutputV2::class,
            provider: ProductV2Provider::class,
        ),
    ],
)]
class Product { /* ... */ }
```

### 3. Header-Based Versioning

```php
<?php
// src/State/VersionedProductProvider.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use Symfony\Component\HttpFoundation\RequestStack;

class VersionedProductProvider implements ProviderInterface
{
    public function __construct(
        private ProviderInterface $itemProvider,
        private RequestStack $requestStack,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $product = $this->itemProvider->provide($operation, $uriVariables, $context);

        if (!$product) {
            return null;
        }

        $request = $this->requestStack->getCurrentRequest();
        $version = $request?->headers->get('X-API-Version', 'v2');

        return match ($version) {
            'v1' => $this->transformToV1($product),
            'v2' => $this->transformToV2($product),
            default => $this->transformToV2($product),
        };
    }

    private function transformToV1(Product $product): ProductOutputV1
    {
        return new ProductOutputV1(
            id: $product->getId(),
            name: $product->getName(),
            price: $product->getPrice(),
        );
    }

    private function transformToV2(Product $product): ProductOutputV2
    {
        return new ProductOutputV2(
            id: $product->getId(),
            name: $product->getName(),
            price: [
                'amount' => $product->getPrice(),
                'currency' => 'EUR',
            ],
            sku: $product->getSku(),
            metadata: $product->getMetadata(),
        );
    }
}
```

## Deprecation

### Mark Deprecated Operations

```php
#[ApiResource(
    operations: [
        // Deprecated v1 endpoint
        new Get(
            uriTemplate: '/v1/products/{id}',
            deprecationReason: 'Use /v2/products/{id} instead. Will be removed in 2025.',
            openapiContext: [
                'deprecated' => true,
            ],
        ),
        // Current v2 endpoint
        new Get(
            uriTemplate: '/v2/products/{id}',
        ),
    ],
)]
class Product { /* ... */ }
```

### Sunset Header

```php
<?php
// src/EventSubscriber/DeprecationSubscriber.php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class DeprecationSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::RESPONSE => 'onResponse',
        ];
    }

    public function onResponse(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        $path = $request->getPathInfo();

        // Add sunset header for v1 endpoints
        if (str_starts_with($path, '/api/v1/')) {
            $response = $event->getResponse();
            $response->headers->set('Sunset', 'Sat, 01 Jan 2025 00:00:00 GMT');
            $response->headers->set('Deprecation', 'true');
            $response->headers->set(
                'Link',
                '</api/v2' . substr($path, 7) . '>; rel="successor-version"'
            );
        }
    }
}
```

## Migration Guide Pattern

```php
<?php
// src/Dto/V2/ProductOutput.php

namespace App\Dto\V2;

/**
 * Product representation (API v2)
 *
 * Changes from v1:
 * - `price` is now an object with `amount` and `currency`
 * - Added `sku` field
 * - Added `metadata` field
 * - Removed `priceInCents` (use `price.amount`)
 */
final class ProductOutput
{
    // ...
}
```

## Routing Configuration

```yaml
# config/routes/api_platform.yaml
api_platform:
    resource: .
    type: api_platform
    prefix: /api
```

## Testing Multiple Versions

```php
public function testV1ReturnsLegacyFormat(): void
{
    $product = ProductFactory::createOne(['price' => 1999]);

    $response = $this->client->request('GET', '/api/v1/products/' . $product->getId());

    $this->assertResponseIsSuccessful();
    $data = $response->toArray();

    // V1 format: price as integer
    $this->assertIsInt($data['price']);
    $this->assertEquals(1999, $data['price']);
}

public function testV2ReturnsNewFormat(): void
{
    $product = ProductFactory::createOne(['price' => 1999]);

    $response = $this->client->request('GET', '/api/v2/products/' . $product->getId());

    $this->assertResponseIsSuccessful();
    $data = $response->toArray();

    // V2 format: price as object
    $this->assertIsArray($data['price']);
    $this->assertEquals(1999, $data['price']['amount']);
    $this->assertEquals('EUR', $data['price']['currency']);
}
```

## Best Practices

1. **URI versioning** for major changes - clearest for consumers
2. **Groups for minor changes** - add fields without new version
3. **Set sunset dates** - give consumers time to migrate
4. **Document changes** - changelog per version
5. **Test all versions** - maintain test coverage
6. **Limit active versions** - max 2-3 at a time


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

