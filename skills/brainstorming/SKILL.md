---
name: symfony:brainstorming
description: Structured brainstorming techniques for Symfony projects - explore requirements, identify components, and plan architecture collaboratively
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Brainstorming for Symfony Projects

Use this skill to explore ideas, requirements, and architecture decisions for your Symfony project.

## Brainstorming Framework

### Phase 1: Problem Definition

Before coding, clearly define:

1. **What problem are we solving?**
   - User need or business requirement
   - Current pain points
   - Expected outcomes

2. **Who are the users?**
   - Primary users
   - Secondary stakeholders
   - System integrations

3. **What are the constraints?**
   - Time/budget limitations
   - Technical constraints
   - Existing system dependencies

### Phase 2: Solution Exploration

#### Symfony Component Analysis

| Need | Symfony Component | Alternative |
|------|-------------------|-------------|
| Authentication | Security Bundle | Custom authenticator |
| API | API Platform | FOSRestBundle |
| Background jobs | Messenger | Custom queue |
| File uploads | Filesystem | Flysystem |
| Email | Mailer | SwiftMailer |
| Caching | Cache | Redis directly |
| Logging | Monolog | Custom logger |

#### Architecture Patterns

Consider which pattern fits:

- **CRUD API**: API Platform with standard resources
- **Complex domain**: Hexagonal/Ports & Adapters
- **Event-driven**: Messenger with domain events
- **Read-heavy**: CQRS with separate read models

### Phase 3: Entity Design

Sketch entities before implementation:

```
User
├── id: uuid
├── email: string (unique)
├── password: hashed
├── roles: json
├── createdAt: datetime
└── Relations:
    └── posts: OneToMany -> Post

Post
├── id: uuid
├── title: string
├── content: text
├── status: enum (draft, published)
├── publishedAt: datetime?
└── Relations:
    ├── author: ManyToOne -> User
    └── tags: ManyToMany -> Tag
```

### Phase 4: API Design

Define endpoints before coding:

```
POST   /api/users              # Create user
GET    /api/users/{id}         # Get user
PUT    /api/users/{id}         # Update user
DELETE /api/users/{id}         # Delete user

GET    /api/posts              # List posts (paginated)
POST   /api/posts              # Create post
GET    /api/posts/{id}         # Get post
PUT    /api/posts/{id}         # Update post
DELETE /api/posts/{id}         # Delete post
POST   /api/posts/{id}/publish # Publish post
```

### Phase 5: Test Strategy

Plan tests early:

1. **Unit tests**: Services, validators, value objects
2. **Integration tests**: Repository, message handlers
3. **Functional tests**: Controllers, API endpoints
4. **E2E tests**: Critical user flows

## Brainstorming Questions

### For New Features

- What existing code can we reuse?
- How does this integrate with current entities?
- What new services/handlers are needed?
- What events should be dispatched?
- How do we handle failures?

### For Refactoring

- What's the current pain point?
- What pattern would improve this?
- Can we do this incrementally?
- What tests exist/need updating?
- How do we ensure backwards compatibility?

### For Performance

- Where are the bottlenecks?
- Can we add caching?
- Should this be async?
- Do we need a read model?
- Is the database schema optimal?

## Output Template

After brainstorming, summarize:

```markdown
## Feature: [Name]

### Problem
[What we're solving]

### Solution
[High-level approach]

### Components
- Entity: [List entities]
- Services: [List services]
- Handlers: [List message handlers]
- API: [List endpoints]

### Open Questions
- [Questions to resolve]

### Next Steps
1. [First step]
2. [Second step]
```
