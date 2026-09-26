import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Simple in-memory rate limiting to prevent brute force
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

    // Read password from process.env.LETTERS_PASSWORD or server-side letters.json
    let targetPassword = process.env.LETTERS_PASSWORD;

    if (!targetPassword) {
      const filePath = path.join(process.cwd(), "src/data/letters.json");
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        targetPassword = fileData.password;
      } else {
        targetPassword = "200926";
      }
    }

    if (pin && pin.trim() === String(targetPassword).trim()) {
      attempts.delete(ip);
      const response = NextResponse.json({ success: true });
      // Set secure HTTP-only cookie valid for 7 days
      response.cookies.set("letters_session", "authenticated_ours_token_2026", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return response;
    } else {
      record.count += 1;
      if (record.count >= 5) {
        record.lockUntil = now + 45 * 1000; // Lock 45 seconds after 5 failed attempts
        record.count = 0;
      }
      attempts.set(ip, record);

      return NextResponse.json(
        { error: "Incorrect PIN code. Try again." },
        { status: 401 }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
