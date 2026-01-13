# Reference

# Doctrine Entity Relationships

## Relationship Types

### ManyToOne / OneToMany (Bidirectional)

The most common relationship. ManyToOne is always the owning side.

```php
<?php
// src/Entity/Post.php

#[ORM\Entity(repositoryClass: PostRepository::class)]
class Post
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'posts')]
    #[ORM\JoinColumn(nullable: false)]
    private User $author;

    // Getter and setter
    public function getAuthor(): User
    {
        return $this->author;
    }

    public function setAuthor(User $author): self
    {
        $this->author = $author;
        return $this;
    }
}

// src/Entity/User.php

#[ORM\Entity(repositoryClass: UserRepository::class)]
class User
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /** @var Collection<int, Post> */
    #[ORM\OneToMany(targetEntity: Post::class, mappedBy: 'author', orphanRemoval: true)]
    private Collection $posts;

    public function __construct()
    {
        $this->posts = new ArrayCollection();
    }

    /** @return Collection<int, Post> */
    public function getPosts(): Collection
    {
        return $this->posts;
    }

    public function addPost(Post $post): self
    {
        if (!$this->posts->contains($post)) {
            $this->posts->add($post);
            $post->setAuthor($this);
        }
        return $this;
    }

    public function removePost(Post $post): self
    {
        if ($this->posts->removeElement($post)) {
            // orphanRemoval will delete the post
        }
        return $this;
    }
}
```

### ManyToMany (Bidirectional)

```php
<?php
// src/Entity/Post.php

#[ORM\Entity]
class Post
{
    /** @var Collection<int, Tag> */
    #[ORM\ManyToMany(targetEntity: Tag::class, inversedBy: 'posts')]
    #[ORM\JoinTable(name: 'post_tags')]
    private Collection $tags;

    public function __construct()
    {
        $this->tags = new ArrayCollection();
    }

    public function addTag(Tag $tag): self
    {
        if (!$this->tags->contains($tag)) {
            $this->tags->add($tag);
            $tag->addPost($this); // Sync inverse side
        }
        return $this;
    }

    public function removeTag(Tag $tag): self
    {
        if ($this->tags->removeElement($tag)) {
            $tag->removePost($this); // Sync inverse side
        }
        return $this;
    }
}

// src/Entity/Tag.php

#[ORM\Entity]
class Tag
{
    /** @var Collection<int, Post> */
    #[ORM\ManyToMany(targetEntity: Post::class, mappedBy: 'posts')]
    private Collection $posts;

    public function __construct()
    {
        $this->posts = new ArrayCollection();
    }

    public function addPost(Post $post): self
    {
        if (!$this->posts->contains($post)) {
            $this->posts->add($post);
        }
        return $this;
    }

    public function removePost(Post $post): self
    {
        $this->posts->removeElement($post);
        return $this;
    }
}
```

### OneToOne

```php
<?php
// src/Entity/User.php

#[ORM\Entity]
class User
{
    #[ORM\OneToOne(targetEntity: Profile::class, cascade: ['persist', 'remove'])]
    #[ORM\JoinColumn(nullable: true)]
    private ?Profile $profile = null;

    public function getProfile(): ?Profile
    {
        return $this->profile;
    }

    public function setProfile(?Profile $profile): self
    {
        $this->profile = $profile;
        return $this;
    }
}
```

## Fetch Modes

```php
// LAZY (default) - loads on access, may cause N+1
#[ORM\ManyToOne(fetch: 'LAZY')]

// EAGER - always loads with parent (use sparingly)
#[ORM\ManyToOne(fetch: 'EAGER')]

// EXTRA_LAZY - for large collections (count without loading)
#[ORM\OneToMany(fetch: 'EXTRA_LAZY')]
// Allows: $collection->count(), contains(), slice() without full load
```

## Cascade Operations

```php
#[ORM\OneToMany(
    targetEntity: Comment::class,
    mappedBy: 'post',
    cascade: ['persist', 'remove'],  // Cascade persist and remove
    orphanRemoval: true              // Delete orphaned entities
)]
private Collection $comments;
```

Cascade options:
- `persist`: Persist child when parent is persisted
- `remove`: Remove child when parent is removed
- `merge`, `detach`, `refresh`: Less commonly used

**Warning**: Avoid `cascade: ['all']` - be explicit about what you cascade.

## Preventing N+1 Queries

### Problem: N+1

```php
// This causes N+1 queries!
$posts = $postRepository->findAll();
foreach ($posts as $post) {
    echo $post->getAuthor()->getName(); // Each iteration = 1 query
}
```

### Solution: Join Fetch

```php
<?php
// src/Repository/PostRepository.php

public function findAllWithAuthors(): array
{
    return $this->createQueryBuilder('p')
        ->addSelect('a')           // Select author too
        ->leftJoin('p.author', 'a')
        ->getQuery()
        ->getResult();
}

// Multiple relations
public function findAllWithRelations(): array
{
    return $this->createQueryBuilder('p')
        ->addSelect('a', 't', 'c')
        ->leftJoin('p.author', 'a')
        ->leftJoin('p.tags', 't')
        ->leftJoin('p.comments', 'c')
        ->getQuery()
        ->getResult();
}
```

### Query Hints

```php
$query = $em->createQuery('SELECT p FROM Post p');
$query->setFetchMode(Post::class, 'author', ClassMetadata::FETCH_EAGER);
```

## Self-Referencing Relations

```php
<?php
// src/Entity/Category.php

#[ORM\Entity]
class Category
{
    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'children')]
    private ?Category $parent = null;

    #[ORM\OneToMany(targetEntity: self::class, mappedBy: 'parent')]
    private Collection $children;

    public function __construct()
    {
        $this->children = new ArrayCollection();
    }
}
```

## Index Foreign Keys

```php
#[ORM\Entity]
#[ORM\Index(columns: ['author_id'], name: 'idx_post_author')]
class Post
{
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'author_id', nullable: false)]
    private User $author;
}
```

## Best Practices

1. **Owning side**: ManyToOne is always owning; for ManyToMany, choose the side you query most
2. **Bidirectional helpers**: Always sync both sides in add/remove methods
3. **Use orphanRemoval** for child entities that make no sense alone
4. **Cascade carefully**: Prefer explicit persist/remove in services
5. **Avoid bidirectional** unless you need to traverse both ways
6. **Join fetch** in repositories to prevent N+1
7. **Index foreign keys** for query performance
