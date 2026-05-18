# ✈️ FlightRadar — Full Product Specification

> **Stack**: Next.js 15 · Turbo monorepo · pnpm · Prisma ORM · PrismaUI component library  
> **Route**: ZRH (Zürich) → XNA (Northwest Arkansas) · United Airlines + alternatives  
> **Purpose**: Multi-source flight price tracking, deal intelligence, and booking strategy for a specific trip with girlfriend's miles

---

## 0. Clarification Notes

- **"Prisma UI"** — There is no widely published library with this exact name. Two possibilities:
  1. You mean **Prisma** (the ORM) + a separate UI lib like **shadcn/ui** or **Radix UI**
  2. You've seen a custom/internal system called PrismaUI

  **Recommendation**: Use **Prisma** (ORM) + **shadcn/ui** (built on Radix + Tailwind) — this is the dominant high-quality combo in the NextJS ecosystem. If you have a different library in mind, drop the package name and we'll swap it.

- **"Monorepo Turbo pnpm"** — Confirmed: `turbo` + `pnpm workspaces`. Apps and packages split as below.

---

## 1. Repository Structure

```
flightradar/
├── apps/
│   └── web/                        # Next.js 15 (App Router)
│       ├── app/
│       │   ├── (dashboard)/
│       │   │   ├── page.tsx         # Main radar view
│       │   │   ├── deals/           # Deal intelligence hub
│       │   │   ├── calendar/        # Date optimizer
│       │   │   ├── airports/        # Airport comparison
│       │   │   └── alerts/          # Alert management
│       │   ├── api/
│       │   │   ├── flights/         # Price fetch endpoints
│       │   │   ├── scrape/          # Scraping jobs
│       │   │   └── webhooks/        # Incoming price alerts
│       │   └── layout.tsx
│       └── package.json
├── packages/
│   ├── db/                          # Prisma schema + client
│   │   ├── prisma/schema.prisma
│   │   └── src/index.ts
│   ├── scrapers/                    # Source-specific scrapers
│   │   ├── google-flights.ts
│   │   ├── kayak.ts
│   │   ├── skyscanner.ts
│   │   └── matrix.ts
│   ├── deal-engine/                 # Hack intelligence logic
│   │   ├── hidden-city.ts
│   │   ├── error-fare-detector.ts
│   │   ├── currency-arbitrage.ts
│   │   ├── date-optimizer.ts
│   │   └── stopover-finder.ts
│   └── ui/                          # Shared UI components (shadcn-based)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 2. Database Schema (Prisma)

```prisma
// packages/db/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ─── Core models ──────────────────────────────────────────────

model WatchedFlight {
  id          String   @id @default(cuid())
  origin      String   // IATA: "ZRH"
  destination String   // IATA: "XNA"
  carrier     String?  // "UA" (IATA airline code)
  dateOut     DateTime // Outbound date
  dateReturn  DateTime? // null = one-way
  isRoundTrip Boolean  @default(true)
  priority    Priority @default(P2)
  notes       String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  priceSnapshots PriceSnapshot[]
  alerts         Alert[]
}

enum Priority {
  P1
  P2
  P3
}

model PriceSnapshot {
  id              String   @id @default(cuid())
  flightId        String
  flight          WatchedFlight @relation(fields: [flightId], references: [id])
  source          PriceSource
  priceUSD        Float
  priceCHF        Float?
  priceEUR        Float?
  currency        String   @default("USD")
  rawPriceLocal   Float?   // Price in booking currency (for arbitrage)
  bookingCurrency String?  // The currency the site quoted in
  cabin           Cabin    @default(ECONOMY)
  stops           Int      @default(1)
  durationMin     Int?     // Total journey minutes
  airline         String?
  flightNumbers   String[] // ["UA 123", "UA 456"]
  deepLink        String?  // Direct booking URL
  scrapedAt       DateTime @default(now())

  @@index([flightId, scrapedAt])
}

enum PriceSource {
  GOOGLE_FLIGHTS
  KAYAK
  SKYSCANNER
  EXPEDIA
  UNITED_DIRECT
  HOPPER
  GOING      // formerly Scott's Cheap Flights
  ITA_MATRIX // Fare analysis
  MOMONDO
}

