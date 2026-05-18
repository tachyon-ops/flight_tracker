# ✈️ Flight Tracker

A **Next.js** flight radar application for monitoring flight prices, tracking
drops, and managing travel priorities across multiple routes and date
combinations.

---

## What It Does

- **Route Management** — Define departure → arrival routes (e.g. ZRH → XNA),
  mark them as one-way or round trip, and assign priority levels (P1, P2, …).
- **Date Windows** — Input target travel dates and date ranges to monitor.
- **Price Tracking** — Periodically fetch and log flight prices from configured
  data sources, building a historical price database.
- **Drop Alerts** — Get notified when prices drop below a threshold or by a
  significant percentage.
- **Price History Charts** — Visualize price trends over time per route and date
  combination.
- **Priority Dashboard** — At-a-glance view of all tracked flights, sorted by
  priority, with current price, trend direction, and alert status.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js** (App Router) |
| Language | **TypeScript** |
| Styling | **Vanilla CSS** (dark mode, glassmorphism, micro-animations) |
| Database | **SQLite** via Prisma (or Drizzle) |
| Charts | **Recharts** or **Chart.js** |
| Notifications | Telegram / Email / Webhook integrations |
| Scheduling | Cron jobs (node-cron or Vercel Cron) |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm (recommended) or npm

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build
pnpm start
```

---

## Project Structure

```
flight_tracker/
├── src/
│   ├── app/                  ← Next.js App Router pages & layouts
│   │   ├── layout.tsx
│   │   ├── page.tsx          ← Dashboard (home)
│   │   ├── routes/           ← Route management pages
│   │   ├── history/          ← Price history & charts
│   │   └── api/              ← API route handlers
│   ├── components/           ← Reusable UI components
│   ├── lib/                  ← Business logic, utilities, data access
│   │   ├── db/               ← Database client & queries
│   │   ├── scrapers/         ← Flight price data fetchers
│   │   └── notifications/    ← Alert delivery (Telegram, email, etc.)
│   ├── types/                ← TypeScript type definitions
│   └── styles/               ← Global CSS & design tokens
├── prisma/                   ← Prisma schema & migrations (if using Prisma)
├── public/                   ← Static assets
├── agent-skills-library/     ← AI agent operational skills
├── SKILL.md                  ← Project-specific agent skill
├── .env.example              ← Required environment variables template
└── README.md                 ← This file
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Flight data API (e.g. SerpApi, Amadeus, Tequila/Kiwi)
FLIGHT_API_KEY=
FLIGHT_API_PROVIDER=

# Database
DATABASE_URL=file:./dev.db

# Notifications (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
EMAIL_SMTP_HOST=
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=
```

---

## Agent Skills

This project includes an `agent-skills-library/` with operational skills for
AI-assisted development. The project-specific skill is in `SKILL.md` at the
repo root. See the library's own documentation for details on each skill.

---

## License

Private — not for redistribution.
