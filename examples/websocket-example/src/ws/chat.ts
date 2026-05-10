import type { WebSocketHandler, WebSocket } from "sprint-es/ws";

const room = new Set<WebSocket>();

export const chatHandler: WebSocketHandler = {
    onConnection: (socket: WebSocket) => {
        room.add(socket);
        broadcast({ event: "joined", count: room.size }, socket);

        socket.on("message", (raw) => {
            const text = raw.toString();
            broadcast({ event: "message", text, ts: Date.now() }, socket);
        });

        socket.on("close", () => {
            room.delete(socket);
            broadcast({ event: "left", count: room.size });
        });
    }
};

function broadcast(payload: unknown, except?: WebSocket): void {
    const data = JSON.stringify(payload);
    for (const ws of room) {
        if (ws === except) continue;
        if (ws.readyState === ws.OPEN) ws.send(data);
    }
}
