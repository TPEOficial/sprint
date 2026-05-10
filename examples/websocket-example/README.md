# Sprint WebSocket Example

Real-time chat broadcast room over WebSocket on `/ws/chat`.

```bash
npm install
npm run dev
```

## Try it

```bash
npx wscat -c ws://localhost:5000/ws/chat
> hello
< {"event":"message","text":"hello","ts":...}
```

Open multiple `wscat` windows to see broadcast across clients. Heartbeat ping/pong runs every 30s; dead connections are terminated automatically.
