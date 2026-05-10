# Sprint gRPC Example

Mixed backend: HTTP (Sprint) on port 5000 + gRPC server on `0.0.0.0:50051`.

```bash
npm install
npm run dev
```

## Try it

HTTP:
```bash
curl http://localhost:5000/
```

gRPC (using `grpcurl`):
```bash
grpcurl -plaintext -d '{"name":"Ada"}' localhost:50051 Greeter/SayHello
```

The gRPC server is registered with Sprint's lifecycle, so SIGTERM gracefully shuts it down (`tryShutdown` then `forceShutdown` after the configured drain timeout).

For a production gRPC server you'd typically load `.proto` files via `@grpc/proto-loader` instead of inlining the service definition — see the `@grpc/grpc-js` docs.
