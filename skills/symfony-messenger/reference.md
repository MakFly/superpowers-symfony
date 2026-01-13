# Reference

# Symfony Messenger

## Installation

```bash
composer require symfony/messenger
```

## Message & Handler

### Message Class

```php
<?php
// src/Message/SendWelcomeEmail.php

namespace App\Message;

final readonly class SendWelcomeEmail
{
    public function __construct(
        public int $userId,
        public string $email,
    ) {}
}
```

### Message Handler

```php
<?php
// src/MessageHandler/SendWelcomeEmailHandler.php

namespace App\MessageHandler;

use App\Message\SendWelcomeEmail;
use App\Repository\UserRepository;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class SendWelcomeEmailHandler
{
    public function __construct(
        private MailerInterface $mailer,
        private UserRepository $users,
    ) {}

    public function __invoke(SendWelcomeEmail $message): void
    {
        $user = $this->users->find($message->userId);

        if (!$user) {
            // User was deleted, skip
            return;
        }

        $email = (new TemplatedEmail())
            ->to($message->email)
            ->subject('Welcome to our platform!')
            ->htmlTemplate('emails/welcome.html.twig')
            ->context(['user' => $user]);

        $this->mailer->send($email);
    }
}
```

## Configuration

```yaml
# config/packages/messenger.yaml
framework:
    messenger:
        # Serialization
        serializer:
            default_serializer: messenger.transport.symfony_serializer

        # Transports
        transports:
            async:
                dsn: '%env(MESSENGER_TRANSPORT_DSN)%'
                retry_strategy:
                    max_retries: 3
                    delay: 1000      # 1 second
                    multiplier: 2    # Exponential backoff
                    max_delay: 60000 # Max 1 minute

            high_priority:
                dsn: '%env(MESSENGER_TRANSPORT_DSN)%'
                options:
                    queue_name: high_priority

            failed:
                dsn: 'doctrine://default?queue_name=failed'

        # Failed transport
        failure_transport: failed

        # Routing
        routing:
            'App\Message\SendWelcomeEmail': async
            'App\Message\ProcessPayment': high_priority
            'App\Message\GenerateReport': async
```

## Transport DSNs

```bash
# RabbitMQ
MESSENGER_TRANSPORT_DSN=amqp://guest:guest@localhost:5672/%2f/messages

# Redis
MESSENGER_TRANSPORT_DSN=redis://localhost:6379/messages

# Doctrine (simple, good for dev)
MESSENGER_TRANSPORT_DSN=doctrine://default?queue_name=messages

# In-memory (testing)
MESSENGER_TRANSPORT_DSN=in-memory://
```

## Dispatching Messages

```php
<?php
// src/Service/UserService.php

namespace App\Service;

use App\Entity\User;
use App\Message\SendWelcomeEmail;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\MessageBusInterface;

class UserService
{
    public function __construct(
        private EntityManagerInterface $em,
        private MessageBusInterface $bus,
    ) {}

    public function register(string $email, string $password): User
    {
        $user = new User();
        $user->setEmail($email);
        $user->setPassword($password);

        $this->em->persist($user);
        $this->em->flush();

        // Dispatch async message
        $this->bus->dispatch(new SendWelcomeEmail(
            userId: $user->getId(),
            email: $user->getEmail(),
        ));

        return $user;
    }
}
```

## Envelope & Stamps

```php
use Symfony\Component\Messenger\Envelope;
use Symfony\Component\Messenger\Stamp\DelayStamp;
use Symfony\Component\Messenger\Stamp\TransportNamesStamp;
use Symfony\Component\Messenger\Stamp\DispatchAfterCurrentBusStamp;

// Delay execution by 10 minutes
$this->bus->dispatch(new Envelope($message, [
    new DelayStamp(600000), // milliseconds
]));

// Force specific transport
$this->bus->dispatch(new Envelope($message, [
    new TransportNamesStamp(['high_priority']),
]));

// Dispatch only after current handler completes
$this->bus->dispatch(new Envelope($message, [
    new DispatchAfterCurrentBusStamp(),
]));
```

## Worker Commands

```bash
# Start worker for async transport
bin/console messenger:consume async -vv

# Multiple transports
bin/console messenger:consume async high_priority -vv

# With limits
bin/console messenger:consume async --limit=10 --time-limit=3600

# Process failed messages
bin/console messenger:failed:show
bin/console messenger:failed:retry --all
bin/console messenger:failed:remove 123

# Stop workers gracefully (for deployments)
bin/console messenger:stop-workers
```

## Multiple Handlers

```php
#[AsMessageHandler]
class LoggingHandler
{
    public function __invoke(SendWelcomeEmail $message): void
    {
        $this->logger->info('Sending welcome email', [
            'userId' => $message->userId,
        ]);
    }
}

#[AsMessageHandler]
class EmailHandler
{
    public function __invoke(SendWelcomeEmail $message): void
    {
        // Actually send the email
    }
}
```

## Handler Priority

```php
#[AsMessageHandler(priority: 10)] // Higher = runs first
class FirstHandler { /* ... */ }

#[AsMessageHandler(priority: 0)] // Default priority
class SecondHandler { /* ... */ }
```

## Handling Exceptions

```php
use Symfony\Component\Messenger\Exception\UnrecoverableMessageHandlingException;
use Symfony\Component\Messenger\Exception\RecoverableMessageHandlingException;

#[AsMessageHandler]
class PaymentHandler
{
    public function __invoke(ProcessPayment $message): void
    {
        try {
            // Process payment
        } catch (InvalidCardException $e) {
            // Don't retry - permanent failure
            throw new UnrecoverableMessageHandlingException(
                'Invalid card',
                previous: $e
            );
        } catch (PaymentGatewayException $e) {
            // Do retry - temporary failure
            throw new RecoverableMessageHandlingException(
                'Gateway unavailable',
                previous: $e
            );
        }
    }
}
```

## Testing

```php
<?php

use App\Message\SendWelcomeEmail;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Zenstruck\Messenger\Test\InteractsWithMessenger;

class UserServiceTest extends KernelTestCase
{
    use InteractsWithMessenger;

    public function testDispatchesWelcomeEmail(): void
    {
        $service = self::getContainer()->get(UserService::class);

        $user = $service->register('test@example.com', 'password');

        // Assert message was dispatched
        $this->transport('async')
            ->queue()
            ->assertContains(SendWelcomeEmail::class, 1);

        // Or process synchronously in test
        $this->transport('async')->process();

        // Assert specific message
        $this->transport('async')
            ->queue()
            ->assertContains(SendWelcomeEmail::class, function ($message) use ($user) {
                return $message->userId === $user->getId();
            });
    }
}
```

## Best Practices

1. **Serialize IDs, not entities**: Pass identifiers, fetch fresh in handler
2. **Idempotency**: Handlers must be safe to retry
3. **Fail fast for permanent errors**: Use `UnrecoverableMessageHandlingException`
4. **Monitor failed queue**: Set up alerts for failed messages
5. **Use async by default**: Sync only for debugging
6. **Short handlers**: Keep processing time predictable
