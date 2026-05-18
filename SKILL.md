---
name: flight-tracker-stack
description: >
  Project-specific skill for the Flight Tracker application. Defines the
  stack, conventions, domain vocabulary, and operational rules for AI agents
  working in this codebase. Load this skill at the start of every session
  alongside `agents-rules`.
---

# Flight Tracker — Project Skill

> This codebase is a **Next.js (App Router)** application for tracking
> flight prices across user-defined routes, date windows, and priority
> levels. It fetches prices on a schedule, stores history in a local
> database, and surfaces trends and alerts through a premium dark-mode
> dashboard.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | **Next.js 14+** (App Router, `src/app/`) |
| Language | **TypeScript** (strict mode) |
| Runtime | **Node.js ≥ 18** |
| Package manager | **pnpm** |
| Styling | **Vanilla CSS** — no Tailwind. Dark mode, glassmorphism, micro-animations. |
| Database | **SQLite** via **Prisma** (or Drizzle). File-based, zero-config. |
| Charts | **Recharts** or **Chart.js** for price history visualization |
| HTTP client | **fetch** (native) or **axios** for external API calls |
| Scheduling | **node-cron** (local dev) / **Vercel Cron** (production) |
| Notifications | Telegram Bot API, email (nodemailer), webhooks |
| Testing | **Vitest** for unit/integration, **Playwright** for E2E |
| Linting | **ESLint** (Next.js config) + **Prettier** |

---

## Domain Vocabulary

These terms have precise meaning in this codebase:

| Term | Definition |
|---|---|
| **Route** | A departure → arrival airport pair (e.g. ZRH → XNA). May be one-way or round trip. |
| **Priority** | A user-assigned importance level: P1 (must-have), P2 (nice-to-have), etc. |
| **Date Window** | A set of target travel dates or date range for a route. |
| **Price Point** | A single price observation for a route + date, captured at a specific timestamp. |
| **Price History** | The time-series of price points for a given route + date combination. |
| **Drop** | A decrease in price compared to the previous observation or a rolling average. |
| **Alert** | A notification triggered when a price drop exceeds a configured threshold. |
| **Tracker** | The background job that periodically fetches and logs new price points. |

---

## Architecture

This is a **single Next.js application** (not a monorepo of multiple
packages). The architecture follows a clean separation:

```
src/
├── app/                ← Pages, layouts, API routes (Next.js App Router)
│   ├── layout.tsx      ← Root layout with global providers
│   ├── page.tsx        ← Dashboard / home
│   ├── routes/         ← CRUD for tracked routes
│   ├── history/        ← Price history views & charts
│   └── api/            ← REST API endpoints
│       ├── flights/    ← Flight data endpoints
│       ├── track/      ← Trigger/manage tracking
│       └── alerts/     ← Alert configuration
├── components/         ← Reusable presentational components
│   ├── FlightCard.tsx
│   ├── PriceChart.tsx
│   ├── RouteForm.tsx
│   └── ...
├── lib/                ← Pure logic and service layer
│   ├── db/             ← Database client, queries, repository pattern
│   ├── scrapers/       ← Flight price fetchers (one adapter per API provider)
│   ├── notifications/  ← Alert delivery adapters (Telegram, email, webhook)
│   ├── tracker.ts      ← Core tracking logic: fetch → compare → alert
│   └── utils.ts        ← Pure utility functions
├── types/              ← Shared TypeScript interfaces and types
└── styles/             ← Global CSS, design tokens, component styles
```

### Dependency Direction

```
app/ (pages, API routes)
  ↓
components/ (presentational, no side effects)
  ↓
lib/ (business logic, data access, external integrations)
  ↓
types/ (pure type definitions, no runtime code)
```

- **Pages** call into `lib/` for data and render `components/`.
- **Components** receive data via props; they do not call `lib/` directly.
- **`lib/`** contains all side effects: database, HTTP, notifications.
- **`types/`** is dependency-free.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component | PascalCase, `.tsx` | `FlightCard.tsx` |
| Page/Route | `page.tsx` in directory | `src/app/routes/page.tsx` |
| API Route | `route.ts` in directory | `src/app/api/flights/route.ts` |
| Library module | camelCase, `.ts` | `tracker.ts`, `priceHistory.ts` |
| Type/Interface | PascalCase, prefixed with purpose | `Route`, `PricePoint`, `AlertConfig` |
| CSS file | kebab-case, `.css` | `flight-card.css`, `globals.css` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_CURRENCY` |
| Env variable | UPPER_SNAKE_CASE | `FLIGHT_API_KEY`, `DATABASE_URL` |
| Test file | `*.test.ts` / `*.test.tsx` | `tracker.test.ts` |

---

## Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test                     # all tests
pnpm test -- tracker          # single file/pattern

# Lint & format
pnpm lint
pnpm format

# Database (if using Prisma)
pnpm prisma migrate dev       # apply migrations
pnpm prisma studio            # visual DB browser
pnpm prisma generate          # regenerate client
```

---

## Design Rules

1. **Dark mode first.** The default theme is dark. Light mode is optional.
2. **No Tailwind.** All styling is vanilla CSS using CSS custom properties
   as design tokens.
3. **Glassmorphism for cards.** Flight cards and dashboard panels use
   `backdrop-filter: blur()` with semi-transparent backgrounds.
4. **Micro-animations.** Hover effects, transitions on state changes,
   subtle loading skeletons. The UI must feel alive.
5. **Premium typography.** Use Inter or Outfit from Google Fonts. No
   browser defaults.
6. **Responsive.** Mobile-first, fluid layouts with CSS Grid/Flexbox.

---

## Data Flow

```
User defines Route + Dates + Priority
        ↓
Tracker (cron) fetches prices from API provider
        ↓
Price Points stored in SQLite
        ↓
Dashboard reads latest + history
        ↓
If drop detected → Alert dispatched (Telegram / email / webhook)
```

---

## What the Agent Must Do

- Read this skill and `codebase-map` before making any change.
- Follow the dependency direction strictly.
- Never introduce Tailwind CSS or any CSS framework.
- Use TypeScript strict mode; no `any` types without justification.
- Keep components pure and presentational; side effects go in `lib/`.
- All new features must have corresponding types in `types/`.
- Price-related logic must handle currencies and rounding consistently.
- Secrets go in `.env.local`, never committed. Reference `.env.example`.

---

## When to Refuse and Pause

- A component is about to call a database or external API directly.
- A CSS framework is about to be introduced.
- An `any` type is about to be used without clear justification.
- A secret is about to be hardcoded.
- A change would break the dependency direction.

---

## The Flight Tracker Mantra

> **"Track every price. Surface every drop. Keep the dashboard alive. No Tailwind. Dark mode first."**
