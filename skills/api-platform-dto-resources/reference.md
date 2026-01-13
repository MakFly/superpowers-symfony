# Reference

# API Platform DTO Resources

Use plain PHP classes (DTOs) as API resources instead of Doctrine entities. This approach provides complete separation between your API contract and database schema.

## Why DTO Resources?

- **API-First Design** - Design your API independently from database
- **No Doctrine Coupling** - Works with any data source (cache, external APIs, files)
- **Clean Contracts** - Input and output shapes match API documentation exactly
- **Versioning** - Easily maintain multiple API versions with different DTOs
- **Security** - No accidental exposure of entity internals

## Basic DTO Resource

### Define the DTO

```php
<?php
// src/ApiResource/ProductResource.php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Delete;
use App\State\ProductResourceProvider;
use App\State\ProductResourceProcessor;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Product',
    operations: [
        new GetCollection(provider: ProductResourceProvider::class),
        new Get(provider: ProductResourceProvider::class),
        new Post(processor: ProductResourceProcessor::class),
        new Put(processor: ProductResourceProcessor::class),
        new Delete(processor: ProductResourceProcessor::class),
    ],
)]
final class ProductResource
{
    public function __construct(
        #[ApiProperty(identifier: true)]
        public readonly ?int $id = null,

        #[Assert\NotBlank]
        #[Assert\Length(min: 3, max: 255)]
        public readonly ?string $name = null,

        #[Assert\Length(max: 1000)]
        public readonly ?string $description = null,

        #[Assert\Positive]
        public readonly ?int $priceInCents = null,

        #[Assert\PositiveOrZero]
        public readonly ?int $stock = null,

        public readonly ?string $formattedPrice = null,

        public readonly ?bool $inStock = null,

        public readonly ?\DateTimeImmutable $createdAt = null,
    ) {}
}
```

### State Provider

```php
<?php
// src/State/ProductResourceProvider.php

namespace App\State;

use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\ProductResource;
use App\Repository\ProductRepository;

/**
 * @implements ProviderInterface<ProductResource>
 */
final class ProductResourceProvider implements ProviderInterface
{
    public function __construct(
        private ProductRepository $repository,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if ($operation instanceof CollectionOperationInterface) {
            return $this->provideCollection($context);
        }

        return $this->provideItem($uriVariables['id']);
    }

    private function provideCollection(array $context): array
    {
        $products = $this->repository->findAll();

        return array_map(
            fn($product) => $this->toResource($product),
            $products
        );
    }

    private function provideItem(int $id): ?ProductResource
    {
        $product = $this->repository->find($id);

        return $product ? $this->toResource($product) : null;
    }

    private function toResource(object $product): ProductResource
    {
        return new ProductResource(
            id: $product->getId(),
            name: $product->getName(),
            description: $product->getDescription(),
            priceInCents: $product->getPriceInCents(),
            stock: $product->getStock(),
            formattedPrice: sprintf('$%.2f', $product->getPriceInCents() / 100),
            inStock: $product->getStock() > 0,
            createdAt: $product->getCreatedAt(),
        );
    }
}
```

### State Processor

```php
<?php
// src/State/ProductResourceProcessor.php

namespace App\State;

use ApiPlatform\Metadata\DeleteOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\ProductResource;
use App\Entity\Product;
use App\Repository\ProductRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * @implements ProcessorInterface<ProductResource, ProductResource|null>
 */
final class ProductResourceProcessor implements ProcessorInterface
{
    public function __construct(
        private EntityManagerInterface $em,
        private ProductRepository $repository,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): ?ProductResource
    {
        /** @var ProductResource $data */

        if ($operation instanceof DeleteOperationInterface) {
            $product = $this->repository->find($uriVariables['id']);
            if ($product) {
                $this->em->remove($product);
                $this->em->flush();
            }
            return null;
        }

        // Update existing or create new
        $product = isset($uriVariables['id'])
            ? $this->repository->find($uriVariables['id'])
            : new Product();

        $product->setName($data->name);
        $product->setDescription($data->description);
        $product->setPriceInCents($data->priceInCents);
        $product->setStock($data->stock ?? 0);

        $this->em->persist($product);
        $this->em->flush();

        return new ProductResource(
            id: $product->getId(),
            name: $product->getName(),
            description: $product->getDescription(),
            priceInCents: $product->getPriceInCents(),
            stock: $product->getStock(),
            formattedPrice: sprintf('$%.2f', $product->getPriceInCents() / 100),
            inStock: $product->getStock() > 0,
            createdAt: $product->getCreatedAt(),
        );
    }
}
```

