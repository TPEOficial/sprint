import { registerResource } from "../lifecycle";

export interface CacheAdapter {
    get<T = unknown>(key: string): Promise<T | null>;
    set(key: string, value: unknown, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<boolean>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    close?(): Promise<void>;
}

interface MemoryEntry { value: unknown; expiresAt: number | null; lastUsed: number; }

export interface MemoryCacheOptions {
    /** Max entries before LRU eviction. Default: 1000 */
    maxEntries?: number;
    /** Default TTL ms. Default: 0 (no expiry) */
    defaultTtlMs?: number;
    /** Sweep interval ms for expired entries. Default: 60_000. Set 0 to disable. */
    sweepIntervalMs?: number;
}

export class MemoryCache implements CacheAdapter {
    private store = new Map<string, MemoryEntry>();
    private timer: NodeJS.Timeout | null = null;
    private maxEntries: number;
    private defaultTtl: number;

    constructor(options: MemoryCacheOptions = {}) {
        this.maxEntries = options.maxEntries ?? 1000;
        this.defaultTtl = options.defaultTtlMs ?? 0;
        const sweepInterval = options.sweepIntervalMs ?? 60_000;
        if (sweepInterval > 0) {
            this.timer = setInterval(() => this.sweep(), sweepInterval);
            this.timer.unref?.();
        }
    };

    private sweep(): void {
        const now = Date.now();
        for (const [k, v] of this.store) if (v.expiresAt !== null && v.expiresAt <= now) this.store.delete(k);
    };

    private evictIfNeeded(): void {
        if (this.store.size <= this.maxEntries) return;
        let oldestKey: string | null = null;
        let oldestUsed = Infinity;
        for (const [k, v] of this.store) {
            if (v.lastUsed < oldestUsed) { oldestUsed = v.lastUsed; oldestKey = k; }
        }
        if (oldestKey) this.store.delete(oldestKey);
    };

    async get<T = unknown>(key: string): Promise<T | null> {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return null;
        }
        entry.lastUsed = Date.now();
        return entry.value as T;
    };

    async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
        const ttl = ttlMs ?? this.defaultTtl;
        const expiresAt = ttl > 0 ? Date.now() + ttl : null;
        this.store.set(key, { value, expiresAt, lastUsed: Date.now() });
        this.evictIfNeeded();
    };

    async delete(key: string): Promise<boolean> {
        return this.store.delete(key);
    };

    async has(key: string): Promise<boolean> {
        const entry = this.store.get(key);
        if (!entry) return false;
        if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return false;
        }
        return true;
    };

    async clear(): Promise<void> {
        this.store.clear();
    };

    async close(): Promise<void> {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.store.clear();
    };
};

export interface RedisCacheOptions {
    /** Pre-built ioredis-compatible client. */
    client: any;
    /** Key prefix. Default: "sprint:cache:" */
    prefix?: string;
    /** Default TTL ms. Default: 0 (no expiry) */
    defaultTtlMs?: number;
}

export class RedisCache implements CacheAdapter {
    private client: any;
    private prefix: string;
    private defaultTtl: number;

    constructor(options: RedisCacheOptions) {
        if (!options.client) throw new Error("RedisCache: 'client' is required (ioredis-compatible)");
        this.client = options.client;
        this.prefix = options.prefix ?? "sprint:cache:";
        this.defaultTtl = options.defaultTtlMs ?? 0;
    };

    private k(key: string): string { return this.prefix + key; }

    async get<T = unknown>(key: string): Promise<T | null> {
        const raw = await this.client.get(this.k(key));
        if (raw == null) return null;
        try { return JSON.parse(raw) as T; }
        catch { return raw as unknown as T; }
    };

    async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
        const ttl = ttlMs ?? this.defaultTtl;
        const serialized = JSON.stringify(value);
        if (ttl > 0) await this.client.set(this.k(key), serialized, "PX", ttl);
        else await this.client.set(this.k(key), serialized);
    };

    async delete(key: string): Promise<boolean> {
        const n = await this.client.del(this.k(key));
        return n > 0;
    };

    async has(key: string): Promise<boolean> {
        const n = await this.client.exists(this.k(key));
        return n > 0;
    };

    async clear(): Promise<void> {
        const stream = this.client.scanStream?.({ match: this.prefix + "*" });
        if (!stream) {
            const keys: string[] = await this.client.keys(this.prefix + "*");
            if (keys.length) await this.client.del(...keys);
            return;
        }
        await new Promise<void>((resolve, reject) => {
            stream.on("data", async (keys: string[]) => {
                if (keys.length) await this.client.del(...keys);
            });
            stream.on("end", () => resolve());
            stream.on("error", reject);
        });
    };

    async close(): Promise<void> {
        if (typeof this.client.quit === "function") await this.client.quit();
    };
};

export interface DefineCacheOptions {
    name?: string;
    adapter: CacheAdapter;
    /** Register on lifecycle for graceful shutdown. Default: true */
    registerLifecycle?: boolean;
}

export function defineCache(options: DefineCacheOptions): CacheAdapter {
    const name = options.name ?? "cache";
    const adapter = options.adapter;
    if (options.registerLifecycle !== false) {
        registerResource(`cache:${name}`, {
            close: async () => { await adapter.close?.(); }
        });
    }
    return adapter;
};