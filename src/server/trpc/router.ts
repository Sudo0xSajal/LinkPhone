import { router } from "./trpc";
import { deviceRouter } from "./routers/deviceRouter";
import { mediaRouter } from "./routers/mediaRouter";
import { fileRouter } from "./routers/fileRouter";
import { callRouter } from "./routers/callRouter";
import { automationRouter } from "./routers/automationRouter";
import { activityRouter } from "./routers/activityRouter";

export const appRouter = router({
  device: deviceRouter,
  media: mediaRouter,
  file: fileRouter,
  calls: callRouter,
  automation: automationRouter,
  activity: activityRouter,
});
export type AppRouter = typeof appRouter;
