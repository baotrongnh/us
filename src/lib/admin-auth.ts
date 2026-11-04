import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

type LettersFile = {
  password?: unknown;
};

const attempts = new Map<string, { count: number; lockUntil: number }>();

export async function getLettersPassword() {
  const environmentPassword = process.env.LETTERS_PASSWORD?.trim();
  if (environmentPassword) return environmentPassword;

  const filePath = path.join(process.cwd(), "src", "data", "letters.json");
  let fileContent: string;
  try {
    fileContent = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error("Letters password is not configured in LETTERS_PASSWORD or letters.json.", {
      cause: error,
    });
  }

  let fileData: LettersFile;
  try {
    fileData = JSON.parse(fileContent) as LettersFile;
  } catch (error) {
    throw new Error("Could not parse letters.json while reading the Letters password.", {
      cause: error,
    });
  }

  if (typeof fileData.password !== "string" || !fileData.password.trim()) {
    throw new Error("letters.json does not contain a valid password.");
  }
  return fileData.password.trim();
}

export function passwordsMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  return (
    inputBuffer.length === expectedBuffer.length &&
    timingSafeEqual(inputBuffer, expectedBuffer)
  );
}

export async function verifyAdminPassword(input: string, request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const record = attempts.get(ip) ?? { count: 0, lockUntil: 0 };
  if (record.lockUntil > now) return "locked" as const;

  try {
    const expectedPassword = await getLettersPassword();
    if (!passwordsMatch(input, expectedPassword)) {
      record.count += 1;
      if (record.count >= 5) {
        record.count = 0;
        record.lockUntil = now + 60_000;
      }
      attempts.set(ip, record);
      return "invalid" as const;
    }

    attempts.delete(ip);
    return "valid" as const;
  } catch (error) {
    console.error("Could not verify the Admin password.", error);
    return "unavailable" as const;
  }
}
