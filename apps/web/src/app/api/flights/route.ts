import { prisma } from "@flightradar/db";
import { NextResponse } from "next/server";

/**
 * GET /api/flights — List all watched flights with latest prices
 */
export async function GET() {
  try {
    const flights = await prisma.watchedFlight.findMany({
      where: { active: true },
      include: {
        priceSnapshots: {
          orderBy: { scrapedAt: "desc" },
          take: 10,
        },
      },
      orderBy: [{ priority: "asc" }, { dateOut: "asc" }],
    });

    return NextResponse.json({ flights });
  } catch (error) {
    console.error("[API] GET /api/flights failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch flights" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flights — Add a new watched flight
 *
 * Body: { origin, destination, carrier?, dateOut, dateReturn?, priority, notes? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Input validation
    const { origin, destination, dateOut, priority } = body;
    if (!origin || !destination || !dateOut || !priority) {
      return NextResponse.json(
        { error: "Missing required fields: origin, destination, dateOut, priority" },
        { status: 400 }
      );
    }

    if (!["P1", "P2", "P3"].includes(priority)) {
      return NextResponse.json(
        { error: "priority must be P1, P2, or P3" },
        { status: 400 }
      );
    }

    const flight = await prisma.watchedFlight.create({
      data: {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        carrier: body.carrier?.toUpperCase() || null,
        dateOut: new Date(dateOut),
        dateReturn: body.dateReturn ? new Date(body.dateReturn) : null,
        isRoundTrip: !!body.dateReturn,
        priority,
        notes: body.notes || null,
        active: true,
      },
    });

    return NextResponse.json({ flight }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/flights failed:", error);
    return NextResponse.json(
      { error: "Failed to create flight" },
      { status: 500 }
    );
  }
}
