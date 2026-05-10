# Sprint Microservice Example (Queues + Pub/Sub + Cache)

Production-grade microservice template using:

- **BullMQ** queue with retries + DLQ + idempotency keys
- **Redis pub/sub** for cross-service events
- **Redis cache** with TTL
- **Idempotency middleware** for safe retries on POST
- Sprint's lifecycle integration: graceful shutdown closes Redis, drains in-flight jobs, ends pub/sub subscribers

```bash
docker compose up -d        # start Redis
npm install
npm run dev
```

## Try it

```bash
# Idempotent user creation — repeat the same Idempotency-Key, response is replayed
curl -X POST http://localhost:5000/users \
    -H 'content-type: application/json' \
    -H 'idempotency-key: req-001' \
    -d '{"email":"ada@example.com","name":"Ada"}'
```

The handler:
1. Validates input (Zod)
2. Enqueues `welcome` email (BullMQ — 5 attempts with exponential backoff)
3. Publishes `user.created` event (Redis pub/sub)
4. Returns 201 — the response is cached by `idempotency-key` for 24h

Watch the worker logs for `[emails]` lines (~20% intentionally fail to demo retries) and `[events] user.created received` from the pub/sub subscriber.
