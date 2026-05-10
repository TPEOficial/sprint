import fs from "fs";
import { registerResource } from "../lifecycle";

export interface SecretProvider {
    /** Resolve secret value. Throws if required and missing. */
    get(key: string, options?: { required?: boolean; defaultValue?: string }): Promise<string | undefined> | string | undefined;
    /** Refresh from upstream (for rotated secrets). */
    refresh?(): Promise<void> | void;
    close?(): Promise<void> | void;
}

// ─── Env provider ──────────────────────────────────────────────────────────

export class EnvSecretProvider implements SecretProvider {
    private prefix: string;
    private source: Record<string, string | undefined>;
    constructor(options: { prefix?: string; source?: Record<string, string | undefined> } = {}) {
        this.prefix = options.prefix ?? "";
        this.source = options.source ?? process.env;
    };
    get(key: string, options: { required?: boolean; defaultValue?: string } = {}): string | undefined {
        const value = this.source[this.prefix + key];
        if (value === undefined || value === "") {
            if (options.required) throw new Error(`Secret "${key}" is required but not defined`);
            return options.defaultValue;
        }
        return value;
    };
};

// ─── File provider (.env style or JSON) ────────────────────────────────────

export interface FileSecretProviderOptions {
    /** Path to secrets file. */
    path: string;
    /** "env" (KEY=value lines) or "json". Default: inferred by extension. */
    format?: "env" | "json";
    /** Watch and reload on change. Default: false. */
    watch?: boolean;
}

export class FileSecretProvider implements SecretProvider {
    private path: string;
    private format: "env" | "json";
    private values: Record<string, string> = {};
    private watcher: fs.FSWatcher | null = null;

    constructor(options: FileSecretProviderOptions) {
        this.path = options.path;
        this.format = options.format ?? (options.path.endsWith(".json") ? "json" : "env");
        this.load();
        if (options.watch) {
            try {
                this.watcher = fs.watch(this.path, { persistent: false }, () => this.load());
            } catch { /* file may not exist */ }
        }
    };

    private load(): void {
        try {
            const raw = fs.readFileSync(this.path, "utf8");
            if (this.format === "json") this.values = Object.fromEntries(Object.entries(JSON.parse(raw)).map(([k, v]) => [k, String(v)]));
            else {
                const next: Record<string, string> = {};
                for (const line of raw.split(/\r?\n/)) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith("#")) continue;
                    const eq = trimmed.indexOf("=");
                    if (eq <= 0) continue;
                    const key = trimmed.slice(0, eq).trim();
                    let value = trimmed.slice(eq + 1).trim();
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
                    next[key] = value;
                }
                this.values = next;
            }
        } catch { /* keep previous on error */ }
    };

    get(key: string, options: { required?: boolean; defaultValue?: string } = {}): string | undefined {
        const value = this.values[key];
        if (value === undefined || value === "") {
            if (options.required) throw new Error(`Secret "${key}" is required but not defined`);
            return options.defaultValue;
        }
        return value;
    };

    async refresh(): Promise<void> { this.load(); };

    async close(): Promise<void> {
        this.watcher?.close();
        this.watcher = null;
    };
};

// ─── Memoized provider (cache + TTL) ───────────────────────────────────────

export interface MemoizedSecretProviderOptions {
    inner: SecretProvider;
    /** Cache TTL ms. Default: 60_000 */
    ttlMs?: number;
}

export class MemoizedSecretProvider implements SecretProvider {
    private cache = new Map<string, { value: string | undefined; expiresAt: number; }>();
    private ttlMs: number;
    constructor(private opts: MemoizedSecretProviderOptions) {
        this.ttlMs = opts.ttlMs ?? 60_000;
    };
    async get(key: string, options: { required?: boolean; defaultValue?: string; } = {}): Promise<string | undefined> {
        const now = Date.now();
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > now) {
            if (cached.value === undefined && options.required) throw new Error(`Secret "${key}" is required but not defined`);
            return cached.value ?? options.defaultValue;
        }
        const value = await Promise.resolve(this.opts.inner.get(key, { ...options, required: false }));
        this.cache.set(key, { value, expiresAt: now + this.ttlMs });
        if ((value === undefined || value === "") && options.required) throw new Error(`Secret "${key}" is required but not defined`);
        return value ?? options.defaultValue;
    };
    async refresh(): Promise<void> {
        this.cache.clear();
        await this.opts.inner.refresh?.();
    };
    async close(): Promise<void> {
        this.cache.clear();
        await this.opts.inner.close?.();
    };
};

// ─── Composite (cascading) ─────────────────────────────────────────────────

export class CompositeSecretProvider implements SecretProvider {
    constructor(private providers: SecretProvider[]) {}
    async get(key: string, options: { required?: boolean; defaultValue?: string } = {}): Promise<string | undefined> {
        for (const p of this.providers) {
            const value = await Promise.resolve(p.get(key));
            if (value !== undefined && value !== "") return value;
        }
        if (options.required) throw new Error(`Secret "${key}" is required but not defined`);
        return options.defaultValue;
    };
    async refresh(): Promise<void> {
        for (const p of this.providers) await p.refresh?.();
    };
    async close(): Promise<void> {
        for (const p of this.providers) await p.close?.();
    };
};

// ─── Public API ────────────────────────────────────────────────────────────

let active: SecretProvider | null = null;

export interface ConfigureSecretsOptions {
    provider: SecretProvider;
    /** Register on lifecycle. Default: true */
    registerLifecycle?: boolean;
}

export function configureSecrets(options: ConfigureSecretsOptions | SecretProvider): SecretProvider {
    const provider = "provider" in options ? options.provider : options;
    const register = "provider" in options ? (options.registerLifecycle !== false) : true;
    active = provider;
    if (register && provider.close) registerResource("secrets", { close: () => provider.close!() });
    return provider;
};

export async function secret(key: string, options?: { required?: boolean; defaultValue?: string; }): Promise<string | undefined> {
    if (!active) active = new EnvSecretProvider();
    return await Promise.resolve(active.get(key, options));
};

export function getActiveSecretProvider(): SecretProvider | null { return active; };