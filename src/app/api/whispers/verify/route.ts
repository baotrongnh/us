import { NextResponse } from "next/server";

// Simple in-memory rate limiting
const attempts = new Map<string, { count: number; lockUntil: number }>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pin = body.pin;
    const ip = request.headers.get("x-forwarded-for") || "client-ip";
    const now = Date.now();

    const record = attempts.get(ip) || { count: 0, lockUntil: 0 };
    if (record.lockUntil > now) {
      const waitSec = Math.ceil((record.lockUntil - now) / 1000);
      return NextResponse.json(
        { error: `Too many failed attempts. Please wait ${waitSec}s.` },
        { status: 429 }
      );
    }

    // Read password from env or fall back to default
    const targetPassword = process.env.WHISPERS_PASSWORD ?? "200926";

    if (pin && pin.trim() === String(targetPassword).trim()) {
      attempts.delete(ip);
      const response = NextResponse.json({ success: true });
      response.cookies.set("whispers_session", "authenticated_whispers_token_2026", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
      return response;
    } else {
      record.count += 1;
      if (record.count >= 5) {
        record.lockUntil = now + 45 * 1000;
        record.count = 0;
      }
      attempts.set(ip, record);
      return NextResponse.json(
        { error: "Incorrect PIN code. Try again." },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
