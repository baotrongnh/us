import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("letters_session")?.value;

    if (sessionToken !== "authenticated_ours_token_2026") {
      return NextResponse.json(
        { error: "Unauthorized access. Please enter PIN code." },
        { status: 401 }
      );
    }

    // Try reading real letters.json first, fallback to letters.example.json
    let filePath = path.join(process.cwd(), "src/data/letters.json");
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), "src/data/letters.example.json");
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ letters: [] });
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContent);

    // Return letters without password field to keep client data clean
    return NextResponse.json({
      title: data.title || "Letters Collection",
      letters: data.letters || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read letters data." },
      { status: 500 }
    );
  }
}
