import Sprint from "sprint-es";
import { attachTrpc } from "sprint-es/trpc";
import { getRequestId } from "sprint-es/context";
import { appRouter } from "./trpc/router.js";

const app = new Sprint();

await app.ready;
await attachTrpc({
    app: app.app,
    path: "/trpc",
    router: appRouter,
    createContext: () => ({ requestId: getRequestId() })
});
