import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/router";
import { createContext } from "@/server/trpc/context";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: (opts: FetchCreateContextFnOptions) =>
      createContext({ req: opts.req }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) =>
            console.error(`[tRPC] ❌ ${path ?? "unknown"}: ${error.message}`)
        : undefined,
  });

export { handler as GET, handler as POST };