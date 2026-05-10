import { afterEach, describe, expect, it } from "@jest/globals";
import { MemoryQueue, MemoryPubSub } from "../src/modules/queue";

describe("MemoryQueue", () => {
    let q: MemoryQueue<any>;
    afterEach(() => q?.close());

    it("processes jobs in priority order", async () => {
        q = new MemoryQueue("t", { concurrency: 1 });
        const order: string[] = [];
        q.process(async (job) => { order.push(job.data as string); });
        await q.add("j", "low", { priority: 100 });
        await q.add("j", "high", { priority: 1 });
        await q.add("j", "mid", { priority: 50 });
        await new Promise(r => setTimeout(r, 400));
        expect(order).toEqual(["high", "mid", "low"]);
    });

    it("respects delay", async () => {
        q = new MemoryQueue("t", { concurrency: 1 });
        const start = Date.now();
        const times: number[] = [];
        q.process(async () => { times.push(Date.now() - start); });
        await q.add("j", "x", { delay: 200 });
        await new Promise(r => setTimeout(r, 400));
        expect(times[0]).toBeGreaterThanOrEqual(180);
    });

    it("retries failed jobs with backoff", async () => {
        q = new MemoryQueue("t", { concurrency: 1 });
        let attempts = 0;
        q.process(async () => {
            attempts++;
            if (attempts < 3) throw new Error("retry me");
        });
        await q.add("j", null, { attempts: 3, backoff: { type: "fixed", delay: 50 } });
        await new Promise(r => setTimeout(r, 500));
        expect(attempts).toBe(3);
    });

    it("moves to DLQ after max attempts", async () => {
        q = new MemoryQueue("t", { concurrency: 1 });
        q.process(async () => { throw new Error("always fail"); });
        await q.add("j", { id: 1 }, { attempts: 2, backoff: { type: "fixed", delay: 30 } });
        await new Promise(r => setTimeout(r, 500));
        const dlq = await q.getDeadLetter();
        expect(dlq).toHaveLength(1);
        expect(dlq[0].data).toEqual({ id: 1 });
    });

    it("idempotency key dedupes", async () => {
        q = new MemoryQueue("t", { concurrency: 1 });
        const seen: any[] = [];
        q.process(async (job) => { seen.push(job.data); });
        await q.add("j", "first", { idempotencyKey: "k1" });
        await q.add("j", "second", { idempotencyKey: "k1" });
        await new Promise(r => setTimeout(r, 300));
        expect(seen).toEqual(["first"]);
    });

    it("pause stops processing, resume continues", async () => {
        q = new MemoryQueue("t", { concurrency: 1 });
        let processed = 0;
        q.process(async () => { processed++; });
        await q.pause();
        await q.add("j", 1);
        await new Promise(r => setTimeout(r, 200));
        expect(processed).toBe(0);
        await q.resume();
        await new Promise(r => setTimeout(r, 200));
        expect(processed).toBe(1);
    });
});

describe("MemoryPubSub", () => {
    it("delivers to subscribers", async () => {
        const ps = new MemoryPubSub();
        const got: any[] = [];
        await ps.subscribe("ch", (m) => { got.push(m); });
        await ps.publish("ch", "hello");
        await ps.publish("ch", { foo: 1 });
        expect(got).toEqual(["hello", { foo: 1 }]);
        await ps.close();
    });

    it("unsubscribe stops delivery", async () => {
        const ps = new MemoryPubSub();
        const got: any[] = [];
        const unsub = await ps.subscribe("ch", (m) => { got.push(m); });
        await ps.publish("ch", 1);
        await unsub();
        await ps.publish("ch", 2);
        expect(got).toEqual([1]);
        await ps.close();
    });

    it("isolates channels", async () => {
        const ps = new MemoryPubSub();
        const a: any[] = [];
        const b: any[] = [];
        await ps.subscribe("a", (m) => { a.push(m); });
        await ps.subscribe("b", (m) => { b.push(m); });
        await ps.publish("a", 1);
        expect(a).toEqual([1]);
        expect(b).toEqual([]);
        await ps.close();
    });
});