## Separate Input/Output DTOs

For more control, use different DTOs for input and output:

### Output DTO

```php
<?php
// src/ApiResource/ProductOutput.php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;

final class ProductOutput
{
    public function __construct(
        #[ApiProperty(identifier: true)]
        public readonly int $id,

        public readonly string $name,

        public readonly ?string $description,

        public readonly string $formattedPrice,

        public readonly bool $inStock,

        public readonly int $stockLevel,

        public readonly string $createdAt,

        /** @var CategoryOutput[] */
        public readonly array $categories = [],
    ) {}
}
```

### Input DTO

```php
<?php
// src/ApiResource/ProductInput.php

namespace App\ApiResource;

use Symfony\Component\Validator\Constraints as Assert;

final class ProductInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(min: 3, max: 255)]
        public readonly string $name,

        #[Assert\Length(max: 1000)]
        public readonly ?string $description = null,

        #[Assert\NotBlank]
        #[Assert\Positive]
        public readonly int $priceInCents,

        #[Assert\PositiveOrZero]
        public readonly int $stock = 0,

        /** @var int[] Category IDs */
        #[Assert\All([new Assert\Positive()])]
        public readonly array $categoryIds = [],
    ) {}
}
```

### Resource Configuration

```php
<?php
// src/ApiResource/ProductResource.php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use App\State\ProductProvider;
use App\State\ProductProcessor;

#[ApiResource(
    shortName: 'Product',
    operations: [
        new GetCollection(
            output: ProductOutput::class,
            provider: ProductProvider::class,
        ),
        new Get(
            output: ProductOutput::class,
            provider: ProductProvider::class,
        ),
        new Post(
            input: ProductInput::class,
            output: ProductOutput::class,
            processor: ProductProcessor::class,
        ),
        new Put(
            input: ProductInput::class,
            output: ProductOutput::class,
            processor: ProductProcessor::class,
        ),
        new Patch(
            input: ProductInput::class,
            output: ProductOutput::class,
            processor: ProductProcessor::class,
        ),
        new Delete(
            processor: ProductProcessor::class,
        ),
    ],
)]
final class ProductResource
{
    #[ApiProperty(identifier: true)]
    public ?int $id = null;
}
```

## Pagination with DTOs

```php
<?php
// src/State/ProductProvider.php

namespace App\State;

use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\Pagination\Pagination;
use ApiPlatform\State\Pagination\TraversablePaginator;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\ProductOutput;
use App\Repository\ProductRepository;

/**
 * @implements ProviderInterface<ProductOutput>
 */
final class ProductProvider implements ProviderInterface
{
    public function __construct(
        private ProductRepository $repository,
        private Pagination $pagination,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|iterable|null
    {
        if (!$operation instanceof CollectionOperationInterface) {
            $product = $this->repository->find($uriVariables['id']);
            return $product ? $this->toOutput($product) : null;
        }

        // Get pagination parameters
        [$page, , $limit] = $this->pagination->getPagination($operation, $context);
        $offset = ($page - 1) * $limit;

        // Get paginated results
        $products = $this->repository->findBy([], ['createdAt' => 'DESC'], $limit, $offset);
        $total = $this->repository->count([]);

        // Transform to DTOs
        $items = array_map(fn($p) => $this->toOutput($p), $products);

        return new TraversablePaginator(
            new \ArrayIterator($items),
            $page,
            $limit,
            $total,
        );
    }

    private function toOutput(object $product): ProductOutput
    {
        return new ProductOutput(
            id: $product->getId(),
            name: $product->getName(),
            description: $product->getDescription(),
            formattedPrice: sprintf('$%.2f', $product->getPriceInCents() / 100),
            inStock: $product->getStock() > 0,
            stockLevel: $product->getStock(),
            createdAt: $product->getCreatedAt()->format('c'),
            categories: array_map(
                fn($cat) => new CategoryOutput($cat->getId(), $cat->getName()),
                $product->getCategories()->toArray()
            ),
        );
    }
}
```

