import { describe, expect, it } from "@jest/globals";
import { CircuitBreaker, CircuitOpenError } from "../src/modules/circuit-breaker";

describe("CircuitBreaker", () => {
    it("trips open after failureThreshold", async () => {
        const fn = async () => { throw new Error("nope"); };
        const cb = new CircuitBreaker(fn, { failureThreshold: 3, name: "t" });

        for (let i = 0; i < 3; i++) await expect(cb.fire()).rejects.toThrow("nope");
        expect(cb.getState()).toBe("open");

        // Next call rejects fast with CircuitOpenError
        await expect(cb.fire()).rejects.toBeInstanceOf(CircuitOpenError);
    });

    it("resets to half-open after resetTimeoutMs", async () => {
        const fn = async () => { throw new Error("err"); };
        const cb = new CircuitBreaker(fn, { failureThreshold: 1, resetTimeoutMs: 50 });
        await expect(cb.fire()).rejects.toThrow();
        expect(cb.getState()).toBe("open");
        await new Promise(r => setTimeout(r, 80));
        // Trigger maybeHalfOpen
        await expect(cb.fire()).rejects.toThrow(); // half-open → fails → open again
        expect(cb.getState()).toBe("open");
    });

    it("closes after successThreshold in half-open", async () => {
        let shouldFail = true;
        const fn = async () => {
            if (shouldFail) throw new Error("x");
            return 42;
        };
        const cb = new CircuitBreaker(fn, { failureThreshold: 1, successThreshold: 2, resetTimeoutMs: 30 });

        await expect(cb.fire()).rejects.toThrow();
        expect(cb.getState()).toBe("open");

        await new Promise(r => setTimeout(r, 50));
        shouldFail = false;
        const r1 = await cb.fire();
        expect(r1).toBe(42);
        expect(cb.getState()).toBe("half-open");
        const r2 = await cb.fire();
        expect(r2).toBe(42);
        expect(cb.getState()).toBe("closed");
    });

    it("uses fallback when open", async () => {
        const cb = new CircuitBreaker(async () => { throw new Error("e"); }, {
            failureThreshold: 1,
            fallback: () => "fallback-value"
        });
        await expect(cb.fire()).resolves.toBe("fallback-value"); // first call fails, fallback used
        expect(cb.getState()).toBe("open");
        await expect(cb.fire()).resolves.toBe("fallback-value");
    });

    it("respects isFailure filter", async () => {
        const cb = new CircuitBreaker(async () => { throw new Error("ignore"); }, {
            failureThreshold: 2,
            isFailure: (err) => (err as Error).message !== "ignore"
        });
        for (let i = 0; i < 5; i++) await expect(cb.fire()).rejects.toThrow("ignore");
        expect(cb.getState()).toBe("closed");
    });

    it("emits state events", async () => {
        const cb = new CircuitBreaker(async () => { throw new Error("e"); }, { failureThreshold: 1, resetTimeoutMs: 20 });
        const events: string[] = [];
        cb.on("open", () => events.push("open"));
        cb.on("halfOpen", () => events.push("halfOpen"));
        cb.on("close", () => events.push("close"));

        await expect(cb.fire()).rejects.toThrow();
        await new Promise(r => setTimeout(r, 40));
        cb.forceClose();

        expect(events).toContain("open");
        expect(events).toContain("close");
    });

    it("times out long calls when callTimeoutMs is set", async () => {
        const cb = new CircuitBreaker(async () => new Promise(r => setTimeout(r, 200)), { callTimeoutMs: 50 });
        await expect(cb.fire()).rejects.toThrow("timeout");
    });
});
