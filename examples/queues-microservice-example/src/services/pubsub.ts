import { definePubSub, BullMQPubSub } from "sprint-es/queue";
import { pubClient, subClient } from "./redis.js";

export const events = definePubSub({
    name: "events",
    adapter: new BullMQPubSub({ publisher: pubClient, subscriber: subClient })
});

await events.subscribe("user.created", (msg) => {
    console.log("[events] user.created received:", msg);
});
