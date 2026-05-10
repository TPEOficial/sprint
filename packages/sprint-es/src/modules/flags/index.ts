import fs from "fs";
import { EventEmitter } from "events";

export type FlagValue = boolean | string | number | Record<string, unknown>;

export interface FlagContext {
    userId?: string;
    [key: string]: any;
}

export interface FlagProvider {
    /** Get flag value, evaluating any rules in context. */
    get<T extends FlagValue = boolean>(key: string, defaultValue: T, context?: FlagContext): Promise<T> | T;
    /** Subscribe to changes. Returns unsubscribe. */
    onChange?(handler: (changedKeys: string[]) => void): () => void;
    close?(): Promise<void>;
}

// ─── Static provider ───────────────────────────────────────────────────────

export class StaticFlagProvider implements FlagProvider {
    private flags: Record<string, FlagValue>;
    constructor(flags: Record<string, FlagValue>) { this.flags = flags; }
    get<T extends FlagValue = boolean>(key: string, defaultValue: T): T {
        return (key in this.flags ? this.flags[key] : defaultValue) as T;
    };
};

// ─── Env provider ──────────────────────────────────────────────────────────
// Reads from process.env. Bool flag SPRINT_FLAG_X = "true"/"false"/"1"/"0".

export interface EnvFlagProviderOptions {
    /** Prefix for env vars. Default: "SPRINT_FLAG_". */
    prefix?: string;
    /** Source object. Default: process.env. */
    source?: Record<string, string | undefined>;
}

export class EnvFlagProvider implements FlagProvider {
    private prefix: string;
    private source: Record<string, string | undefined>;
    constructor(options: EnvFlagProviderOptions = {}) {
        this.prefix = options.prefix ?? "SPRINT_FLAG_";
        this.source = options.source ?? process.env;
    };
    get<T extends FlagValue = boolean>(key: string, defaultValue: T): T {
        const raw = this.source[this.prefix + key.toUpperCase().replace(/[.-]/g, "_")];
        if (raw === undefined) return defaultValue;
        if (typeof defaultValue === "boolean") return (raw === "1" || raw.toLowerCase() === "true") as T;
        if (typeof defaultValue === "number") return Number(raw) as T;
        if (typeof defaultValue === "object") {
            try { return JSON.parse(raw) as T; }
            catch { return defaultValue; }
        }
        return raw as T;
    };
};

// ─── File provider with hot-reload ─────────────────────────────────────────

export interface FileFlagProviderOptions {
    path: string;
    /** Watch and reload on change. Default: true. */
    watch?: boolean;
}

export class FileFlagProvider extends EventEmitter implements FlagProvider {
    private path: string;
    private flags: Record<string, FlagValue> = {};
    private watcher: fs.FSWatcher | null = null;

    constructor(options: FileFlagProviderOptions) {
        super();
        this.path = options.path;
        this.load();
        if (options.watch !== false) {
            try {
                this.watcher = fs.watch(this.path, { persistent: false }, () => this.load());
            } catch { /* file may not exist yet */ }
        }
    };

    private load(): void {
        try {
            const raw = fs.readFileSync(this.path, "utf8");
            const next = JSON.parse(raw) as Record<string, FlagValue>;
            const changed = Object.keys({ ...this.flags, ...next }).filter(k => JSON.stringify(this.flags[k]) !== JSON.stringify(next[k]));
            this.flags = next;
            if (changed.length) this.emit("change", changed);
        } catch { /* keep previous on parse failure */ }
    };

    get<T extends FlagValue = boolean>(key: string, defaultValue: T): T {
        return (key in this.flags ? this.flags[key] : defaultValue) as T;
    };

    onChange(handler: (changedKeys: string[]) => void): () => void {
        this.on("change", handler);
        return () => this.off("change", handler);
    };

    async close(): Promise<void> {
        this.watcher?.close();
        this.watcher = null;
        this.removeAllListeners();
    };
};

// ─── Composite (cascading) provider ────────────────────────────────────────
// Tries providers in order; first defined value wins. Defaults still apply if none match.

export class CompositeFlagProvider extends EventEmitter implements FlagProvider {
    private providers: FlagProvider[];
    constructor(providers: FlagProvider[]) { super(); this.providers = providers; }
    async get<T extends FlagValue = boolean>(key: string, defaultValue: T, context?: FlagContext): Promise<T> {
        const sentinel = Symbol("missing");
        for (const p of this.providers) {
            const value = await Promise.resolve(p.get(key, sentinel as any, context));
            if (value !== (sentinel as any)) return value as T;
        }
        return defaultValue;
    };
    async close(): Promise<void> {
        for (const p of this.providers) try { await p.close?.(); } catch { /* ignore */ }
    };
};

// ─── Public API ────────────────────────────────────────────────────────────

let activeProvider: FlagProvider | null = null;

export function configureFlags(provider: FlagProvider): void {
    activeProvider = provider;
};

export async function flag<T extends FlagValue = boolean>(key: string, defaultValue: T, context?: FlagContext): Promise<T> {
    if (!activeProvider) return defaultValue;
    return await Promise.resolve(activeProvider.get(key, defaultValue, context));
};

export function getActiveProvider(): FlagProvider | null { return activeProvider; };