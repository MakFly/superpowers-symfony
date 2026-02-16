# Reference

# Twig Components (Symfony UX)

## Installation

```bash
composer require symfony/ux-twig-component
# For reactive components
composer require symfony/ux-live-component
```

## Basic Twig Component

### Create Component Class

```php
<?php
// src/Twig/Components/Alert.php

namespace App\Twig\Components;

use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent]
class Alert
{
    public string $type = 'info';
    public string $message;
    public bool $dismissible = false;
}
```

### Create Template

```twig
{# templates/components/Alert.html.twig #}
<div class="alert alert-{{ type }}{% if dismissible %} alert-dismissible{% endif %}" role="alert">
    {{ message }}
    {% if dismissible %}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    {% endif %}
</div>
```

### Use Component

```twig
{# In any template #}
<twig:Alert type="success" message="Operation completed!" />
<twig:Alert type="danger" message="An error occurred" dismissible />
```

## Component with Slots

### Component Class

```php
<?php
// src/Twig/Components/Card.php

namespace App\Twig\Components;

use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent]
class Card
{
    public ?string $title = null;
    public string $class = '';
}
```

### Template with Slots

```twig
{# templates/components/Card.html.twig #}
<div class="card {{ class }}">
    {% if title %}
        <div class="card-header">
            <h5 class="card-title">{{ title }}</h5>
        </div>
    {% endif %}

    <div class="card-body">
        {% block content %}{% endblock %}
    </div>

    {% if block('footer') is not empty %}
        <div class="card-footer">
            {% block footer %}{% endblock %}
        </div>
    {% endif %}
</div>
```

### Usage

```twig
<twig:Card title="User Profile">
    <twig:block name="content">
        <p>Name: {{ user.name }}</p>
        <p>Email: {{ user.email }}</p>
    </twig:block>

    <twig:block name="footer">
        <a href="{{ path('user_edit', {id: user.id}) }}" class="btn btn-primary">Edit</a>
    </twig:block>
</twig:Card>
```

## Component with Logic

```php
<?php
// src/Twig/Components/UserCard.php

namespace App\Twig\Components;

use App\Entity\User;
use App\Repository\PostRepository;
use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent]
class UserCard
{
    public User $user;

    public function __construct(
        private PostRepository $postRepository,
    ) {}

    public function getPostCount(): int
    {
        return $this->postRepository->countByAuthor($this->user);
    }

    public function getRecentPosts(): array
    {
        return $this->postRepository->findRecentByAuthor($this->user, 3);
    }
}
```

```twig
{# templates/components/UserCard.html.twig #}
<div class="user-card">
    <h3>{{ user.name }}</h3>
    <p>{{ this.postCount }} posts</p>

    <ul>
    {% for post in this.recentPosts %}
        <li>{{ post.title }}</li>
    {% endfor %}
    </ul>
</div>
```

## Live Components (Reactive)

### Counter Example

```php
<?php
// src/Twig/Components/Counter.php

namespace App\Twig\Components;

use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\DefaultActionTrait;

#[AsLiveComponent]
class Counter
{
    use DefaultActionTrait;

    #[LiveProp(writable: true)]
    public int $count = 0;

    #[LiveAction]
    public function increment(): void
    {
        $this->count++;
    }

    #[LiveAction]
    public function decrement(): void
    {
        $this->count--;
    }
}
```

```twig
{# templates/components/Counter.html.twig #}
<div {{ attributes }}>
    <span>Count: {{ count }}</span>
    <button data-action="live#action" data-live-action-param="decrement">-</button>
    <button data-action="live#action" data-live-action-param="increment">+</button>
</div>
```

### Search Component

```php
<?php
// src/Twig/Components/ProductSearch.php

namespace App\Twig\Components;

use App\Repository\ProductRepository;
use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

#[AsLiveComponent]
class ProductSearch
{
    use DefaultActionTrait;

    #[LiveProp(writable: true, url: true)]
    public string $query = '';

    #[LiveProp(writable: true)]
    public int $page = 1;

    public function __construct(
        private ProductRepository $products,
    ) {}

    public function getProducts(): array
    {
        if (strlen($this->query) < 2) {
            return [];
        }

        return $this->products->search($this->query, $this->page);
    }
}
```

```twig
{# templates/components/ProductSearch.html.twig #}
<div {{ attributes }}>
    <input
        type="search"
        data-model="query"
        placeholder="Search products..."
        class="form-control"
    >

    <div class="results mt-3">
        {% for product in this.products %}
            <div class="product-card">
                <h4>{{ product.name }}</h4>
                <p>{{ product.price|format_currency('EUR') }}</p>
            </div>
        {% else %}
            {% if query|length >= 2 %}
                <p>No products found.</p>
            {% endif %}
        {% endfor %}
    </div>
</div>
```

### Form Component

```php
<?php
// src/Twig/Components/ContactForm.php

namespace App\Twig\Components;

use App\Form\ContactType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\FormInterface;
use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\ComponentWithFormTrait;
use Symfony\UX\LiveComponent\DefaultActionTrait;

#[AsLiveComponent]
class ContactForm extends AbstractController
{
    use ComponentWithFormTrait;
    use DefaultActionTrait;

    #[LiveProp]
    public bool $submitted = false;

    protected function instantiateForm(): FormInterface
    {
        return $this->createForm(ContactType::class);
    }

    #[LiveAction]
    public function submit(): void
    {
        $this->submitForm();

        if ($this->getForm()->isValid()) {
            $data = $this->getForm()->getData();
            // Process form...
            $this->submitted = true;
        }
    }
}
```

```twig
{# templates/components/ContactForm.html.twig #}
<div {{ attributes }}>
    {% if submitted %}
        <div class="alert alert-success">Thank you for your message!</div>
    {% else %}
        {{ form_start(form) }}
            {{ form_row(form.name) }}
            {{ form_row(form.email) }}
            {{ form_row(form.message) }}

            <button
                type="submit"
                data-action="live#action"
                data-live-action-param="submit"
                class="btn btn-primary"
            >
                Send
            </button>
        {{ form_end(form) }}
    {% endif %}
</div>
```

## Best Practices

1. **Keep components focused**: Single responsibility
2. **Use slots for flexibility**: Allow content injection
3. **LiveProp for state**: Mark writable props explicitly
4. **Debounce search**: Use `data-model="debounce(300)|query"`
5. **URL sync**: Use `url: true` for bookmarkable state
6. **Test components**: Unit test the PHP class


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- rg --files
- composer validate
- ./vendor/bin/phpstan analyse

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

