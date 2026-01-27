import { NextRequest, NextResponse } from "next/server";

interface FeedbackRequest {
  category: "bug" | "feature" | "general";
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackRequest = await request.json();

    const { category, message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Log feedback to console for now
    console.log("=== FEEDBACK RECEIVED ===");
    console.log(`Category: ${category}`);
    console.log(`Message: ${message}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`User Agent: ${request.headers.get("user-agent")}`);
    console.log("========================");

    // Send to Sentry as a message/event (dynamic import to avoid build issues)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureMessage(`Feedback [${category}]: ${message}`, {
        level: "info",
        tags: {
          feedback_category: category,
          feedback_type: "user_feedback",
        },
        extra: {
          message,
          timestamp: new Date().toISOString(),
          userAgent: request.headers.get("user-agent"),
        },
      });
    }

    return NextResponse.json(
      { success: true, message: "Feedback received" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing feedback:", error);

    // Log error to Sentry (dynamic import)
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(error);
    }

    return NextResponse.json(
      { error: "Failed to process feedback" },
      { status: 500 }
    );
  }
}
