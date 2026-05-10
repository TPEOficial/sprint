import { Router } from "sprint-es";
import { z } from "sprint-es/schemas";
import { asyncHandler } from "sprint-es/errors";
import { createIdempotencyMiddleware } from "sprint-es/idempotency";
import { emails } from "../services/queue.js";
import { events } from "../services/pubsub.js";
import { cache } from "../services/cache.js";

const router = Router();

const idempotency = createIdempotencyMiddleware({ cache, ttlMs: 24 * 60 * 60 * 1000 });

router.post("/", idempotency, asyncHandler(async (req, res) => {
    const body = z.object({
        email: z.string().email(),
        name: z.string().min(1)
    }).parse(req.body);

    const user = { id: crypto.randomUUID(), ...body };

    await emails.add("welcome", { to: user.email, template: "welcome", data: { name: user.name } }, {
        idempotencyKey: `welcome:${user.id}`,
        attempts: 5,
        backoff: { type: "exponential", delay: 500, maxDelay: 30_000 }
    });

    await events.publish("user.created", user);

    res.status(201).json(user);
}));

export default router;
