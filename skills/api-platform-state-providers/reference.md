# Reference

# API Platform State Providers & Processors

State Providers and Processors are the core of API Platform's architecture. They allow you to completely decouple your API from Doctrine entities, enabling custom data sources, transformations, and business logic.

## Concepts

- **State Provider**: Retrieves data for GET operations (single item or collection)
- **State Processor**: Handles data persistence for POST, PUT, PATCH, DELETE operations
- **Decoupling**: Separate API representation from storage mechanism

## State Providers

### Basic Provider

```php
<?php
// src/State/ProductProvider.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Product;
use App\Repository\ProductRepository;

/**
 * @implements ProviderInterface<Product>
 */
final class ProductProvider implements ProviderInterface
{
    public function __construct(
        private ProductRepository $repository,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        // Single item (Get operation)
        if (isset($uriVariables['id'])) {
            return $this->repository->find($uriVariables['id']);
        }

        // Collection (GetCollection operation)
        return $this->repository->findAll();
    }
}
```

### Using the Provider

```php
<?php
// src/Entity/Product.php

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\State\ProductProvider;

#[ApiResource(
    operations: [
        new Get(provider: ProductProvider::class),
        new GetCollection(provider: ProductProvider::class),
    ],
)]
class Product
{
    // ...
}
```

### Decorating Default Provider

Extend the default Doctrine provider while adding custom logic:

```php
<?php
// src/State/EnhancedProductProvider.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Product;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * @implements ProviderInterface<Product>
 */
final class EnhancedProductProvider implements ProviderInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.item_provider')]
        private ProviderInterface $itemProvider,
        #[Autowire(service: 'api_platform.doctrine.orm.state.collection_provider')]
        private ProviderInterface $collectionProvider,
        private LoggerInterface $logger,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        // Use appropriate provider based on operation
        $provider = isset($uriVariables['id'])
            ? $this->itemProvider
            : $this->collectionProvider;

        $result = $provider->provide($operation, $uriVariables, $context);

        // Add custom logic
        $this->logger->info('Product accessed', [
            'operation' => $operation->getName(),
            'uriVariables' => $uriVariables,
        ]);

        return $result;
    }
}
```

### Provider with DTO Transformation

```php
<?php
// src/State/ProductOutputProvider.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use ApiPlatform\State\Pagination\TraversablePaginator;
use App\Dto\ProductOutput;
use App\Entity\Product;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * @implements ProviderInterface<ProductOutput>
 */
final class ProductOutputProvider implements ProviderInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.item_provider')]
        private ProviderInterface $itemProvider,
        #[Autowire(service: 'api_platform.doctrine.orm.state.collection_provider')]
        private ProviderInterface $collectionProvider,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|iterable|null
    {
        if (isset($uriVariables['id'])) {
            $product = $this->itemProvider->provide($operation, $uriVariables, $context);
            return $product ? $this->transform($product) : null;
        }

        $paginator = $this->collectionProvider->provide($operation, $uriVariables, $context);

        if ($paginator instanceof TraversablePaginator) {
            $items = [];
            foreach ($paginator as $product) {
                $items[] = $this->transform($product);
            }

            return new TraversablePaginator(
                new \ArrayIterator($items),
                $paginator->getCurrentPage(),
                $paginator->getItemsPerPage(),
                $paginator->getTotalItems(),
            );
        }

        return array_map(fn($p) => $this->transform($p), iterator_to_array($paginator));
    }

    private function transform(Product $product): ProductOutput
    {
        return new ProductOutput(
            id: $product->getId(),
            name: $product->getName(),
            slug: $product->getSlug(),
            formattedPrice: sprintf('$%.2f', $product->getPriceInCents() / 100),
            isAvailable: $product->getStock() > 0,
            createdAt: $product->getCreatedAt()->format('c'),
        );
    }
}
```

### External API Provider

Fetch data from an external service:

```php
<?php
// src/State/ExternalProductProvider.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Dto\ExternalProduct;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * @implements ProviderInterface<ExternalProduct>
 */
final class ExternalProductProvider implements ProviderInterface
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private string $apiBaseUrl,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if (isset($uriVariables['id'])) {
            $response = $this->httpClient->request('GET', "{$this->apiBaseUrl}/products/{$uriVariables['id']}");
            $data = $response->toArray();

            return new ExternalProduct(
                id: $data['id'],
                name: $data['name'],
                price: $data['price'],
            );
        }

        $response = $this->httpClient->request('GET', "{$this->apiBaseUrl}/products");
        $items = $response->toArray();

        return array_map(
            fn($data) => new ExternalProduct($data['id'], $data['name'], $data['price']),
            $items
        );
    }
}
```

## State Processors

### Basic Processor

```php
<?php
// src/State/ProductProcessor.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\DeleteOperationInterface;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Product;
use Doctrine\ORM\EntityManagerInterface;

/**
 * @implements ProcessorInterface<Product, Product|null>
 */
final class ProductProcessor implements ProcessorInterface
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): ?Product
    {
        if ($operation instanceof DeleteOperationInterface) {
            $this->em->remove($data);
            $this->em->flush();
            return null;
        }

        $this->em->persist($data);
        $this->em->flush();

        return $data;
    }
}
```

### Processor with Input DTO

```php
<?php
// src/Dto/CreateProductInput.php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class CreateProductInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(min: 3, max: 255)]
        public readonly string $name,

        #[Assert\NotBlank]
        public readonly string $description,

        #[Assert\Positive]
        public readonly int $priceInCents,

        #[Assert\PositiveOrZero]
        public readonly int $stock = 0,

        /** @var string[] */
        #[Assert\All([new Assert\NotBlank()])]
        public readonly array $tags = [],
    ) {}
}
```

