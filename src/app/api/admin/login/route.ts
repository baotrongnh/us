import { NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.password !== "string" || !body.password.trim()) {
    return NextResponse.json({ error: "Enter the admin password." }, { status: 400 });
  }

  const result = await verifyAdminPassword(body.password.trim(), request);
  if (result === "locked") {
    return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
  }
  if (result === "unavailable") {
    return NextResponse.json({ error: "Admin sign-in is not configured on the server." }, { status: 503 });
  }
  if (result === "invalid") return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  return NextResponse.json({ success: true });
}