enum Cabin {
  ECONOMY
  PREMIUM_ECONOMY
  BUSINESS
  FIRST
}

model Alert {
  id           String   @id @default(cuid())
  flightId     String
  flight       WatchedFlight @relation(fields: [flightId], references: [id])
  type         AlertType
  threshold    Float?   // Drop % or absolute price
  channels     AlertChannel[]
  triggered    Boolean  @default(false)
  triggeredAt  DateTime?
  createdAt    DateTime @default(now())
}

enum AlertType {
  PRICE_DROP_PERCENT   // e.g. -20%
  PRICE_DROP_ABSOLUTE  // e.g. below $500
  ERROR_FARE_DETECTED
  NEW_ROUTE_FOUND
  AWARD_SPACE_OPENED
}

enum AlertChannel {
  EMAIL
  TELEGRAM
  WHATSAPP
  WEBHOOK
}

model DealIntelligence {
  id            String   @id @default(cuid())
  type          DealType
  origin        String
  destination   String
  priceUSD      Float
  normalPriceUSD Float?
  discountPct   Float?
  source        String
  bookingUrl    String
  expiresAt     DateTime?
  notes         String?  // Strategy notes
  confidence    Float    @default(0.5) // 0-1, how confident we are
  createdAt     DateTime @default(now())
}

enum DealType {
  ERROR_FARE
  HIDDEN_CITY
  FUEL_DUMP
  SPLIT_TICKET
  CURRENCY_ARBITRAGE
  POSITIONED_FLIGHT
  AWARD_SEAT
  FLASH_SALE
}

model AirportAlternative {
  id               String  @id @default(cuid())
  hubOrigin        String  // "ZRH"
  alternative      String  // "BSL", "GVA", "MUC"
  driveMins        Int
  avgPriceUSD      Float
  hubAvgPriceUSD   Float
  savingsUSD       Float
  transferCostUSD  Float   // Gas, parking, etc.
  netSavingsUSD    Float   // savingsUSD - transferCostUSD
  updatedAt        DateTime @updatedAt
}

