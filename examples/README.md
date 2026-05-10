# Sprint Examples

Ready-to-run example projects showing different Sprint backend patterns.

| Example | What it shows |
|---------|---------------|
| [`create-sprint-generic-example`](./create-sprint-generic-example) | Default scaffold from `npx create-sprint` — REST routes, middlewares, schemas, cronjobs, OpenAPI, GraphQL |
| [`graphql-example`](./graphql-example) | Minimal GraphQL backend with `graphql-http` + GraphiQL playground |
| [`trpc-example`](./trpc-example) | tRPC adapter mounted at `/trpc` with context propagation |
| [`grpc-example`](./grpc-example) | Mixed HTTP + gRPC server (port 50051) with lifecycle-managed graceful shutdown |
| [`websocket-example`](./websocket-example) | Broadcast chat room over `/ws/chat` with heartbeat |
| [`queues-microservice-example`](./queues-microservice-example) | Production microservice template: BullMQ queue + Redis pub/sub + cache + idempotency middleware |

Each example is self-contained — `cd <example> && npm install && npm run dev`.
