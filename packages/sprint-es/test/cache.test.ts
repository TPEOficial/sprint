import { afterEach, describe, expect, it } from "@jest/globals";
import { MemoryCache } from "../src/modules/cache";

describe("MemoryCache", () => {
    let cache: MemoryCache;
    afterEach(() => cache?.close());

    it("stores and retrieves values", async () => {
        cache = new MemoryCache();
        await cache.set("k", "v");
        expect(await cache.get("k")).toBe("v");
        expect(await cache.has("k")).toBe(true);
    });

    it("returns null for missing keys", async () => {
        cache = new MemoryCache();
        expect(await cache.get("missing")).toBeNull();
        expect(await cache.has("missing")).toBe(false);
    });

    it("expires entries after TTL", async () => {
        cache = new MemoryCache({ sweepIntervalMs: 0 });
        await cache.set("k", "v", 50);
        expect(await cache.get("k")).toBe("v");
        await new Promise(r => setTimeout(r, 80));
        expect(await cache.get("k")).toBeNull();
    });

    it("evicts oldest LRU entry when over maxEntries", async () => {
        cache = new MemoryCache({ maxEntries: 2, sweepIntervalMs: 0 });
        await cache.set("a", 1);
        await new Promise(r => setTimeout(r, 5));
        await cache.set("b", 2);
        await new Promise(r => setTimeout(r, 5));
        await cache.set("c", 3);
        expect(await cache.get("a")).toBeNull();
        expect(await cache.get("b")).toBe(2);
        expect(await cache.get("c")).toBe(3);
    });

    it("clear empties cache", async () => {
        cache = new MemoryCache({ sweepIntervalMs: 0 });
        await cache.set("a", 1);
        await cache.clear();
        expect(await cache.get("a")).toBeNull();
    });

    it("delete returns boolean", async () => {
        cache = new MemoryCache({ sweepIntervalMs: 0 });
        await cache.set("a", 1);
        expect(await cache.delete("a")).toBe(true);
        expect(await cache.delete("a")).toBe(false);
    });
});
