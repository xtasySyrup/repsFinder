# RepFinder App

## Stack
Next.js 14, Tailwind, API Routes

## Architecture
- /app/api/identify → Anthropic vision
- /app/api/search → Reddit + Google CSE
- /app/api/qc → FinderQC formatter

## Conventions
- Toujours extraire itemID avec regex weidian
- Confirmation modal avant toute recherche

## Git
- Commit after each completed feature
- Use conventional commits (feat:, fix:, chore:)
- Never commit .env files