```php
<?php
// src/State/CreateProductProcessor.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Dto\CreateProductInput;
use App\Entity\Product;
use App\Service\SlugGenerator;
use Doctrine\ORM\EntityManagerInterface;

/**
 * @implements ProcessorInterface<CreateProductInput, Product>
 */
final class CreateProductProcessor implements ProcessorInterface
{
    public function __construct(
        private EntityManagerInterface $em,
        private SlugGenerator $slugGenerator,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): Product
    {
        /** @var CreateProductInput $data */
        $product = new Product();
        $product->setName($data->name);
        $product->setSlug($this->slugGenerator->generate($data->name));
        $product->setDescription($data->description);
        $product->setPriceInCents($data->priceInCents);
        $product->setStock($data->stock);

        foreach ($data->tags as $tagName) {
            $product->addTag($tagName);
        }

        $this->em->persist($product);
        $this->em->flush();

        return $product;
    }
}
```

### Decorating Default Processor

```php
<?php
// src/State/AuditedProductProcessor.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Product;
use App\Service\AuditLogger;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * @implements ProcessorInterface<Product, Product|null>
 */
final class AuditedProductProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        #[Autowire(service: 'api_platform.doctrine.orm.state.remove_processor')]
        private ProcessorInterface $removeProcessor,
        private AuditLogger $auditLogger,
        private Security $security,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): ?Product
    {
        $user = $this->security->getUser();
        $operationName = $operation->getName() ?? $operation::class;

        // Log before processing
        $this->auditLogger->log(
            action: $operationName,
            entity: Product::class,
            entityId: $data->getId(),
            user: $user?->getUserIdentifier(),
            data: ['name' => $data->getName()],
        );

        // Use appropriate processor
        if (str_contains(strtolower($operationName), 'delete')) {
            return $this->removeProcessor->process($data, $operation, $uriVariables, $context);
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
```

### Processor with Event Dispatching

```php
<?php
// src/State/EventDispatchingProcessor.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Product;
use App\Event\ProductCreatedEvent;
use App\Event\ProductUpdatedEvent;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

/**
 * @implements ProcessorInterface<Product, Product>
 */
final class EventDispatchingProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private EventDispatcherInterface $dispatcher,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): Product
    {
        $isNew = $operation instanceof Post;

        /** @var Product $result */
        $result = $this->persistProcessor->process($data, $operation, $uriVariables, $context);

        // Dispatch appropriate event
        if ($isNew) {
            $this->dispatcher->dispatch(new ProductCreatedEvent($result));
        } else {
            $this->dispatcher->dispatch(new ProductUpdatedEvent($result));
        }

        return $result;
    }
}
```

## Complete Resource Configuration

```php
<?php
// src/Entity/Product.php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Dto\CreateProductInput;
use App\Dto\UpdateProductInput;
use App\Dto\ProductOutput;
use App\State\CreateProductProcessor;
use App\State\UpdateProductProcessor;
use App\State\ProductProcessor;
use App\State\ProductOutputProvider;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ApiResource(
    operations: [
        new GetCollection(
            output: ProductOutput::class,
            provider: ProductOutputProvider::class,
        ),
        new Get(
            output: ProductOutput::class,
            provider: ProductOutputProvider::class,
        ),
        new Post(
            input: CreateProductInput::class,
            output: ProductOutput::class,
            processor: CreateProductProcessor::class,
            provider: ProductOutputProvider::class,
        ),
        new Put(
            input: UpdateProductInput::class,
            output: ProductOutput::class,
            processor: UpdateProductProcessor::class,
            provider: ProductOutputProvider::class,
        ),
        new Patch(
            input: UpdateProductInput::class,
            output: ProductOutput::class,
            processor: UpdateProductProcessor::class,
            provider: ProductOutputProvider::class,
        ),
        new Delete(
            processor: ProductProcessor::class,
        ),
    ],
)]
class Product
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $name;

    #[ORM\Column(length: 255, unique: true)]
    private string $slug;

    #[ORM\Column(type: 'text')]
    private string $description;

    #[ORM\Column]
    private int $priceInCents;

    #[ORM\Column]
    private int $stock = 0;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    // Getters and setters...
}
```

## Best Practices

1. **Single Responsibility** - Each provider/processor handles one concern
2. **Decorate Default Services** - Extend built-in functionality instead of replacing
3. **Use DTOs** - Separate API representation from entities
4. **Type Safety** - Use generics in `@implements` annotations
5. **Autowire Services** - Use `#[Autowire]` for API Platform services
6. **Event-Driven** - Dispatch events for side effects
7. **Audit Logging** - Track all mutations through processors
8. **Validation** - Validate input DTOs with Symfony Validator

## Testing

```php
<?php
// tests/State/ProductOutputProviderTest.php

namespace App\Tests\State;

use ApiPlatform\Metadata\Get;
use App\Entity\Product;
use App\State\ProductOutputProvider;
use PHPUnit\Framework\TestCase;

class ProductOutputProviderTest extends TestCase
{
    public function testTransformsProductToOutput(): void
    {
        $product = new Product();
        $product->setName('Test Product');
        $product->setPriceInCents(1999);

        $itemProvider = $this->createMock(ProviderInterface::class);
        $itemProvider->method('provide')->willReturn($product);

        $provider = new ProductOutputProvider($itemProvider, /* ... */);

        $result = $provider->provide(new Get(), ['id' => 1]);

        $this->assertInstanceOf(ProductOutput::class, $result);
        $this->assertEquals('Test Product', $result->name);
        $this->assertEquals('$19.99', $result->formattedPrice);
    }
}
```
