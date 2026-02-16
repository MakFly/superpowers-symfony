# Reference

# End-to-End Testing

## Symfony Panther

### Installation

```bash
composer require --dev symfony/panther
```

### Basic Test

```php
<?php
// tests/E2E/HomePageTest.php

namespace App\Tests\E2E;

use Symfony\Component\Panther\PantherTestCase;

class HomePageTest extends PantherTestCase
{
    public function testHomePageLoads(): void
    {
        $client = static::createPantherClient();
        $client->request('GET', '/');

        $this->assertSelectorTextContains('h1', 'Welcome');
        $this->assertPageTitleContains('Home');
    }
}
```

### Form Interaction

```php
public function testContactForm(): void
{
    $client = static::createPantherClient();
    $crawler = $client->request('GET', '/contact');

    // Fill form
    $form = $crawler->selectButton('Send')->form([
        'contact[name]' => 'John Doe',
        'contact[email]' => 'john@example.com',
        'contact[message]' => 'Hello!',
    ]);

    $client->submit($form);

    // Wait for redirect/response
    $client->waitFor('.alert-success');

    $this->assertSelectorTextContains('.alert-success', 'Message sent');
}
```

### JavaScript Interactions

```php
public function testDropdownMenu(): void
{
    $client = static::createPantherClient();
    $client->request('GET', '/dashboard');

    // Click to open dropdown
    $client->clickLink('User Menu');

    // Wait for dropdown to appear
    $client->waitFor('.dropdown-menu');

    // Verify dropdown content
    $this->assertSelectorIsVisible('.dropdown-menu');
    $this->assertSelectorTextContains('.dropdown-menu', 'Profile');
}
```

### Waiting for Elements

```php
public function testAsyncContent(): void
{
    $client = static::createPantherClient();
    $client->request('GET', '/products');

    // Wait for element to exist
    $client->waitFor('.product-list');

    // Wait for element to be visible
    $client->waitForVisibility('.product-card');

    // Wait with custom timeout
    $client->waitFor('.slow-content', 10); // 10 seconds

    // Wait for element to disappear
    $client->waitForInvisibility('.loading-spinner');

    // Wait for text
    $client->waitForElementToContain('.status', 'Complete');
}
```

### Taking Screenshots

```php
public function testProductPage(): void
{
    $client = static::createPantherClient();
    $client->request('GET', '/products/1');

    // Take screenshot
    $client->takeScreenshot('product_page.png');

    // On failure, screenshots are saved automatically
}
```

## Playwright (Alternative)

For more complex scenarios, use Playwright with its PHP bindings or run separately.

### JavaScript Playwright Tests

```javascript
// tests/e2e/login.spec.js
const { test, expect } = require('@playwright/test');

test('user can login', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});

test('login validation', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'invalid');
  await page.click('button[type="submit"]');

  await expect(page.locator('.error-message')).toBeVisible();
});
```

### Playwright Configuration

```javascript
// playwright.config.js
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
};
```

## Testing User Flows

### Panther: Complete Checkout Flow

```php
public function testCheckoutFlow(): void
{
    $client = static::createPantherClient();

    // 1. Login
    $client->request('GET', '/login');
    $client->submitForm('Login', [
        'email' => 'test@example.com',
        'password' => 'password',
    ]);
    $client->waitFor('.dashboard');

    // 2. Browse products
    $client->clickLink('Products');
    $client->waitFor('.product-list');

    // 3. Add to cart
    $client->click('.product-card:first-child .add-to-cart');
    $client->waitForElementToContain('.cart-count', '1');

    // 4. Go to cart
    $client->clickLink('Cart');
    $client->waitFor('.cart-items');

    // 5. Checkout
    $client->clickLink('Checkout');
    $client->waitFor('.checkout-form');

    // 6. Fill shipping
    $client->submitForm('Continue', [
        'shipping[address]' => '123 Main St',
        'shipping[city]' => 'Paris',
        'shipping[zip]' => '75001',
    ]);

    // 7. Confirm order
    $client->waitFor('.order-summary');
    $client->click('.confirm-order');

    // 8. Verify success
    $client->waitFor('.order-confirmation');
    $this->assertSelectorTextContains('.order-confirmation', 'Thank you');
}
```

## CI Configuration

### GitHub Actions with Panther

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      database:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: 8.3
          extensions: pdo_pgsql

      - name: Install Chrome
        uses: browser-actions/setup-chrome@latest

      - name: Install dependencies
        run: composer install

      - name: Setup database
        run: |
          bin/console doctrine:database:create --env=test
          bin/console doctrine:migrations:migrate --no-interaction --env=test
          bin/console doctrine:fixtures:load --no-interaction --env=test

      - name: Start server
        run: symfony server:start -d --no-tls

      - name: Run E2E tests
        run: ./vendor/bin/phpunit tests/E2E
        env:
          PANTHER_NO_SANDBOX: 1

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: var/screenshots/
```

## Best Practices

1. **Test critical paths**: Login, checkout, signup
2. **Use explicit waits**: Don't rely on implicit timing
3. **Screenshots on failure**: Debug issues quickly
4. **Separate from unit tests**: E2E tests are slow
5. **Stable selectors**: Use data-testid attributes
6. **Reset state**: Clean database between tests


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- ./vendor/bin/phpunit --filter=...
- ./vendor/bin/phpunit
- ./vendor/bin/pest --filter=...

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