model PricePrediction {
  id          String   @id @default(cuid())
  flightId    String
  predictedLow  Float
  predictedHigh Float
  buyNow      Boolean  // Hopper-style recommendation
  confidence  Float
  modelVersion String
  createdAt   DateTime @default(now())
}
```

---

## 3. Application Pages & Features

### 3.1 Dashboard — "The Radar" (`/`)

**Purpose**: Mission control. At a glance, all watched flights, latest prices, and deal alerts.

**Layout**:

```
┌────────────────────────────────────────────────────────────┐
│  HEADER: ZRH → XNA  |  Last scan: 2m ago  |  [Scan Now]   │
├────────────────────────────────────────────────────────────┤
│  PRIORITY BAND: P1 (June 24, 25, 29)                       │
│  ┌─────────┬─────────┬─────────┐                           │
│  │ Jun 24  │ Jun 25  │ Jun 29  │   ← FlightCard components │
│  │ $487 ↓  │ $512    │ $499 ↑  │                           │
│  │ 3 srcs  │ 3 srcs  │ 3 srcs  │                           │
│  └─────────┴─────────┴─────────┘                           │
│                                                            │
│  PRIORITY BAND: P2 (Jun 26, 28, 30, Jul 1)                 │
│  ┌──────┬──────┬──────┬──────┐                             │
│  │Jun26 │Jun28 │Jun30 │Jul 1 │                             │
│  └──────┴──────┴──────┴──────┘                             │
│                                                            │
│  DEAL ALERTS        │   PRICE TREND (last 7 days)          │
│  🚨 Error fare: $289│   [Sparkline chart]                  │
│  💰 CHF booking -8% │                                      │
└────────────────────────────────────────────────────────────┘
```

**FlightCard Component**:

- Date header with day-of-week (important — Tue/Wed are cheapest)
- Priority badge (P1/P2)
- Lowest price found across all sources, with source name
- Price delta vs. yesterday (↑↓ with color)
- Mini source comparison row (Google | Kayak | Skyscanner prices)
- Round-trip toggle showing return prices
- "Book Now" deep link button
- Expand → full price history chart for that date

---

### 3.2 Price History Chart (per flight)

**Component**: `<PriceHistoryChart />`

- X-axis: Time (past 30 days of scans)
- Y-axis: Price in USD
- One line per source (Google Flights, Kayak, Skyscanner, etc.) — color coded
- Hover tooltip: price, source, timestamp
- "Buy Zone" shaded band: predicted low range from ML model
- Annotations: when alerts were triggered, error fares spotted
- Toggle: Economy / Business / Miles redemption value

**Library**: Recharts (lightweight, SSR-compatible)

---

### 3.3 Deal Intelligence Hub (`/deals`)

The "hacks" engine. Six sub-panels:

#### Panel A — Error Fare Detector

- Scans all sources every 15 minutes for prices > 40% below median
- Flags as potential error fare with confidence score
- Shows: normal price, current price, saving, booking urgency timer
- Source: cross-reference ITA Matrix (real fare basis) vs consumer sites
- Action: "Grab It" → opens booking URL immediately (error fares expire fast)

#### Panel B — Hidden City Finder

- For ZRH→XNA: finds if ZRH→[Hub]→XNA has a cheaper fare when booked as ZRH→[Beyond XNA]
- Example: ZRH→XNA→DFW booked cheaper than ZRH→XNA, get off at XNA
- Warns: one-way only, no checked bags, risks (airline can void FF miles)
- Sources: ITA Matrix, Skiplagged integration

#### Panel C — Currency Arbitrage

- Checks same United.com flight priced in USD vs EUR vs CHF vs GBP vs THB
- Shows the cheapest currency to book in, with conversion at current rate
- Flags: "Book on United.co.uk saves $43 vs United.com"
- Refreshes with live FX rates (via open exchange rates API)

#### Panel D — Date Optimizer

- Heatmap calendar: June/July, color-coded by cheapest round trip combos
- Tue/Wed departures highlighted with savings delta vs Fri/Sat
- Redeye filter: flights departing 22:00-06:00 with price savings shown
- Formatted table view: top 10 cheapest date combos with exact price diff

#### Panel E — Nearby Airport Comparison

- ZRH alternatives: GVA (Geneva), BSL (Basel-Mulhouse), MUC (Munich), FRA (Frankfurt), STR (Stuttgart)
- For each: avg fare, drive time, parking cost estimate, net savings
- Auto-recommends: "Flying from GVA saves $67 after transport costs"

#### Panel F — Stopover Opportunities

- Detects ZRH→XNA routings with long layovers at: EWR, IAD, ORD, IAH, DEN
- Flags 20h+ layovers where you could explore the city
- Notes which United hub cities have free hotel programs
- Also checks Turkish Airlines (IST), Qatar (DOH), Swiss/LX connections

---

### 3.4 Calendar / Date View (`/calendar`)

Full month calendar (June + July) showing:

- Each day: color-coded price (green = cheap, red = expensive)
- P1 dates: star marker
- P2 dates: circle marker
- Click a date → slide-out panel with full source breakdown
- Round-trip matrix view: departure date × return date grid, cheapest price per combo

---

### 3.5 Alert Management (`/alerts`)

Configure notification rules:

```
Rule 1: Any P1 date drops below $450 → Telegram + Email
Rule 2: Any date drops 20%+ in 24h → Telegram immediately
Rule 3: Error fare detected (>40% below median) → All channels
Rule 4: United award space opens for P1 dates → Email
```

Channels:

- **Email** — standard SMTP/Resend
- **Telegram** — Bot Token + Chat ID (user pastes their bot config)
- **Webhook** — POST to any URL (enables n8n/Make.com integration)

Alert history log with timestamps.

---

### 3.6 Settings / Sources (`/settings`)

- Toggle which sources to scrape
- Set scraping frequency (15min / 1hr / 4hr)
- Manage watched flights (add/remove/edit routes)
- Add passengers (for miles: note whose miles account)
- API keys for any premium data sources
- Google Sheets export: manual trigger to dump price history to a sheet
- n8n webhook URL configuration

---

## 4. Data Sources & Scraping Strategy

### Source Priority

| Source         | Type                            | Frequency | Notes                                            |
| -------------- | ------------------------------- | --------- | ------------------------------------------------ |
| Google Flights | Browser scrape / Unofficial API | 30min     | Most reliable live prices                        |
| ITA Matrix     | Browser scrape                  | 2hr       | Real fare basis data, great for detecting errors |
| Kayak          | Browser scrape                  | 1hr       | Good for catching flash sales                    |
| Skyscanner     | Official API (free tier)        | 30min     | Good EUR-denominated prices                      |
| United.com     | Direct scrape                   | 1hr       | Authoritative for award space                    |
| Hopper         | API / App scrape                | 4hr       | Buy/wait recommendation                          |
| Going.com      | RSS alerts + scrape             | 15min     | Best for error fares                             |
| Momondo        | Scrape                          | 2hr       | Aggregates obscure OTAs                          |

### Scraping Implementation

**Option A (Recommended — Zero Block)**: Use `Browserless` (self-hostable) or `ScraperAPI` as proxy layer. Playwright scripts per source in `packages/scrapers/`.

**Option B (Free)**: Vercel Cron Jobs → Playwright on self-hosted server → POST results to API. Vercel functions can't run Playwright directly (memory/time limits).

**Architecture**:

```
Cron Trigger (Vercel Cron or Railway cron)
    ↓
