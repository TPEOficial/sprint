import Sprint from "sprint-es";
import { attachWebSocket } from "sprint-es/ws";
import { chatHandler } from "./ws/chat.js";

const app = new Sprint();

const server = await app.onListen();
await attachWebSocket({
    server,
    handlers: { "/ws/chat": chatHandler },
    heartbeatMs: 30_000
});
console.log("[ws] chat upgraded on ws://localhost:5000/ws/chat");
