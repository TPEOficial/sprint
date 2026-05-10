import Sprint from "sprint-es";
import { startGrpc } from "./grpc/server.js";

const app = new Sprint();

await app.ready;
const handle = await startGrpc();
console.log(`[grpc] listening on ${handle.address} (port ${handle.port})`);