Scraper Worker (Node + Playwright, Railway or Fly.io)
    ↓
POST /api/flights/ingest  (Next.js API route)
    ↓
Prisma → PostgreSQL (Neon or Supabase)
    ↓
Alert Engine runs → Telegram/Email/Webhook
```

### Anti-Detection

- Randomized user agents per request
- Per-source rate limiting (respect robots.txt where required)
- Rotating residential proxies for high-frequency sources
- Human-like delays between actions (500ms–3000ms)
- Cache responses to avoid re-scraping identical data

---

## 5. The Deal Engine — Hack Intelligence

### 5.1 Error Fare Detection Algorithm

```typescript
// packages/deal-engine/error-fare-detector.ts

function detectErrorFare(snapshots: PriceSnapshot[]): boolean {
  const median = calculateMedian(snapshots.map((s) => s.priceUSD));
  const latest = snapshots[snapshots.length - 1].priceUSD;
  const dropPct = (median - latest) / median;

  // Error fare thresholds:
  if (dropPct > 0.4) return true; // 40%+ below median = likely error
  if (latest < 200 && median > 600) return true; // Transcontinental under $200 = flag

  // Cross-source validation: if only ONE source shows low price, more likely error
  const uniqueSources = snapshots.filter((s) => s.priceUSD < median * 0.7);
  if (uniqueSources.length === 1) confidence = 0.9; // One source = error fare signal

  return false;
}
```

### 5.2 Currency Arbitrage Engine

```typescript
// packages/deal-engine/currency-arbitrage.ts
//
// Same flight, different booking portals, different currencies
// United.com prices the same fare differently depending on point of sale
//
// Check: united.com (USD), united.co.uk (GBP), united.de (EUR),
//        united.com.au (AUD), thai.united.com (THB)
// Convert all to USD at live FX rate
// Report cheapest booking currency

const UNITED_PORTALS = [
  { url: "https://www.united.com", currency: "USD", locale: "en-US" },
  { url: "https://www.united.com", currency: "EUR", locale: "de-DE" },
  { url: "https://www.united.co.uk", currency: "GBP", locale: "en-GB" },
];
```

### 5.3 Price Drop Timing Intelligence

Based on airline pricing patterns (hardcoded knowledge + validated over time):

```typescript
const AIRLINE_PRICE_DROP_WINDOWS = {
  general: {
    bestDays: ["Tuesday", "Wednesday"], // Airlines match competitors Tue AM
    bestTime: "14:00-16:00 ET", // After sales are processed
    weeksOut: [3, 6, 8], // Typical sweet spots
  },
  united: {
    saleAnnouncements: "Tuesday 00:01 ET",
    flashSaleDuration: "48-72 hours",
    awardSweetSpots: "21 days out", // T-21 release rule
  },
};
```

### 5.4 Hidden City Logic

```
ZRH → XNA direct:              $650
ZRH → XNA → DFW (full itinerary): $480
                                ^^^^
                                Book this, deplane at XNA

