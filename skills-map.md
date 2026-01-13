# superpowers-symfony skills map

Short index for skill discovery without loading full files.

| Skill | Description | Path |
| --- | --- | --- |
| `symfony:api-platform-dto-resources` | Create API Platform resources using pure DTOs without Doctrine entities, enabling clean API design decoupled from database schema | `skills/api-platform-dto-resources/SKILL.md` |
| `symfony:api-platform-filters` | Implement API Platform filters for search, date ranges, boolean, and custom filtering with proper indexing | `skills/api-platform-filters/SKILL.md` |
| `symfony:api-platform-resources` | Configure API Platform resources with operations, pagination, and output DTOs for clean, versioned REST/GraphQL APIs | `skills/api-platform-resources/SKILL.md` |
| `symfony:api-platform-security` | Secure API Platform resources with security expressions, voters, and operation-level access control | `skills/api-platform-security/SKILL.md` |
| `symfony:api-platform-serialization` | Control API output with serialization groups, custom normalizers, and context-aware serialization in API Platform | `skills/api-platform-serialization/SKILL.md` |
| `symfony:api-platform-state-providers` | Master API Platform State Providers and Processors to decouple data retrieval and persistence from entities, enabling clean architecture and custom data sources | `skills/api-platform-state-providers/SKILL.md` |
| `symfony:api-platform-tests` | Test API Platform resources with ApiTestCase, test collections, items, filters, and authentication | `skills/api-platform-tests/SKILL.md` |
| `symfony:api-platform-versioning` | Implement API versioning strategies in API Platform including URI, header, and query parameter approaches | `skills/api-platform-versioning/SKILL.md` |
| `symfony:bootstrap-check` | Verify Symfony project configuration including .env, services.yaml, doctrine settings, and framework requirements | `skills/bootstrap-check/SKILL.md` |
| `symfony:brainstorming` | Structured brainstorming techniques for Symfony projects - explore requirements, identify components, and plan architecture collaboratively | `skills/brainstorming/SKILL.md` |
| `symfony:config-env-parameters` | Manage Symfony configuration with .env files, parameters, secrets, and environment-specific settings | `skills/config-env-parameters/SKILL.md` |
| `symfony:controller-cleanup` | Refactor fat controllers into lean controllers by extracting business logic to services, handlers, and dedicated classes | `skills/controller-cleanup/SKILL.md` |
| `symfony:cqrs-and-handlers` | Implement CQRS pattern in Symfony with separate Command and Query handlers using Messenger component | `skills/cqrs-and-handlers/SKILL.md` |
| `symfony:daily-workflow` | Daily development workflow for Symfony projects including common tasks, debugging, and productivity tips | `skills/daily-workflow/SKILL.md` |
| `symfony:doctrine-batch-processing` | Process large datasets efficiently with Doctrine batch processing, iteration, and memory management | `skills/doctrine-batch-processing/SKILL.md` |
| `symfony:doctrine-fetch-modes` | Optimize Doctrine queries with fetch modes, lazy loading, extra lazy collections, and query hints for performance | `skills/doctrine-fetch-modes/SKILL.md` |
| `symfony:doctrine-fixtures-foundry` | Create test data with Foundry factories; define states, sequences, and relationships for realistic fixtures | `skills/doctrine-fixtures-foundry/SKILL.md` |
| `symfony:doctrine-migrations` | Create and manage Doctrine migrations for schema versioning; handle migration dependencies, rollbacks, and production deployment | `skills/doctrine-migrations/SKILL.md` |
| `symfony:doctrine-relations` | Define Doctrine entity relationships (OneToMany, ManyToMany, ManyToOne); configure fetch modes, cascade operations, and orphan removal; prevent N+1 queries | `skills/doctrine-relations/SKILL.md` |
| `symfony:doctrine-transactions` | Handle database transactions with Doctrine UnitOfWork; implement optimistic locking, flush strategies, and transaction boundaries | `skills/doctrine-transactions/SKILL.md` |
| `symfony:e2e-panther-playwright` | Write end-to-end tests with Symfony Panther for browser automation or Playwright for complex scenarios | `skills/e2e-panther-playwright/SKILL.md` |
| `symfony:effective-context` | Provide effective context to Claude for Symfony development with relevant files, patterns, and constraints | `skills/effective-context/SKILL.md` |
| `symfony:executing-plans` | Methodically execute implementation plans with TDD approach, incremental commits, and continuous validation | `skills/executing-plans/SKILL.md` |
| `symfony:form-types-validation` | Build Symfony forms with custom Form Types, validation constraints, data transformers, and proper error handling | `skills/form-types-validation/SKILL.md` |
| `symfony:functional-tests` | Write functional tests for Symfony controllers and HTTP endpoints using WebTestCase, BrowserKit, and test clients | `skills/functional-tests/SKILL.md` |
| `symfony:interfaces-and-autowiring` | Master Symfony's Dependency Injection with autowiring, interface binding, service decoration, and tagged services for flexible architecture | `skills/interfaces-and-autowiring/SKILL.md` |
| `symfony:messenger-retry-failures` | Handle message failures with retry strategies, dead letter queues, and failure recovery in Symfony Messenger | `skills/messenger-retry-failures/SKILL.md` |
| `symfony:ports-and-adapters` | Implement Hexagonal Architecture (Ports and Adapters) in Symfony; separate domain logic from infrastructure with clear boundaries | `skills/ports-and-adapters/SKILL.md` |
| `symfony:quality-checks` | Run code quality tools including PHP-CS-Fixer for style, PHPStan for static analysis, and Psalm for type safety | `skills/quality-checks/SKILL.md` |
| `symfony:rate-limiting` | Implement rate limiting with Symfony RateLimiter component; configure sliding window, token bucket, and fixed window algorithms | `skills/rate-limiting/SKILL.md` |
| `symfony:runner-selection` | Select and configure the appropriate command runner based on Docker Compose standard, Symfony Docker (FrankenPHP), or host environment | `skills/runner-selection/SKILL.md` |
| `symfony:strategy-pattern` | Implement the Strategy pattern with Symfony's tagged services for runtime algorithm selection and extensibility | `skills/strategy-pattern/SKILL.md` |
| `symfony:symfony-cache` | Implement caching with Symfony Cache component; configure pools, use cache tags for invalidation, and optimize performance | `skills/symfony-cache/SKILL.md` |
| `symfony:symfony-messenger` | Async message handling with Symfony Messenger; configure transports (RabbitMQ, Redis, Doctrine); implement handlers, middleware, and retry strategies | `skills/symfony-messenger/SKILL.md` |
| `symfony:symfony-scheduler` | Schedule recurring tasks with Symfony Scheduler component (7.1+); define schedules, triggers, and integrate with Messenger | `skills/symfony-scheduler/SKILL.md` |
| `symfony:symfony-voters` | Implement granular authorization with Symfony Voters; decouple permission logic from controllers; test authorization separately from business logic | `skills/symfony-voters/SKILL.md` |
| `symfony:tdd-with-pest` | Apply RED-GREEN-REFACTOR with Pest PHP for Symfony; use Foundry factories, functional tests with WebTestCase, verify failures before implementation | `skills/tdd-with-pest/SKILL.md` |
| `symfony:tdd-with-phpunit` | Apply RED-GREEN-REFACTOR with PHPUnit for Symfony; use KernelTestCase, WebTestCase, and Foundry for comprehensive testing | `skills/tdd-with-phpunit/SKILL.md` |
| `symfony:test-doubles-mocking` | Create test doubles with PHPUnit mocks and Prophecy for isolated unit testing in Symfony | `skills/test-doubles-mocking/SKILL.md` |
| `symfony:twig-components` | Build reusable UI components with Symfony UX Twig Components and Live Components for reactive interfaces | `skills/twig-components/SKILL.md` |
| `symfony:using-symfony-superpowers` | Entry point for Symfony Superpowers - lightweight workflow guidance and command map. | `skills/using-symfony-superpowers/SKILL.md` |
| `symfony:value-objects-and-dtos` | Design Value Objects for domain concepts and DTOs for data transfer with proper immutability and validation | `skills/value-objects-and-dtos/SKILL.md` |
| `symfony:writing-plans` | Create structured implementation plans for Symfony features with clear steps, dependencies, and acceptance criteria | `skills/writing-plans/SKILL.md` |
