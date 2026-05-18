import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Seed ZRH → XNA watched flights ───────────────────────

  const p1Dates = [
    new Date("2026-06-24"),
    new Date("2026-06-25"),
    new Date("2026-06-29"),
  ];

  const p2Dates = [
    new Date("2026-06-26"),
    new Date("2026-06-28"),
    new Date("2026-06-30"),
    new Date("2026-07-01"),
  ];

  const allFlights = [];

  for (const date of p1Dates) {
    const flight = await prisma.watchedFlight.create({
      data: {
        origin: "ZRH",
        destination: "XNA",
        carrier: "UA",
        dateOut: date,
        isRoundTrip: true,
        priority: "P1",
        notes: "Girlfriend's miles — United Airlines",
        active: true,
      },
    });
    allFlights.push(flight);
    console.log(`  ✅ P1 flight: ZRH→XNA on ${date.toISOString().split("T")[0]}`);
  }

  for (const date of p2Dates) {
    const flight = await prisma.watchedFlight.create({
      data: {
        origin: "ZRH",
        destination: "XNA",
        carrier: "UA",
        dateOut: date,
        isRoundTrip: true,
        priority: "P2",
        notes: "Girlfriend's miles — United Airlines",
        active: true,
      },
    });
    allFlights.push(flight);
    console.log(`  ✅ P2 flight: ZRH→XNA on ${date.toISOString().split("T")[0]}`);
  }

  // ─── Seed sample price snapshots for chart testing ────────

  const sources = ["GOOGLE_FLIGHTS", "KAYAK", "SKYSCANNER"];
  const basePrices: Record<string, number> = {
    GOOGLE_FLIGHTS: 520,
    KAYAK: 535,
    SKYSCANNER: 510,
  };

  for (const flight of allFlights) {
    // Generate 14 days of price history
    for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
      const scrapedAt = new Date();
      scrapedAt.setDate(scrapedAt.getDate() - daysAgo);
      scrapedAt.setHours(14, 0, 0, 0); // Afternoon scan

      for (const source of sources) {
        // Simulate realistic price fluctuations
        const base = basePrices[source]!;
        const variation = (Math.random() - 0.5) * 80; // ±$40
        const trend = daysAgo > 7 ? 20 : -10; // prices dropped recently
        const price = Math.round((base + variation + trend) * 100) / 100;

        await prisma.priceSnapshot.create({
          data: {
            flightId: flight.id,
            source,
            priceUSD: price,
            priceCHF: Math.round(price * 0.88 * 100) / 100,
            priceEUR: Math.round(price * 0.92 * 100) / 100,
            currency: "USD",
            cabin: "ECONOMY",
            stops: 1,
            durationMin: 720, // ~12 hours
            airline: "United Airlines",
            flightNumbers: JSON.stringify(["UA 65", "UA 3847"]),
            scrapedAt,
          },
        });
      }
    }
    console.log(`  📊 14 days of price history for flight ${flight.id}`);
  }

  // ─── Seed airport alternatives ────────────────────────────

  const airports = [
    { alt: "GVA", drive: 170, avg: 485, transfer: 45 },
    { alt: "BSL", drive: 50, avg: 540, transfer: 25 },
    { alt: "MUC", drive: 210, avg: 460, transfer: 55 },
    { alt: "FRA", drive: 240, avg: 445, transfer: 60 },
    { alt: "STR", drive: 150, avg: 510, transfer: 40 },
  ];

  const hubAvg = 520;
  for (const ap of airports) {
    await prisma.airportAlternative.create({
      data: {
        hubOrigin: "ZRH",
        alternative: ap.alt,
        driveMins: ap.drive,
        avgPriceUSD: ap.avg,
        hubAvgPriceUSD: hubAvg,
        savingsUSD: hubAvg - ap.avg,
        transferCostUSD: ap.transfer,
        netSavingsUSD: hubAvg - ap.avg - ap.transfer,
      },
    });
    console.log(`  🛫 Airport alternative: ${ap.alt} (net saving: $${hubAvg - ap.avg - ap.transfer})`);
  }

  console.log("\n✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
