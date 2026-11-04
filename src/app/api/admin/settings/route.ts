import { NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/admin-auth";
import type { MapLocation } from "@/lib/map-location";
import { getSiteSettings, parseMapLocations, updateSiteSettings } from "@/lib/site-settings";

async function authorize(request: Request) {
  const password = request.headers.get("x-admin-password");
  if (!password) return NextResponse.json({ error: "Sign in to manage settings." }, { status: 401 });

  const result = await verifyAdminPassword(password, request);
  if (result === "valid") return null;
  if (result === "locked") {
    return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
  }
  if (result === "unavailable") {
    return NextResponse.json({ error: "Admin sign-in is not configured on the server." }, { status: 503 });
  }
  return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
}

export async function GET(request: Request) {
  const authError = await authorize(request);
  if (authError) return authError;
  try {
    return NextResponse.json(await getSiteSettings());
  } catch (error) {
    console.error("Could not read admin site settings.", error);
    return NextResponse.json({ error: "Could not load settings. Check the Supabase configuration." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const authError = await authorize(request);
  if (authError) return authError;

  let body: { maintenance?: unknown; locations?: unknown };
  let locations: MapLocation[] | undefined;
  try {
    const requestBody: unknown = await request.json();
    if (typeof requestBody !== "object" || requestBody === null || Array.isArray(requestBody)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    body = requestBody as { maintenance?: unknown; locations?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if ("maintenance" in body && typeof body.maintenance !== "boolean") {
    return NextResponse.json({ error: "Maintenance must be true or false." }, { status: 400 });
  }
  if ("locations" in body) {
    try {
      locations = parseMapLocations(body.locations);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid map locations." },
        { status: 400 }
      );
    }
  }
  if (!("maintenance" in body) && !("locations" in body)) {
    return NextResponse.json({ error: "Provide a setting to update." }, { status: 400 });
  }

  try {
    const updates = {
      ...(typeof body.maintenance === "boolean" ? { maintenance: body.maintenance } : {}),
      ...(locations ? { locations } : {}),
    };
    return NextResponse.json(await updateSiteSettings(updates));
  } catch (error) {
    console.error("Could not update admin site settings.", error);
    return NextResponse.json({ error: "Could not save settings. Check the Supabase table and permissions." }, { status: 503 });
  }
}