Risks surfaced to user:
- Only works with carry-on (no checked bags)
- Return flights on same ticket become void
- Frequent flyer miles may be forfeited if caught
- Airline can cancel your entire ticket
- Legal gray area (ToS violation, not illegal)
```

### 5.5 Stopover Detection

For ZRH→XNA routings via US hubs:

- **EWR / ORD / IAD / ORD / IAH / DEN** — check layover duration
- If > 20 hours: flag as "Free NYC/Chicago/DC/Houston/Denver stopover"
- Show: hotel cost estimate, top 3 things to do, United Club access if relevant

---

## 6. API Routes

```
GET  /api/flights                    → All watched flights
POST /api/flights                    → Add new watched flight
GET  /api/flights/[id]/prices        → Price history for a flight
GET  /api/flights/[id]/prices/latest → Latest prices per source
POST /api/flights/scan               → Trigger manual scan
GET  /api/deals                      → All deal intelligence
GET  /api/deals/error-fares          → Error fares only
GET  /api/deals/arbitrage            → Currency arbitrage findings
GET  /api/calendar/heatmap           → Price heatmap data (month view)
GET  /api/calendar/matrix            → Round-trip date matrix
GET  /api/airports/alternatives      → Nearby airport comparison
POST /api/alerts                     → Create alert rule
GET  /api/alerts/history             → Fired alert history
POST /api/alerts/test                → Send test notification
GET  /api/sources/status             → Health of each scraping source
POST /api/export/sheets              → Trigger Google Sheets export
```

---

## 7. UI Component Architecture

### Key Components

```tsx
// FlightCard — the main card per date
<FlightCard
  flight={watchedFlight}
  latestPrices={pricesBySource}
  trend={priceTrend}
  priority="P1"
  onExpand={() => openModal(flight)}
/>

// PriceHistoryChart
<PriceHistoryChart
  flightId={id}
  days={30}
  showSources={['GOOGLE_FLIGHTS', 'KAYAK', 'SKYSCANNER']}
  showPrediction={true}
/>

// DealBadge — surfaced on any card where a hack applies
<DealBadge type="error_fare" saving={43} confidence={0.87} />
<DealBadge type="currency_arbitrage" saving={38} currency="CHF" />
<DealBadge type="hidden_city" saving={170} risk="medium" />

// DateHeatmap — calendar view
<DateHeatmap
  month={6}
  year={2025}
  prices={dailyPrices}
  highlighted={p1Dates}
  marked={p2Dates}
/>

// PriceTicker — live header
<PriceTicker
  flightId={id}
  refreshInterval={30000}
/>
```

---

## 8. Automation & Integrations

### n8n Workflow (exported JSON provided in repo)

```
Trigger: Webhook (from our app)
   ↓
Condition: price_drop_pct > 20
   ↓
Branch A → Send Telegram message
Branch B → Log to Google Sheet (Flight | Date | Old Price | New Price | Source | URL)
Branch C → Send email via Gmail
```

The app POSTs to the n8n webhook when alert conditions are met. Users paste their n8n webhook URL in `/settings`.

### Google Sheets Integration

Manual export button → dumps all price history to a connected Sheet via Sheets API (OAuth2 flow in settings). Format:

| Date | Route | Source | Price USD | Price CHF | Cabin | Deep Link | Scanned At |
| ---- | ----- | ------ | --------- | --------- | ----- | --------- | ---------- |

---

## 9. Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Scraping
BROWSERLESS_TOKEN=...
SCRAPER_API_KEY=...           # optional
PROXY_POOL_URL=...            # optional residential proxies

# Notifications
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
RESEND_API_KEY=...            # Email

# FX Rates
OPEN_EXCHANGE_RATES_KEY=...

# Integrations
N8N_WEBHOOK_URL=...
GOOGLE_CLIENT_ID=...          # For Sheets export
GOOGLE_CLIENT_SECRET=...

# App
NEXT_PUBLIC_APP_URL=https://...
CRON_SECRET=...               # Vercel Cron auth
```

---

