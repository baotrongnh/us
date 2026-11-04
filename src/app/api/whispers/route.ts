import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

const WHISPERS_DIR = path.join(process.cwd(), "public", "audio", "whispers");
const AUDIO_EXTENSIONS = [".mp3", ".ogg", ".wav", ".flac", ".aac", ".m4a", ".opus"];

function isAudioFile(name: string) {
  return AUDIO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

function cleanTitle(filename: string): string {
  const noExt = filename.replace(/\.[^.]+$/, "");
  return noExt.replace(/\s*[({[]?\d+\s*kbps[)}\]]?/gi, "").trim();
}

export async function GET() {
  try {
    // Check session cookie
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("whispers_session")?.value;

    if (sessionToken !== "authenticated_whispers_token_2026") {
      return NextResponse.json(
        { error: "Unauthorized. Please enter PIN code." },
        { status: 401 }
      );
    }

    if (!fs.existsSync(WHISPERS_DIR)) {
      fs.mkdirSync(WHISPERS_DIR, { recursive: true });
    }

    const entries = fs.readdirSync(WHISPERS_DIR, { withFileTypes: true });
    const whispers = entries
      .filter((e) => e.isFile() && isAudioFile(e.name))
      .map((e, i) => ({
        id: i + 1,
        title: cleanTitle(e.name),
        src: `/audio/whispers/${encodeURIComponent(e.name)}`,
        filename: e.name,
      }));

    return NextResponse.json({ whispers });
  } catch {
    return NextResponse.json({ whispers: [] });
  }
}
