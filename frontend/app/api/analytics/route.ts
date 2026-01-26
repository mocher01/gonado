import { NextRequest, NextResponse } from "next/server";

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyticsEvent = await request.json();

    const { event, properties, timestamp } = body;

    if (!event || typeof event !== "string") {
      return NextResponse.json(
        { error: "Event name is required" },
        { status: 400 }
      );
    }

    // Log analytics event to console for now
    console.log("=== ANALYTICS EVENT ===");
    console.log(`Event: ${event}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Properties:`, JSON.stringify(properties, null, 2));
    console.log(`IP: ${request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"}`);
    console.log("======================");

    // TODO: In the future, send to analytics service (e.g., PostHog, Mixpanel, etc.)
    // Example:
    // await analyticsService.track({
    //   event,
    //   properties,
    //   timestamp,
    //   ip: request.headers.get("x-forwarded-for"),
    //   userAgent: request.headers.get("user-agent"),
    // });

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing analytics event:", error);

    return NextResponse.json(
      { error: "Failed to process analytics event" },
      { status: 500 }
    );
  }
}
