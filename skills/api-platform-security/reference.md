# Reference

# API Platform Security

## Operation-Level Security

### Basic Security Expressions

```php
<?php
// src/Entity/Post.php

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;

#[ApiResource(
    operations: [
        // Public read access
        new GetCollection(),
        new Get(),

        // Authenticated users can create
        new Post(
            security: "is_granted('ROLE_USER')",
            securityMessage: 'You must be logged in to create posts.',
        ),

        // Only owner or admin can update
        new Put(
            security: "is_granted('ROLE_ADMIN') or object.getAuthor() == user",
            securityMessage: 'You can only edit your own posts.',
        ),
        new Patch(
            security: "is_granted('ROLE_ADMIN') or object.getAuthor() == user",
        ),

        // Only admin can delete
        new Delete(
            security: "is_granted('ROLE_ADMIN')",
            securityMessage: 'Only administrators can delete posts.',
        ),
    ],
)]
class Post
{
    // ...
}
```

### Using Voters

```php
#[ApiResource(
    operations: [
        new Get(
            security: "is_granted('POST_VIEW', object)",
        ),
        new Put(
            security: "is_granted('POST_EDIT', object)",
            securityMessage: 'You cannot edit this post.',
        ),
        new Delete(
            security: "is_granted('POST_DELETE', object)",
        ),
    ],
)]
class Post { /* ... */ }
```

### Security Post-Denormalization

Check security after input is processed:

```php
#[ApiResource(
    operations: [
        new Post(
            // Check before processing
            security: "is_granted('ROLE_USER')",
            // Check after input is bound to object
            securityPostDenormalize: "is_granted('POST_CREATE', object)",
            securityPostDenormalizeMessage: 'You cannot create this type of post.',
        ),
    ],
)]
class Post { /* ... */ }
```

Useful when security depends on the input data itself.

## Security Expressions Reference

```php
// User roles
security: "is_granted('ROLE_USER')"
security: "is_granted('ROLE_ADMIN')"

// Current user
security: "user == object.getOwner()"
security: "object.getAuthor().getId() == user.getId()"

// Object properties
security: "object.isPublished() or object.getAuthor() == user"
security: "object.getStatus() == 'draft' and object.getAuthor() == user"

// Voters
security: "is_granted('EDIT', object)"
security: "is_granted('VIEW', object)"

// Combined conditions
security: "is_granted('ROLE_ADMIN') or (is_granted('ROLE_USER') and object.getAuthor() == user)"

// Request data (for POST/PUT)
security: "is_granted('ROLE_ADMIN') or request.get('category') != 'restricted'"
```

## Collection Security

### Filter Collections by User

```php
<?php
// src/Doctrine/CurrentUserExtension.php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Post;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\SecurityBundle\Security;

final class CurrentUserExtension implements QueryCollectionExtensionInterface
{
    public function __construct(
        private Security $security,
    ) {}

    public function applyToCollection(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = []
    ): void {
        // Only filter Post resources
        if ($resourceClass !== Post::class) {
            return;
        }

        // Admins see everything
        if ($this->security->isGranted('ROLE_ADMIN')) {
            return;
        }

        $user = $this->security->getUser();
        $alias = $queryBuilder->getRootAliases()[0];

        if ($user) {
            // Authenticated: see published + own drafts
            $queryBuilder
                ->andWhere(sprintf(
                    '%s.isPublished = true OR %s.author = :currentUser',
                    $alias,
                    $alias
                ))
                ->setParameter('currentUser', $user);
        } else {
            // Anonymous: only published
            $queryBuilder
                ->andWhere(sprintf('%s.isPublished = true', $alias));
        }
    }
}
```

### Filter Item Queries

```php
use ApiPlatform\Doctrine\Orm\Extension\QueryItemExtensionInterface;

final class CurrentUserExtension implements
    QueryCollectionExtensionInterface,
    QueryItemExtensionInterface
{
    public function applyToItem(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        array $identifiers,
        ?Operation $operation = null,
        array $context = []
    ): void {
        // Same logic as collection
        $this->addWhere($queryBuilder, $resourceClass);
    }

    public function applyToCollection(/* ... */): void
    {
        $this->addWhere($queryBuilder, $resourceClass);
    }

    private function addWhere(QueryBuilder $queryBuilder, string $resourceClass): void
    {
        // Shared filtering logic
    }
}
```

## Property-Level Security

Hide fields based on permissions:

```php
<?php
// src/Entity/User.php

use Symfony\Component\Serializer\Attribute\Groups;

class User
{
    #[Groups(['user:read', 'admin:read'])]
    private ?int $id = null;

    #[Groups(['user:read', 'admin:read'])]
    private string $name;

    // Only visible to admins and the user themselves
    #[Groups(['user:owner', 'admin:read'])]
    private string $email;

    // Only visible to admins
    #[Groups(['admin:read'])]
    private array $roles;

    // Never exposed
    private string $password;
}
```

With context builder for dynamic groups:

```php
<?php
// src/Serializer/UserContextBuilder.php

final class UserContextBuilder implements SerializerContextBuilderInterface
{
    public function createFromRequest(Request $request, bool $normalization, ?array $extractedAttributes = null): array
    {
        $context = $this->decorated->createFromRequest($request, $normalization, $extractedAttributes);

        if ($this->security->isGranted('ROLE_ADMIN')) {
            $context['groups'][] = 'admin:read';
        }

        // Check if viewing own profile
        $resourceId = $request->attributes->get('id');
        $currentUser = $this->security->getUser();
        if ($currentUser && $currentUser->getId() == $resourceId) {
            $context['groups'][] = 'user:owner';
        }

        return $context;
    }
}
```

## JWT Authentication

```yaml
# config/packages/security.yaml
security:
    firewalls:
        api:
            pattern: ^/api
            stateless: true
            jwt: ~

    access_control:
        - { path: ^/api/login, roles: PUBLIC_ACCESS }
        - { path: ^/api/docs, roles: PUBLIC_ACCESS }
        - { path: ^/api, roles: IS_AUTHENTICATED_FULLY }
```

## Rate Limiting

```php
use Symfony\Component\RateLimiter\Attribute\RateLimit;

#[ApiResource(
    operations: [
        new Post(
            security: "is_granted('ROLE_USER')",
        ),
    ],
)]
#[RateLimit(limit: 10, interval: '1 minute')]
class Comment { /* ... */ }
```

## Best Practices

1. **Use voters** for complex authorization logic
2. **Filter collections** with Doctrine extensions
3. **Fail secure** - deny by default
4. **Clear error messages** - help users understand
5. **Test security** - verify both grant and deny cases
6. **Audit sensitive operations** - log access attempts


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