## 10. Deployment

```
Vercel (Next.js app)
  └── Cron jobs: /api/flights/scan (every 30min)
  └── Cron jobs: /api/deals/scan (every 15min for error fares)

Neon.tech (PostgreSQL — serverless, free tier generous)

Railway or Fly.io (Playwright scraper worker — needs persistent process)
  └── Receives job queue from Vercel via Queue (Upstash QStash)
  └── POSTs results back to Vercel API

Upstash (Redis — rate limiting + job queue)
```

---

## 11. Phase Plan

### Phase 1 — Foundation (Days 1–3)

- [ ] Monorepo scaffold (turbo, pnpm workspaces)
- [ ] Prisma schema + Neon DB setup
- [ ] Seed watched flights (ZRH→XNA, all 8 dates, P1/P2)
- [ ] Manual price entry UI (before scrapers exist)
- [ ] Dashboard layout with FlightCards (static data)

### Phase 2 — Live Data (Days 4–7)

- [ ] Google Flights scraper (Playwright)
- [ ] Kayak scraper
- [ ] Skyscanner scraper
- [ ] Price ingestion API + Vercel Cron
- [ ] Price history charts

### Phase 3 — Deal Engine (Days 8–12)

- [ ] Error fare detector
- [ ] Currency arbitrage checker
- [ ] Date optimizer / heatmap
- [ ] Airport alternatives
- [ ] Deal badges on FlightCards

### Phase 4 — Alerts & Automation (Days 13–16)

- [ ] Telegram bot integration
- [ ] Email alerts via Resend
- [ ] n8n webhook support
- [ ] Alert rules UI
- [ ] Google Sheets export

### Phase 5 — Polish (Days 17–20)

- [ ] Price prediction model (simple linear regression on history)
- [ ] Hidden city finder
- [ ] Stopover detector
- [ ] Mobile responsive
- [ ] PWA for phone notifications

---

## 12. Open Questions for You

1. **UI Library**: Confirm "Prisma UI" — do you mean a specific package, or is shadcn/ui + Prisma ORM fine?
Answer: prisma is my UI lib: git@github.com:tachyon-ops/prisma.git use it as submodule

2. **Hosting budget**: Free tier only (Vercel + Neon + Railway free) or paid OK?
Answer: free tier only (Vercel + Neon + Railway free)

3. **Playwright scraping**: Are you OK running a Railway/Fly worker, or do you want fully serverless (means no Playwright, use APIs only)?
Answer: Railway/Fly worker is OK

4. **Miles tracking**: Do you want to track award seat availability on United MileagePlus, or just cash prices?
Answer: just cash prices. I have Miles and More but... how can I use this?

5. **Multi-route**: Right now the spec is ZRH→XNA. Should it support adding arbitrary routes (the app UI to add new ones)?
Answer: yes

6. **Return dates**: What are the preferred return dates from XNA→ZRH? The round-trip matrix needs both legs.
Answer: I input in a calendar the dates I want to return, and it should calculate the best dates for the return trip. I am flexible with the dates.

7. **Priority**: How do you define priority? Is it just a label, or does it have any other meaning?
Answer: Priority is just a label. P1 means high priority, P2 means medium priority, P3 means low priority. It doesn't have any other meaning. Multiple dates can have the same priority.

8. **Add new dates** - I want to be able to add new dates and priorities for a watched flight. It should be as simple as clicking a button and selecting the dates and priority.

9. **Flexible departure dates**: The departure date should also be flexible. The user should be able to select a range of dates for the departure date. It should be the same as the return date selection.

Answer: The departure date is fixed to a range of days where I want to travel. The user should be able to select a range of dates for the departure date. It should be the same as the return date selection.

10. **Monitoring and persistence**: Any suggestions on how to improve this? I want to be able to see the price history of a flight and be able to see the price trend. I also want to be able to see the price history of all the watched flights.

Answer: The app should have a dashboard that shows the price history of all the watched flights. It should also have a page that shows the price history of a specific flight. The dashboard should also have a page that shows the price history of all the watched flights. It can notify me when the price drops to my Whatsapp or email

---

_Spec version 1.0 — ready for implementation once clarifications resolved._
