# Skills Best Practices (Claude Code)

This repository's skills now follow a shared structure aligned with Claude Code skill guidance:

- Clear trigger intent in `description`
- Focused workflow with deterministic steps
- Guardrails to prevent scope drift
- Progressive disclosure (`SKILL.md` first, `reference.md` when needed)
- Explicit output contract (changed files, validation, risk)

## Authoring rules

- Keep `SKILL.md` concise and action-oriented.
- Put deep technical detail in `reference.md`.
- Prefer concrete validation commands over vague checks.
- Update both `description` and references when a skill's scope changes.

## Content QA (v3)

Run:

`npx tsx scripts/validate_skills.ts`
`npx tsx scripts/lint_skill_content.ts`

This keeps skill structure consistent and descriptions non-generic.
