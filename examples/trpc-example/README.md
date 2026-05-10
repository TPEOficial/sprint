# Sprint tRPC Example

Sprint backend exposing a tRPC router at `/trpc`.

```bash
npm install
npm run dev
```

## Try it

```bash
# Query
curl 'http://localhost:5000/trpc/hello?input={"name":"Ada"}'

# Mutation
curl -X POST http://localhost:5000/trpc/createUser \
    -H 'content-type: application/json' \
    -d '{"name":"Ada"}'
```

`requestId` is propagated via Sprint's AsyncLocalStorage context into each tRPC procedure (`ctx.requestId`).
