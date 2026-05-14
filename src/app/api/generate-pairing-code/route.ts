import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

declare global {
  // eslint-disable-next-line no-var
  var _pairingCodes: Map<string, { ownerId: string; expires: number }>;
}
if (!globalThis._pairingCodes) {
  globalThis._pairingCodes = new Map();
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clean up expired codes
  const now = Date.now();
  for (const [k, v] of globalThis._pairingCodes.entries()) {
    if (v.expires < now) globalThis._pairingCodes.delete(k);
  }

  const code = randomBytes(16).toString("hex");
  const expires = now + 15 * 60 * 1000; // 15 minutes
  globalThis._pairingCodes.set(code, { ownerId: session.user.id, expires });

  console.log(`✅ Pairing code generated for user ${session.user.id}`);

  const serverUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const qrPayload = Buffer.from(
    JSON.stringify({ code, serverUrl }),
  ).toString("base64");

  return NextResponse.json({ code, qrPayload, serverUrl });
}