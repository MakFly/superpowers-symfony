# Reference

# Symfony Voters

Voters encapsulate authorization logic. Instead of checking permissions in controllers, delegate to voters via `isGranted()`.

## Creating a Voter

```php
<?php
// src/Security/Voter/PostVoter.php

namespace App\Security\Voter;

use App\Entity\Post;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

final class PostVoter extends Voter
{
    public const VIEW = 'POST_VIEW';
    public const EDIT = 'POST_EDIT';
    public const DELETE = 'POST_DELETE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE], true)
            && $subject instanceof Post;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        // Not logged in
        if (!$user instanceof User) {
            return $attribute === self::VIEW && $subject->isPublished();
        }

        /** @var Post $post */
        $post = $subject;

        return match ($attribute) {
            self::VIEW => $this->canView($post, $user),
            self::EDIT => $this->canEdit($post, $user),
            self::DELETE => $this->canDelete($post, $user),
            default => false,
        };
    }

    private function canView(Post $post, User $user): bool
    {
        // Published posts are viewable by all
        if ($post->isPublished()) {
            return true;
        }

        // Drafts only by author or admin
        return $this->canEdit($post, $user);
    }

    private function canEdit(Post $post, User $user): bool
    {
        return $post->getAuthor() === $user
            || in_array('ROLE_ADMIN', $user->getRoles(), true);
    }

    private function canDelete(Post $post, User $user): bool
    {
        // Only author can delete their own posts
        // Admins can delete any post
        return $post->getAuthor() === $user
            || in_array('ROLE_ADMIN', $user->getRoles(), true);
    }
}
```

## Using Voters

### In Controllers

```php
<?php
// src/Controller/PostController.php

use App\Entity\Post;
use App\Security\Voter\PostVoter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class PostController extends AbstractController
{
    #[Route('/posts/{id}', methods: ['GET'])]
    public function show(Post $post): Response
    {
        $this->denyAccessUnlessGranted(PostVoter::VIEW, $post);

        return $this->render('post/show.html.twig', ['post' => $post]);
    }

    #[Route('/posts/{id}/edit', methods: ['GET', 'POST'])]
    public function edit(Post $post, Request $request): Response
    {
        $this->denyAccessUnlessGranted(PostVoter::EDIT, $post);

        // Edit logic...
    }

    #[Route('/posts/{id}', methods: ['DELETE'])]
    public function delete(Post $post): Response
    {
        $this->denyAccessUnlessGranted(PostVoter::DELETE, $post);

        // Delete logic...
    }
}
```

### In Services

```php
<?php
// src/Service/PostService.php

use Symfony\Bundle\SecurityBundle\Security;

class PostService
{
    public function __construct(
        private Security $security,
    ) {}

    public function updatePost(Post $post, array $data): void
    {
        if (!$this->security->isGranted(PostVoter::EDIT, $post)) {
            throw new AccessDeniedException('Cannot edit this post');
        }

        // Update logic...
    }
}
```

### In Twig

```twig
{% if is_granted('POST_EDIT', post) %}
    <a href="{{ path('post_edit', {id: post.id}) }}">Edit</a>
{% endif %}

{% if is_granted('POST_DELETE', post) %}
    <button type="submit">Delete</button>
{% endif %}
```

## API Platform Integration

```php
<?php
// src/Entity/Post.php

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Delete;

#[ApiResource(
    operations: [
        new Get(
            security: "is_granted('POST_VIEW', object)",
        ),
        new Put(
            security: "is_granted('POST_EDIT', object)",
            securityMessage: "You can only edit your own posts.",
        ),
        new Delete(
            security: "is_granted('POST_DELETE', object)",
            securityMessage: "You can only delete your own posts.",
        ),
    ],
)]
class Post { /* ... */ }
```

## Complex Voting Logic

### With External Dependencies

```php
<?php
// src/Security/Voter/SubscriptionVoter.php

final class SubscriptionVoter extends Voter
{
    public const ACCESS_PREMIUM = 'ACCESS_PREMIUM';

    public function __construct(
        private SubscriptionService $subscriptions,
    ) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        return $attribute === self::ACCESS_PREMIUM;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (!$user instanceof User) {
            return false;
        }

        return $this->subscriptions->hasActiveSubscription($user);
    }
}
```

### Resource-less Voters

```php
// For checking access without a specific resource
$this->denyAccessUnlessGranted('ACCESS_PREMIUM');
```

### Multiple Attributes on Same Resource

```php
protected function supports(string $attribute, mixed $subject): bool
{
    return str_starts_with($attribute, 'POST_')
        && $subject instanceof Post;
}
```

## Testing Voters

### Unit Testing

```php
<?php
// tests/Unit/Security/Voter/PostVoterTest.php

use App\Entity\Post;
use App\Entity\User;
use App\Security\Voter\PostVoter;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;

class PostVoterTest extends TestCase
{
    private PostVoter $voter;

    protected function setUp(): void
    {
        $this->voter = new PostVoter();
    }

    public function testAuthorCanEditOwnPost(): void
    {
        $user = new User();
        $post = new Post();
        $post->setAuthor($user);

        $token = new UsernamePasswordToken($user, 'main', ['ROLE_USER']);

        $result = $this->voter->vote($token, $post, [PostVoter::EDIT]);

        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testNonAuthorCannotEditPost(): void
    {
        $author = new User();
        $otherUser = new User();
        $post = new Post();
        $post->setAuthor($author);

        $token = new UsernamePasswordToken($otherUser, 'main', ['ROLE_USER']);

        $result = $this->voter->vote($token, $post, [PostVoter::EDIT]);

        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testAdminCanEditAnyPost(): void
    {
        $author = new User();
        $admin = new User();
        $admin->setRoles(['ROLE_ADMIN']);

        $post = new Post();
        $post->setAuthor($author);

        $token = new UsernamePasswordToken($admin, 'main', ['ROLE_ADMIN']);

        $result = $this->voter->vote($token, $post, [PostVoter::EDIT]);

        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }
}
```

### Functional Testing

```php
public function testOnlyAuthorCanEditPost(): void
{
    $author = UserFactory::createOne();
    $otherUser = UserFactory::createOne();
    $post = PostFactory::createOne(['author' => $author]);

    // Author can edit
    $this->client->loginUser($author->object());
    $this->client->request('PUT', '/api/posts/' . $post->getId());
    $this->assertResponseIsSuccessful();

    // Other user cannot
    $this->client->loginUser($otherUser->object());
    $this->client->request('PUT', '/api/posts/' . $post->getId());
    $this->assertResponseStatusCodeSame(403);
}
```

## Best Practices

1. **One voter per entity** or per domain concept
2. **Use constants** for attribute names
3. **Keep voters pure**: No side effects, only return bool
4. **Test voters** in isolation with unit tests
5. **Combine with roles**: Voters can check `ROLE_*` internally
6. **Use securityMessage** in API Platform for clear errors
