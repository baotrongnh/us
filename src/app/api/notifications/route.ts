import { NextResponse } from "next/server";
import { getPublicNotifications } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(
      { notifications: await getPublicNotifications() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Could not load public notifications.", error);
    return NextResponse.json(
      { error: "Could not load notifications." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
