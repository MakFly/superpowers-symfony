# Reference

# Functional Tests for Symfony

Functional tests verify that your application works correctly from HTTP request to response.

## Setup

```bash
composer require --dev symfony/test-pack
composer require --dev zenstruck/foundry
```

## WebTestCase Basics

```php
<?php
// tests/Functional/Controller/HomeControllerTest.php

namespace App\Tests\Functional\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class HomeControllerTest extends WebTestCase
{
    public function testHomePageLoads(): void
    {
        $client = static::createClient();

        $crawler = $client->request('GET', '/');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorTextContains('h1', 'Welcome');
    }
}
```

## HTTP Client Methods

### Request Methods

```php
// GET request
$client->request('GET', '/users');

// POST with JSON
$client->request('POST', '/api/users', [], [], [
    'CONTENT_TYPE' => 'application/json',
], json_encode(['email' => 'test@example.com']));

// PUT
$client->request('PUT', '/api/users/1', [], [], [
    'CONTENT_TYPE' => 'application/json',
], json_encode(['name' => 'Updated']));

// DELETE
$client->request('DELETE', '/api/users/1');

// With headers
$client->request('GET', '/api/users', [], [], [
    'HTTP_AUTHORIZATION' => 'Bearer token123',
    'HTTP_ACCEPT' => 'application/json',
]);
```

### Response Assertions

```php
// Status codes
$this->assertResponseIsSuccessful();        // 2xx
$this->assertResponseStatusCodeSame(201);
$this->assertResponseRedirects('/login');

// Content
$this->assertSelectorExists('form.login');
$this->assertSelectorTextContains('h1', 'Welcome');
$this->assertSelectorCount(5, '.user-card');

// JSON
$response = json_decode($client->getResponse()->getContent(), true);
$this->assertArrayHasKey('id', $response);

// Headers
$this->assertResponseHeaderSame('Content-Type', 'application/json');
```

## Authentication in Tests

### loginUser()

```php
use App\Tests\Factory\UserFactory;

public function testProtectedEndpoint(): void
{
    $client = static::createClient();
    $user = UserFactory::createOne()->object();

    $client->loginUser($user);

    $client->request('GET', '/dashboard');
    $this->assertResponseIsSuccessful();
}
```

### With Different Roles

```php
public function testAdminOnlyEndpoint(): void
{
    $client = static::createClient();

    // Regular user - should fail
    $user = UserFactory::createOne(['roles' => ['ROLE_USER']])->object();
    $client->loginUser($user);
    $client->request('GET', '/admin');
    $this->assertResponseStatusCodeSame(403);

    // Admin user - should succeed
    $admin = UserFactory::createOne(['roles' => ['ROLE_ADMIN']])->object();
    $client->loginUser($admin);
    $client->request('GET', '/admin');
    $this->assertResponseIsSuccessful();
}
```

## Form Testing

```php
public function testSubmitsContactForm(): void
{
    $client = static::createClient();
    $crawler = $client->request('GET', '/contact');

    // Select form and fill fields
    $form = $crawler->selectButton('Send')->form([
        'contact[name]' => 'John Doe',
        'contact[email]' => 'john@example.com',
        'contact[message]' => 'Hello there!',
    ]);

    $client->submit($form);

    $this->assertResponseRedirects('/contact/thanks');
}

public function testFormValidation(): void
{
    $client = static::createClient();
    $crawler = $client->request('GET', '/contact');

    $form = $crawler->selectButton('Send')->form([
        'contact[email]' => 'invalid-email',
    ]);

    $crawler = $client->submit($form);

    $this->assertSelectorExists('.invalid-feedback');
}
```

## Testing with Crawler

```php
public function testPageContent(): void
{
    $client = static::createClient();
    $crawler = $client->request('GET', '/users');

    // Count elements
    $this->assertCount(10, $crawler->filter('.user-card'));

    // Get text
    $title = $crawler->filter('h1')->text();
    $this->assertEquals('User List', $title);

    // Get attribute
    $link = $crawler->filter('a.profile-link')->attr('href');
    $this->assertEquals('/users/1', $link);

    // Follow link
    $link = $crawler->selectLink('View Profile')->link();
    $client->click($link);
    $this->assertRouteSame('user_show');
}
```

## API Testing

```php
<?php

namespace App\Tests\Functional\Api;

use App\Tests\Factory\UserFactory;
use App\Tests\Factory\ProductFactory;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class ProductApiTest extends WebTestCase
{
    use Factories;
    use ResetDatabase;

    private $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    public function testListsProducts(): void
    {
        ProductFactory::createMany(5);

        $this->client->request('GET', '/api/products');

        $this->assertResponseIsSuccessful();

        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertCount(5, $data['hydra:member']);
    }

    public function testCreatesProduct(): void
    {
        $admin = UserFactory::createOne(['roles' => ['ROLE_ADMIN']])->object();
        $this->client->loginUser($admin);

        $this->client->request('POST', '/api/products', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => 'New Product',
            'price' => 1999,
        ]));

        $this->assertResponseStatusCodeSame(201);

        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('New Product', $data['name']);
    }

    public function testValidatesProduct(): void
    {
        $admin = UserFactory::createOne(['roles' => ['ROLE_ADMIN']])->object();
        $this->client->loginUser($admin);

        $this->client->request('POST', '/api/products', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name' => '', // Invalid: empty name
        ]));

        $this->assertResponseStatusCodeSame(422);
    }
}
```

## Testing Email Sending

```php
use Symfony\Bundle\FrameworkBundle\Test\MailerAssertionsTrait;

class RegistrationTest extends WebTestCase
{
    use MailerAssertionsTrait;

    public function testSendsWelcomeEmail(): void
    {
        $client = static::createClient();

        $client->request('POST', '/register', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => 'new@example.com',
            'password' => 'password123',
        ]));

        $this->assertEmailCount(1);

        $email = $this->getMailerMessage();
        $this->assertEmailHtmlBodyContains($email, 'Welcome');
        $this->assertEmailAddressContains($email, 'to', 'new@example.com');
    }
}
```

## Database Isolation

```php
use Zenstruck\Foundry\Test\ResetDatabase;

class OrderTest extends WebTestCase
{
    use ResetDatabase; // Resets database before each test

    public function testCreatesOrder(): void
    {
        // Database is clean here
        $user = UserFactory::createOne();
        // ...
    }
}
```

## Best Practices

1. **One scenario per test**: Each test should verify one behavior
2. **Use factories**: Create test data with Foundry
3. **Reset database**: Use `ResetDatabase` for isolation
4. **Test both success and failure**: Verify error handling
5. **Don't test implementation**: Test HTTP interface, not internals
