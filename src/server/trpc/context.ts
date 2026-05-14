import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function createContext(opts: { req: Request }) {
  const session = await getServerSession(authOptions);

  const xff = opts.req.headers.get("x-forwarded-for");
  const xri = opts.req.headers.get("x-real-ip");
  const ip = xff?.split(",")[0].trim() ?? xri ?? "unknown";

  return {
    session,
    prisma,
    logger,
    ip,
    user: session?.user ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;