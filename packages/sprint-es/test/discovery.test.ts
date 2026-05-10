import { afterEach, describe, expect, it } from "@jest/globals";
import { InMemoryDiscovery } from "../src/modules/discovery";

describe("InMemoryDiscovery", () => {
    let d: InMemoryDiscovery;
    afterEach(() => d?.close());

    it("registers and discovers", async () => {
        d = new InMemoryDiscovery({ sweepMs: 0 });
        await d.register({ id: "a1", name: "auth", address: "10.0.0.1", port: 8080 });
        await d.register({ id: "a2", name: "auth", address: "10.0.0.2", port: 8080 });
        const list = await d.discover("auth");
        expect(list.map(x => x.id).sort()).toEqual(["a1", "a2"]);
    });

    it("deregister removes instance", async () => {
        d = new InMemoryDiscovery({ sweepMs: 0 });
        await d.register({ id: "a1", name: "auth", address: "x", port: 1 });
        await d.deregister("a1");
        expect(await d.discover("auth")).toEqual([]);
    });

    it("marks stale instances unhealthy after TTL", async () => {
        d = new InMemoryDiscovery({ ttlMs: 50, sweepMs: 20 });
        await d.register({ id: "a1", name: "x", address: "x", port: 1 });
        await new Promise(r => setTimeout(r, 100));
        expect(await d.discover("x")).toEqual([]);
    });

    it("heartbeat keeps instance healthy", async () => {
        d = new InMemoryDiscovery({ ttlMs: 80, sweepMs: 20 });
        await d.register({ id: "a1", name: "x", address: "x", port: 1 });
        await new Promise(r => setTimeout(r, 50));
        await d.heartbeat("a1");
        await new Promise(r => setTimeout(r, 50));
        expect(await d.discover("x")).toHaveLength(1);
    });

    it("watch fires on change", async () => {
        d = new InMemoryDiscovery({ sweepMs: 0 });
        const events: number[] = [];
        const unsub = await d.watch("svc", (list) => events.push(list.length));
        await d.register({ id: "1", name: "svc", address: "x", port: 1 });
        await d.register({ id: "2", name: "svc", address: "x", port: 2 });
        await d.deregister("1");
        await unsub();
        await d.register({ id: "3", name: "svc", address: "x", port: 3 });
        // initial snapshot (0) + register (1) + register (2) + deregister (1)
        expect(events).toEqual([0, 1, 2, 1]);
    });
});
