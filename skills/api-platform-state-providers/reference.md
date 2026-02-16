# State Providers Reference

## Provider checklist
- operation-bound provider registration
- pagination support where needed
- criteria scoped by current user/tenant
- deterministic sort for stable paging

## Performance checks
- no lazy loading in hot path
- indexes for filter/sort columns
- bounded select fields where feasible
