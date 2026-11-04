import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const AUDIO_DIR = path.join(process.cwd(), "public", "audio", "background-music");
const AUDIO_EXTENSIONS = [".mp3", ".ogg", ".wav", ".flac", ".aac", ".m4a", ".opus"];

function isAudioFile(name: string) {
  return AUDIO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

/** Strip common suffixes like bitrate, platform tags etc. for a readable title */
function cleanTitle(filename: string): string {
  const noExt = filename.replace(/\.[^.]+$/, "");
  // Remove "(64 Kbps)" / "(128kbps)" type tags
  return noExt.replace(/\s*[({[]?\d+\s*kbps[)}\]]?/gi, "").trim();
}

export async function GET() {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  const entries = fs.readdirSync(AUDIO_DIR, { withFileTypes: true });
  const tracks = entries
    .filter((entry) => entry.isFile() && isAudioFile(entry.name))
    .map((entry) => ({
      title: cleanTitle(entry.name),
      src: `/audio/background-music/${encodeURIComponent(entry.name)}`,
      filename: entry.name,
    }));

  return NextResponse.json({ tracks });
}
