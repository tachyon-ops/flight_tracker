-- CreateTable
CREATE TABLE "WatchedFlight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "carrier" TEXT,
    "dateOut" DATETIME NOT NULL,
    "dateReturn" DATETIME,
    "isRoundTrip" BOOLEAN NOT NULL DEFAULT true,
    "priority" TEXT NOT NULL DEFAULT 'P2',
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flightId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "priceUSD" REAL NOT NULL,
    "priceCHF" REAL,
    "priceEUR" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "rawPriceLocal" REAL,
    "bookingCurrency" TEXT,
    "cabin" TEXT NOT NULL DEFAULT 'ECONOMY',
    "stops" INTEGER NOT NULL DEFAULT 1,
    "durationMin" INTEGER,
    "airline" TEXT,
    "flightNumbers" TEXT,
    "deepLink" TEXT,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceSnapshot_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "WatchedFlight" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flightId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "threshold" REAL,
    "channels" TEXT NOT NULL,
    "triggered" BOOLEAN NOT NULL DEFAULT false,
    "triggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "WatchedFlight" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DealIntelligence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "priceUSD" REAL NOT NULL,
    "normalPriceUSD" REAL,
    "discountPct" REAL,
    "source" TEXT NOT NULL,
    "bookingUrl" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AirportAlternative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hubOrigin" TEXT NOT NULL,
    "alternative" TEXT NOT NULL,
    "driveMins" INTEGER NOT NULL,
    "avgPriceUSD" REAL NOT NULL,
    "hubAvgPriceUSD" REAL NOT NULL,
    "savingsUSD" REAL NOT NULL,
    "transferCostUSD" REAL NOT NULL,
    "netSavingsUSD" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PricePrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flightId" TEXT NOT NULL,
    "predictedLow" REAL NOT NULL,
    "predictedHigh" REAL NOT NULL,
    "buyNow" BOOLEAN NOT NULL,
    "confidence" REAL NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PriceSnapshot_flightId_scrapedAt_idx" ON "PriceSnapshot"("flightId", "scrapedAt");

-- CreateIndex
CREATE INDEX "PriceSnapshot_source_idx" ON "PriceSnapshot"("source");