## Nested Resources

### Nested DTO Structure

```php
<?php
// src/ApiResource/OrderResource.php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\State\OrderProvider;
use App\State\CreateOrderProcessor;

#[ApiResource(
    shortName: 'Order',
    operations: [
        new GetCollection(provider: OrderProvider::class),
        new Get(provider: OrderProvider::class),
        new Post(
            input: CreateOrderInput::class,
            processor: CreateOrderProcessor::class,
        ),
    ],
)]
final class OrderResource
{
    public function __construct(
        #[ApiProperty(identifier: true)]
        public readonly ?int $id = null,

        public readonly ?string $orderNumber = null,

        public readonly ?string $status = null,

        public readonly ?CustomerResource $customer = null,

        /** @var OrderItemResource[] */
        public readonly array $items = [],

        public readonly ?string $totalFormatted = null,

        public readonly ?\DateTimeImmutable $createdAt = null,
    ) {}
}
```

```php
<?php
// src/ApiResource/OrderItemResource.php

namespace App\ApiResource;

final class OrderItemResource
{
    public function __construct(
        public readonly int $id,
        public readonly ProductResource $product,
        public readonly int $quantity,
        public readonly string $unitPriceFormatted,
        public readonly string $totalFormatted,
    ) {}
}
```

```php
<?php
// src/ApiResource/CreateOrderInput.php

namespace App\ApiResource;

use Symfony\Component\Validator\Constraints as Assert;

final class CreateOrderInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Positive]
        public readonly int $customerId,

        /** @var CreateOrderItemInput[] */
        #[Assert\NotBlank]
        #[Assert\Count(min: 1)]
        #[Assert\Valid]
        public readonly array $items,

        public readonly ?string $notes = null,
    ) {}
}

final class CreateOrderItemInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Positive]
        public readonly int $productId,

        #[Assert\NotBlank]
        #[Assert\Positive]
        public readonly int $quantity,
    ) {}
}
```

## External API Resource

DTO resource backed by an external API:

```php
<?php
// src/ApiResource/WeatherResource.php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\WeatherProvider;

#[ApiResource(
    shortName: 'Weather',
    operations: [
        new Get(
            uriTemplate: '/weather/{city}',
            provider: WeatherProvider::class,
        ),
    ],
)]
final class WeatherResource
{
    public function __construct(
        #[ApiProperty(identifier: true)]
        public readonly string $city,

        public readonly float $temperature,

        public readonly string $condition,

        public readonly int $humidity,

        public readonly float $windSpeed,

        public readonly string $lastUpdated,
    ) {}
}
```

```php
<?php
// src/State/WeatherProvider.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\WeatherResource;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * @implements ProviderInterface<WeatherResource>
 */
final class WeatherProvider implements ProviderInterface
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private CacheInterface $cache,
        private string $weatherApiKey,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ?WeatherResource
    {
        $city = $uriVariables['city'];

        return $this->cache->get("weather_{$city}", function (ItemInterface $item) use ($city) {
            $item->expiresAfter(300); // 5 minutes

            $response = $this->httpClient->request('GET', 'https://api.weather.example/current', [
                'query' => [
                    'city' => $city,
                    'apikey' => $this->weatherApiKey,
                ],
            ]);

            $data = $response->toArray();

            return new WeatherResource(
                city: $city,
                temperature: $data['temp'],
                condition: $data['condition'],
                humidity: $data['humidity'],
                windSpeed: $data['wind_speed'],
                lastUpdated: (new \DateTimeImmutable())->format('c'),
            );
        });
    }
}
```

