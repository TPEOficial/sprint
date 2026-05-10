import { afterEach, describe, expect, it } from "@jest/globals";
import path from "path";
import { WorkerPool } from "../src/modules/workers";

const workerFile = path.resolve(__dirname, "fixtures/echo-worker.cjs");

describe("WorkerPool", () => {
    let pool: WorkerPool | null = null;
    afterEach(async () => {
        if (pool) await pool.close();
        pool = null;
    });

    it("runs a task and returns result", async () => {
        pool = new WorkerPool({ file: workerFile, size: 2, registerLifecycle: false });
        const result = await pool.run<{ echo: { hello: string } }>({ hello: "world" });
        expect(result.echo).toEqual({ hello: "world" });
    });

    it("computes in parallel across workers", async () => {
        pool = new WorkerPool({ file: workerFile, size: 4, registerLifecycle: false });
        const results = await Promise.all([
            pool.run<{ result: number }>({ compute: "square", n: 2 }),
            pool.run<{ result: number }>({ compute: "square", n: 3 }),
            pool.run<{ result: number }>({ compute: "square", n: 4 }),
            pool.run<{ result: number }>({ compute: "square", n: 5 })
        ]);
        expect(results.map(r => r.result)).toEqual([4, 9, 16, 25]);
    });

    it("propagates worker error as rejection", async () => {
        pool = new WorkerPool({ file: workerFile, size: 1, registerLifecycle: false });
        await expect(pool.run({ fail: true })).rejects.toThrow("intentional failure");
    });

    it("rejects when queue full (maxQueue)", async () => {
        pool = new WorkerPool({ file: workerFile, size: 1, maxQueue: 1, registerLifecycle: false });
        const slow = pool.run({ hello: 1 });
        const ok = pool.run({ hello: 2 });
        await expect(pool.run({ hello: 3 })).rejects.toThrow("queue full");
        await Promise.all([slow, ok]);
    });

    it("rejects new tasks after close", async () => {
        pool = new WorkerPool({ file: workerFile, size: 1, registerLifecycle: false });
        await pool.close();
        await expect(pool.run({ hello: 1 })).rejects.toThrow("closed");
        pool = null; // afterEach won't double-close
    });
});
