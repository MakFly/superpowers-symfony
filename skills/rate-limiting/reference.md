# Reference

# Symfony Rate Limiting

## Installation

```bash
composer require symfony/rate-limiter
```

## Configuration

```yaml
# config/packages/rate_limiter.yaml
framework:
    rate_limiter:
        # Anonymous API requests
        anonymous_api:
            policy: sliding_window
            limit: 100
            interval: '1 hour'

        # Authenticated API requests
        authenticated_api:
            policy: sliding_window
            limit: 1000
            interval: '1 hour'

        # Login attempts
        login:
            policy: fixed_window
            limit: 5
            interval: '15 minutes'

        # Contact form
        contact_form:
            policy: fixed_window
            limit: 3
            interval: '1 hour'

        # Expensive operations
        export:
            policy: token_bucket
            limit: 10
            rate: { interval: '1 hour', amount: 5 }
```

## Rate Limiting Algorithms

### Fixed Window

Simple count within time window:

```yaml
login:
    policy: fixed_window
    limit: 5
    interval: '15 minutes'
```

### Sliding Window

Smoother rate limiting, prevents burst at window edges:

```yaml
api:
    policy: sliding_window
    limit: 100
    interval: '1 hour'
```

### Token Bucket

Allows bursts while maintaining average rate:

```yaml
export:
    policy: token_bucket
    limit: 10              # Bucket size (max burst)
    rate:
        interval: '1 hour' # Refill interval
        amount: 5          # Tokens added per interval
```

## Using Rate Limiters

### In Controllers

```php
<?php
// src/Controller/ApiController.php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;

class ApiController extends AbstractController
{
    public function __construct(
        private RateLimiterFactory $authenticatedApiLimiter,
        private RateLimiterFactory $anonymousApiLimiter,
    ) {}

    #[Route('/api/data', methods: ['GET'])]
    public function getData(Request $request): Response
    {
        // Choose limiter based on authentication
        $limiter = $this->getUser()
            ? $this->authenticatedApiLimiter->create($this->getUser()->getUserIdentifier())
            : $this->anonymousApiLimiter->create($request->getClientIp());

        $limit = $limiter->consume();

        if (!$limit->isAccepted()) {
            return new JsonResponse(
                ['error' => 'Too many requests. Please try again later.'],
                Response::HTTP_TOO_MANY_REQUESTS,
                [
                    'X-RateLimit-Remaining' => $limit->getRemainingTokens(),
                    'X-RateLimit-Retry-After' => $limit->getRetryAfter()->getTimestamp(),
                    'Retry-After' => $limit->getRetryAfter()->getTimestamp() - time(),
                ]
            );
        }

        // Add rate limit headers
        $response = new JsonResponse(['data' => '...']);
        $response->headers->set('X-RateLimit-Remaining', $limit->getRemainingTokens());
        $response->headers->set('X-RateLimit-Limit', $limit->getLimit());

        return $response;
    }
}
```

### In Services

```php
<?php
// src/Service/ExportService.php

namespace App\Service;

use Symfony\Component\RateLimiter\RateLimiterFactory;

class ExportService
{
    public function __construct(
        private RateLimiterFactory $exportLimiter,
    ) {}

    public function export(User $user): string
    {
        $limiter = $this->exportLimiter->create($user->getId());
        $limit = $limiter->consume();

        if (!$limit->isAccepted()) {
            throw new TooManyRequestsException(
                'Export limit reached. Please wait.',
                $limit->getRetryAfter()
            );
        }

        return $this->generateExport($user);
    }
}
```

### Login Rate Limiting

```php
<?php
// src/Security/LoginRateLimiter.php

namespace App\Security;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Security\Http\RateLimiter\AbstractRequestRateLimiter;

class LoginRateLimiter extends AbstractRequestRateLimiter
{
    public function __construct(
        private RateLimiterFactory $loginLimiter,
    ) {}

    protected function getLimiters(Request $request): array
    {
        // Rate limit by IP + username combination
        $username = $request->request->get('_username', '');
        $ip = $request->getClientIp();

        return [
            $this->loginLimiter->create($ip),
            $this->loginLimiter->create($username . $ip),
        ];
    }
}
```

Configure in security:

```yaml
# config/packages/security.yaml
security:
    firewalls:
        main:
            form_login:
                login_path: login
                check_path: login
            login_throttling:
                limiter: login
```

## Event Subscriber for Global Rate Limiting

```php
<?php
// src/EventSubscriber/RateLimitSubscriber.php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\RateLimiter\RateLimiterFactory;

class RateLimitSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private RateLimiterFactory $apiLimiter,
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onRequest', 10],
        ];
    }

    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();

        // Only rate limit API routes
        if (!str_starts_with($request->getPathInfo(), '/api/')) {
            return;
        }

        $limiter = $this->apiLimiter->create($request->getClientIp());
        $limit = $limiter->consume();

        if (!$limit->isAccepted()) {
            $event->setResponse(new JsonResponse(
                ['error' => 'Rate limit exceeded'],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => $limit->getRetryAfter()->getTimestamp() - time()]
            ));
        }
    }
}
```

## Reserve Tokens (Blocking)

Wait for tokens instead of rejecting:

```php
$limiter = $this->exportLimiter->create($user->getId());

// Will block until token is available (max 30 seconds)
$reservation = $limiter->reserve(1, 30);

// Wait for the reservation
$reservation->wait();

// Proceed with rate-limited operation
$this->generateExport($user);
```

## Testing

```php
<?php

use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\RateLimiter\Storage\InMemoryStorage;

class RateLimitTest extends TestCase
{
    public function testRateLimitEnforced(): void
    {
        // Create limiter with in-memory storage for testing
        $factory = new RateLimiterFactory([
            'id' => 'test',
            'policy' => 'fixed_window',
            'limit' => 3,
            'interval' => '1 minute',
        ], new InMemoryStorage());

        $limiter = $factory->create('user_123');

        // First 3 requests should succeed
        for ($i = 0; $i < 3; $i++) {
            $this->assertTrue($limiter->consume()->isAccepted());
        }

        // 4th request should fail
        $this->assertFalse($limiter->consume()->isAccepted());
    }
}
```

## Best Practices

1. **Different limits by role**: More for authenticated users
2. **Compound keys**: IP + user for login attempts
3. **Return headers**: X-RateLimit-Remaining, Retry-After
4. **Sliding window** for APIs - smoother limiting
5. **Token bucket** for burst tolerance
6. **Redis storage** for distributed systems


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- php bin/console messenger:consume --limit=1
- php bin/console messenger:failed:show
- ./vendor/bin/phpunit --filter=Messenger

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

