# Reference

# API Platform Filters

## Built-in Filters

### Search Filter

```php
<?php
// src/Entity/Product.php

use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;

#[ApiResource]
#[ApiFilter(SearchFilter::class, properties: [
    'name' => 'partial',        // LIKE %value%
    'description' => 'partial',
    'sku' => 'exact',           // = value
    'category.name' => 'exact', // Related entity
])]
class Product
{
    // ...
}
```

Search strategies:
- `exact`: Exact match (`=`)
- `partial`: Contains (`LIKE %value%`)
- `start`: Starts with (`LIKE value%`)
- `end`: Ends with (`LIKE %value`)
- `word_start`: Word starts with

Usage:
```http
GET /api/products?name=phone
GET /api/products?category.name=electronics
```

### Date Filter

```php
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;

#[ApiFilter(DateFilter::class, properties: ['createdAt', 'updatedAt'])]
class Product
{
    #[ORM\Column]
    private \DateTimeImmutable $createdAt;
}
```

Usage:
```http
GET /api/products?createdAt[after]=2024-01-01
GET /api/products?createdAt[before]=2024-12-31
GET /api/products?createdAt[strictly_after]=2024-01-01
GET /api/products?createdAt[strictly_before]=2024-12-31
```

### Range Filter

```php
use ApiPlatform\Doctrine\Orm\Filter\RangeFilter;

#[ApiFilter(RangeFilter::class, properties: ['price', 'stock'])]
class Product
{
    #[ORM\Column]
    private int $price;

    #[ORM\Column]
    private int $stock;
}
```

Usage:
```http
GET /api/products?price[gte]=1000&price[lte]=5000
GET /api/products?stock[gt]=0
```

Operators: `lt`, `lte`, `gt`, `gte`, `between`

### Boolean Filter

```php
use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;

#[ApiFilter(BooleanFilter::class, properties: ['isActive', 'isFeatured'])]
class Product
{
    #[ORM\Column]
    private bool $isActive = true;
}
```

Usage:
```http
GET /api/products?isActive=true
GET /api/products?isFeatured=1
```

### Order Filter

```php
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;

#[ApiFilter(OrderFilter::class, properties: [
    'name' => 'ASC',
    'price',
    'createdAt',
])]
class Product
{
    // ...
}
```

Usage:
```http
GET /api/products?order[price]=desc
GET /api/products?order[createdAt]=asc&order[name]=asc
```

### Exists Filter

```php
use ApiPlatform\Doctrine\Orm\Filter\ExistsFilter;

#[ApiFilter(ExistsFilter::class, properties: ['deletedAt', 'description'])]
class Product
{
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;
}
```

Usage:
```http
GET /api/products?exists[deletedAt]=false  # Not deleted
GET /api/products?exists[description]=true  # Has description
```

## Custom Filters

### Simple Custom Filter

```php
<?php
// src/Filter/ActiveProductFilter.php

namespace App\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

final class ActiveProductFilter extends AbstractFilter
{
    protected function filterProperty(
        string $property,
        mixed $value,
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = []
    ): void {
        if ($property !== 'active') {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $paramName = $queryNameGenerator->generateParameterName('active');

        $queryBuilder
            ->andWhere(sprintf('%s.isActive = :%s', $alias, $paramName))
            ->andWhere(sprintf('%s.deletedAt IS NULL', $alias))
            ->setParameter($paramName, filter_var($value, FILTER_VALIDATE_BOOLEAN));
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'active' => [
                'property' => 'active',
                'type' => 'bool',
                'required' => false,
                'description' => 'Filter active products (not deleted)',
                'openapi' => [
                    'example' => 'true',
                ],
            ],
        ];
    }
}
```

Usage:

```php
#[ApiResource]
#[ApiFilter(ActiveProductFilter::class)]
class Product { /* ... */ }
```

### Filter with Multiple Properties

```php
<?php
// src/Filter/PriceRangeFilter.php

namespace App\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

final class PriceRangeFilter extends AbstractFilter
{
    protected function filterProperty(
        string $property,
        mixed $value,
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = []
    ): void {
        if ($property !== 'priceRange') {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];

        $ranges = [
            'budget' => [0, 5000],
            'mid' => [5000, 20000],
            'premium' => [20000, 50000],
            'luxury' => [50000, null],
        ];

        if (!isset($ranges[$value])) {
            return;
        }

        [$min, $max] = $ranges[$value];

        $minParam = $queryNameGenerator->generateParameterName('minPrice');
        $queryBuilder
            ->andWhere(sprintf('%s.price >= :%s', $alias, $minParam))
            ->setParameter($minParam, $min);

        if ($max !== null) {
            $maxParam = $queryNameGenerator->generateParameterName('maxPrice');
            $queryBuilder
                ->andWhere(sprintf('%s.price < :%s', $alias, $maxParam))
                ->setParameter($maxParam, $max);
        }
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'priceRange' => [
                'property' => 'priceRange',
                'type' => 'string',
                'required' => false,
                'description' => 'Filter by price range',
                'openapi' => [
                    'enum' => ['budget', 'mid', 'premium', 'luxury'],
                ],
            ],
        ];
    }
}
```

## Filter Groups

Apply multiple filters per operation:

```php
#[ApiResource(
    operations: [
        new GetCollection(
            filters: [
                SearchFilter::class,
                OrderFilter::class,
                ActiveProductFilter::class,
            ]
        ),
    ]
)]
class Product { /* ... */ }
```

## Database Indexing

Always index filtered columns:

```php
#[ORM\Entity]
#[ORM\Index(columns: ['name'], name: 'idx_product_name')]
#[ORM\Index(columns: ['price'], name: 'idx_product_price')]
#[ORM\Index(columns: ['created_at'], name: 'idx_product_created')]
#[ORM\Index(columns: ['is_active', 'deleted_at'], name: 'idx_product_active')]
class Product
{
    // ...
}
```

## Best Practices

1. **Index filtered columns** for performance
2. **Limit searchable properties** - don't expose everything
3. **Use exact for IDs** and foreign keys
4. **Use partial sparingly** - it prevents index usage
5. **Document filters** with OpenAPI descriptions
6. **Validate filter values** in custom filters


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

