# Reference

# API Platform Resources

## Installation

```bash
composer require api-platform/core
```

## Basic Resource

```php
<?php
// src/Entity/Product.php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Post(),
        new Get(),
        new Put(),
        new Patch(),
        new Delete(),
    ],
    paginationItemsPerPage: 20,
)]
class Product
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 3, max: 255)]
    private string $name;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column]
    #[Assert\Positive]
    private int $price; // In cents

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    // Getters and setters...
}
```

## Operations Configuration

### Customize Operations

```php
#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/products',
            paginationEnabled: true,
            paginationItemsPerPage: 30,
        ),
        new Post(
            uriTemplate: '/products',
            security: "is_granted('ROLE_ADMIN')",
            validationContext: ['groups' => ['create']],
        ),
        new Get(
            uriTemplate: '/products/{id}',
        ),
        new Put(
            uriTemplate: '/products/{id}',
            security: "is_granted('ROLE_ADMIN')",
        ),
        new Patch(
            uriTemplate: '/products/{id}',
            security: "is_granted('ROLE_ADMIN')",
        ),
        new Delete(
            uriTemplate: '/products/{id}',
            security: "is_granted('ROLE_ADMIN')",
        ),
    ],
)]
class Product { /* ... */ }
```

### Custom Operations

```php
use ApiPlatform\Metadata\Post;
use App\Controller\PublishProductController;

#[ApiResource(
    operations: [
        // Standard CRUD...
        new Post(
            uriTemplate: '/products/{id}/publish',
            controller: PublishProductController::class,
            name: 'publish_product',
            openapiContext: [
                'summary' => 'Publish a product',
                'description' => 'Makes the product visible to customers',
            ],
        ),
    ],
)]
class Product { /* ... */ }
```

```php
<?php
// src/Controller/PublishProductController.php

namespace App\Controller;

use App\Entity\Product;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpKernel\Attribute\AsController;

#[AsController]
class PublishProductController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    public function __invoke(Product $product): Product
    {
        $product->setPublished(true);
        $product->setPublishedAt(new \DateTimeImmutable());

        $this->em->flush();

        return $product;
    }
}
```

## Pagination

### Default Pagination

```php
#[ApiResource(
    paginationEnabled: true,
    paginationItemsPerPage: 20,
    paginationMaximumItemsPerPage: 100,
    paginationClientItemsPerPage: true, // Allow client to set itemsPerPage
)]
class Product { /* ... */ }
```

### Client Pagination

```http
GET /api/products?page=2
GET /api/products?itemsPerPage=50
```

Response includes pagination metadata:

```json
{
    "@context": "/api/contexts/Product",
    "@id": "/api/products",
    "@type": "hydra:Collection",
    "hydra:totalItems": 150,
    "hydra:member": [...],
    "hydra:view": {
        "@id": "/api/products?page=2",
        "hydra:first": "/api/products?page=1",
        "hydra:last": "/api/products?page=8",
        "hydra:previous": "/api/products?page=1",
        "hydra:next": "/api/products?page=3"
    }
}
```

### Cursor Pagination

```php
#[ApiResource(
    paginationEnabled: true,
    paginationPartial: true,
    paginationViaCursor: [
        ['field' => 'createdAt', 'direction' => 'DESC'],
        ['field' => 'id', 'direction' => 'DESC'],
    ],
)]
class Product { /* ... */ }
```

## Output DTOs

Separate your API representation from your entities:

```php
<?php
// src/Dto/ProductOutput.php

namespace App\Dto;

final class ProductOutput
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly ?string $description,
        public readonly string $formattedPrice, // "€19.99"
        public readonly string $createdAt,
    ) {}
}
```

```php
<?php
// src/State/ProductOutputProvider.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Dto\ProductOutput;
use App\Entity\Product;

class ProductOutputProvider implements ProviderInterface
{
    public function __construct(
        private ProviderInterface $decorated,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $product = $this->decorated->provide($operation, $uriVariables, $context);

        if ($product instanceof Product) {
            return $this->transform($product);
        }

        // Collection
        return array_map(fn($p) => $this->transform($p), $product);
    }

    private function transform(Product $product): ProductOutput
    {
        return new ProductOutput(
            id: $product->getId(),
            name: $product->getName(),
            description: $product->getDescription(),
            formattedPrice: sprintf('€%.2f', $product->getPrice() / 100),
            createdAt: $product->getCreatedAt()->format('c'),
        );
    }
}
```

```php
#[ApiResource(
    operations: [
        new Get(
            output: ProductOutput::class,
            provider: ProductOutputProvider::class,
        ),
        new GetCollection(
            output: ProductOutput::class,
            provider: ProductOutputProvider::class,
        ),
    ],
)]
class Product { /* ... */ }
```

## Input DTOs

```php
<?php
// src/Dto/CreateProductInput.php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class CreateProductInput
{
    #[Assert\NotBlank]
    #[Assert\Length(min: 3, max: 255)]
    public string $name;

    public ?string $description = null;

    #[Assert\Positive]
    public int $priceInCents;
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
use Doctrine\ORM\EntityManagerInterface;

class CreateProductProcessor implements ProcessorInterface
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): Product
    {
        /** @var CreateProductInput $data */
        $product = new Product();
        $product->setName($data->name);
        $product->setDescription($data->description);
        $product->setPrice($data->priceInCents);

        $this->em->persist($product);
        $this->em->flush();

        return $product;
    }
}
```

```php
#[ApiResource(
    operations: [
        new Post(
            input: CreateProductInput::class,
            processor: CreateProductProcessor::class,
        ),
    ],
)]
class Product { /* ... */ }
```

## Best Practices

1. **Use DTOs** for complex transformations
2. **Validation** on entity or input DTOs
3. **Security** at operation level
4. **Pagination** always enabled for collections
5. **Meaningful URIs** using uriTemplate
