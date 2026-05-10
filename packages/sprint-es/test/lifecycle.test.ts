import { afterEach, describe, expect, it } from "@jest/globals";
import {
    registerResource,
    initResources,
    checkReadiness,
    listResources,
    onShutdown,
    shutdown,
    isShuttingDown,
    __resetLifecycle
} from "../src/modules/lifecycle";

describe("lifecycle", () => {
    afterEach(() => __resetLifecycle());

    it("registers and lists resources", () => {
        registerResource("r1", { close: () => {} });
        registerResource("r2", { close: () => {} });
        expect(listResources().map(r => r.name)).toEqual(["r1", "r2"]);
    });

    it("rejects duplicate names", () => {
        registerResource("dup", { close: () => {} });
        expect(() => registerResource("dup", { close: () => {} })).toThrow();
    });

    it("transitions state through init", async () => {
        let initialized = false;
        registerResource("db", {
            init: async () => { initialized = true; },
            close: () => {}
        });
        expect(listResources()[0].state).toBe("starting");
        await initResources();
        expect(initialized).toBe(true);
        expect(listResources()[0].state).toBe("ready");
    });

    it("propagates init failure", async () => {
        registerResource("fail", {
            init: async () => { throw new Error("connect refused"); },
            close: () => {}
        });
        await expect(initResources()).rejects.toThrow("connect refused");
        expect(listResources()[0].state).toBe("failed");
    });

    it("readiness reflects ready hook", async () => {
        let healthy = false;
        registerResource("queue", {
            close: () => {},
            ready: async () => healthy
        });
        await initResources();
        expect((await checkReadiness()).ready).toBe(false);
        healthy = true;
        expect((await checkReadiness()).ready).toBe(true);
    });

    it("runs onShutdown hooks in reverse order", async () => {
        const calls: string[] = [];
        onShutdown(async () => { calls.push("a"); });
        onShutdown(async () => { calls.push("b"); });
        await shutdown(undefined, { timeoutMs: 1000 });
        expect(calls).toEqual(["b", "a"]);
        expect(isShuttingDown()).toBe(true);
    });

    it("closes resources in reverse registration order", async () => {
        const closed: string[] = [];
        registerResource("first", { close: () => { closed.push("first"); } });
        registerResource("second", { close: () => { closed.push("second"); } });
        registerResource("third", { close: () => { closed.push("third"); } });
        await shutdown(undefined, { timeoutMs: 1000 });
        expect(closed).toEqual(["third", "second", "first"]);
    });

    it("readiness false during shutdown", async () => {
        registerResource("x", { close: () => {}, ready: () => true });
        await initResources();
        expect((await checkReadiness()).ready).toBe(true);
        await shutdown(undefined, { timeoutMs: 1000 });
        expect((await checkReadiness()).ready).toBe(false);
    });
});