## Read-Only Aggregated Resource

DTO combining data from multiple entities:

```php
<?php
// src/ApiResource/DashboardResource.php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\DashboardProvider;

#[ApiResource(
    shortName: 'Dashboard',
    operations: [
        new Get(
            uriTemplate: '/dashboard',
            provider: DashboardProvider::class,
        ),
    ],
)]
final class DashboardResource
{
    public function __construct(
        #[ApiProperty(identifier: true)]
        public readonly string $id = 'dashboard',

        public readonly int $totalOrders = 0,

        public readonly int $pendingOrders = 0,

        public readonly string $totalRevenue = '$0.00',

        public readonly int $totalCustomers = 0,

        public readonly int $lowStockProducts = 0,

        /** @var TopProductResource[] */
        public readonly array $topProducts = [],

        /** @var RecentOrderResource[] */
        public readonly array $recentOrders = [],
    ) {}
}
```

## Configuration Tips

### Directory Structure

```
src/
├── ApiResource/          # DTO resources
│   ├── ProductResource.php
│   ├── ProductInput.php
│   ├── ProductOutput.php
│   └── OrderResource.php
├── Entity/               # Doctrine entities (internal)
│   ├── Product.php
│   └── Order.php
├── State/
│   ├── ProductProvider.php
│   ├── ProductProcessor.php
│   └── OrderProvider.php
└── Repository/
    ├── ProductRepository.php
    └── OrderRepository.php
```

### API Platform Config

```yaml
# config/packages/api_platform.yaml
api_platform:
    defaults:
        stateless: true
        cache_headers:
            vary: ['Content-Type', 'Authorization', 'Origin']
        extra_properties:
            standard_put: true

    # Scan ApiResource directory for DTOs
    mapping:
        paths:
            - '%kernel.project_dir%/src/ApiResource'
```

## Best Practices

1. **Keep DTOs Immutable** - Use `readonly` properties and constructor initialization
2. **Validate Input DTOs** - Use Symfony Validator constraints
3. **Computed Properties** - Add formatted/computed fields in output DTOs
4. **Separate Concerns** - Input DTOs for validation, Output DTOs for presentation
5. **Cache External Data** - Cache external API responses in providers
6. **Test Providers/Processors** - Unit test transformation logic
7. **Document Properties** - Use `#[ApiProperty]` for OpenAPI documentation

## Testing

```php
<?php
// tests/ApiResource/ProductResourceTest.php

namespace App\Tests\ApiResource;

use ApiPlatform\Symfony\Bundle\Test\ApiTestCase;
use App\Entity\Product;

class ProductResourceTest extends ApiTestCase
{
    public function testGetCollection(): void
    {
        $response = static::createClient()->request('GET', '/api/products');

        $this->assertResponseIsSuccessful();
        $this->assertJsonContains([
            '@context' => '/api/contexts/Product',
            '@type' => 'hydra:Collection',
        ]);
    }

    public function testCreateProduct(): void
    {
        $response = static::createClient()->request('POST', '/api/products', [
            'json' => [
                'name' => 'New Product',
                'description' => 'A test product',
                'priceInCents' => 1999,
                'stock' => 10,
            ],
        ]);

        $this->assertResponseStatusCodeSame(201);
        $this->assertJsonContains([
            'name' => 'New Product',
            'formattedPrice' => '$19.99',
            'inStock' => true,
        ]);
    }

    public function testValidationErrors(): void
    {
        $response = static::createClient()->request('POST', '/api/products', [
            'json' => [
                'name' => 'AB', // Too short
                'priceInCents' => -100, // Negative
            ],
        ]);

        $this->assertResponseStatusCodeSame(422);
    }
}
```
