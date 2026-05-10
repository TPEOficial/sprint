import { EventEmitter } from "events";
import { onShutdown } from "../lifecycle";

export interface ServiceInstance {
    id: string;
    name: string;
    address: string;
    port: number;
    metadata?: Record<string, string>;
    /** Last heartbeat timestamp. */
    lastSeen: number;
    /** Resource state from registry side. */
    healthy: boolean;
}

export interface ServiceDiscoveryAdapter {
    register(instance: Omit<ServiceInstance, "lastSeen" | "healthy"> & { healthy?: boolean }): Promise<void>;
    deregister(id: string): Promise<void>;
    heartbeat(id: string): Promise<void>;
    discover(name: string): Promise<ServiceInstance[]>;
    /** Subscribe to changes for a given service name. Returns unsubscribe. */
    watch(name: string, handler: (instances: ServiceInstance[]) => void): Promise<() => Promise<void>>;
    close(): Promise<void>;
}

export interface InMemoryDiscoveryOptions {
    /** Heartbeat TTL in ms — instances older than this are unhealthy. Default: 30_000. */
    ttlMs?: number;
    /** Sweep interval to mark stale instances. Default: 5_000. 0 disables. */
    sweepMs?: number;
}

export class InMemoryDiscovery extends EventEmitter implements ServiceDiscoveryAdapter {
    private byName = new Map<string, Map<string, ServiceInstance>>();
    private watchers = new Map<string, Set<(i: ServiceInstance[]) => void>>();
    private ttlMs: number;
    private sweep: NodeJS.Timeout | null = null;

    constructor(options: InMemoryDiscoveryOptions = {}) {
        super();
        this.ttlMs = options.ttlMs ?? 30_000;
        const sweepMs = options.sweepMs ?? 5_000;
        if (sweepMs > 0) {
            this.sweep = setInterval(() => this.sweepStale(), sweepMs);
            this.sweep.unref?.();
        }
    };

    private notify(name: string): void {
        const subs = this.watchers.get(name);
        if (!subs?.size) return;
        const list = Array.from(this.byName.get(name)?.values() ?? []);
        for (const s of subs) try { s(list); } catch { /* swallow */ }
    };

    private sweepStale(): void {
        const now = Date.now();
        for (const [name, map] of this.byName) {
            let changed = false;
            for (const inst of map.values()) {
                const stale = (now - inst.lastSeen) > this.ttlMs;
                if (stale && inst.healthy) { inst.healthy = false; changed = true; }
            }
            if (changed) this.notify(name);
        }
    };

    async register(instance: Omit<ServiceInstance, "lastSeen" | "healthy"> & { healthy?: boolean }): Promise<void> {
        let map = this.byName.get(instance.name);
        if (!map) { map = new Map(); this.byName.set(instance.name, map); }
        map.set(instance.id, {
            ...instance,
            healthy: instance.healthy ?? true,
            lastSeen: Date.now()
        });
        this.notify(instance.name);
    };

    async deregister(id: string): Promise<void> {
        for (const [name, map] of this.byName) {
            if (map.delete(id)) this.notify(name);
        }
    };

    async heartbeat(id: string): Promise<void> {
        for (const [name, map] of this.byName) {
            const inst = map.get(id);
            if (inst) {
                inst.lastSeen = Date.now();
                const wasUnhealthy = !inst.healthy;
                inst.healthy = true;
                if (wasUnhealthy) this.notify(name);
                return;
            }
        }
    };

    async discover(name: string): Promise<ServiceInstance[]> {
        return Array.from(this.byName.get(name)?.values() ?? []).filter(i => i.healthy);
    };

    async watch(name: string, handler: (instances: ServiceInstance[]) => void): Promise<() => Promise<void>> {
        let set = this.watchers.get(name);
        if (!set) { set = new Set(); this.watchers.set(name, set); }
        set.add(handler);
        // Initial snapshot
        try { handler(await this.discover(name)); } catch { /* swallow */ }
        return async () => {
            set!.delete(handler);
            if (set!.size === 0) this.watchers.delete(name);
        };
    };

    async close(): Promise<void> {
        if (this.sweep) clearInterval(this.sweep);
        this.sweep = null;
        this.byName.clear();
        this.watchers.clear();
        this.removeAllListeners();
    };
}

export interface SelfRegisterOptions {
    /** Adapter to register against. Default: shared in-memory. */
    adapter?: ServiceDiscoveryAdapter;
    /** Heartbeat interval ms. Default: 10_000 */
    heartbeatMs?: number;
    /** Auto-deregister on shutdown. Default: true */
    autoDeregister?: boolean;
}

let sharedDiscovery: InMemoryDiscovery | null = null;
export function getDefaultDiscovery(): InMemoryDiscovery {
    if (!sharedDiscovery) sharedDiscovery = new InMemoryDiscovery();
    return sharedDiscovery;
};

export async function selfRegister(
    instance: Omit<ServiceInstance, "lastSeen" | "healthy">,
    options: SelfRegisterOptions = {}
): Promise<{ stop: () => Promise<void> }> {
    const adapter = options.adapter ?? getDefaultDiscovery();
    const heartbeatMs = options.heartbeatMs ?? 10_000;

    await adapter.register(instance);
    const heartbeat = setInterval(() => { adapter.heartbeat(instance.id).catch(() => {}); }, heartbeatMs);
    heartbeat.unref?.();

    const stop = async () => {
        clearInterval(heartbeat);
        await adapter.deregister(instance.id);
    };

    if (options.autoDeregister !== false) onShutdown(stop);

    return { stop };
};