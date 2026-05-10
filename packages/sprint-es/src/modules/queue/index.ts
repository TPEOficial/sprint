import { registerResource } from "../lifecycle";
import { MemoryQueue, MemoryPubSub } from "./memory";
import { BullMQQueue, BullMQPubSub } from "./bullmq";
import type { QueueAdapter, PubSubAdapter, Job, JobOptions, JobHandler } from "./types";

export { MemoryQueue, MemoryPubSub } from "./memory";
export { BullMQQueue, BullMQPubSub } from "./bullmq";
export type { Job, JobOptions, JobHandler, QueueAdapter, PubSubAdapter } from "./types";

export interface DefineQueueOptions<T = unknown> {
    name: string;
    adapter?: QueueAdapter<T>;
    /** Register on lifecycle. Default: true */
    registerLifecycle?: boolean;
}

const queues = new Map<string, QueueAdapter<any>>();
const pubsubs = new Map<string, PubSubAdapter>();

export function defineQueue<T = unknown>(options: DefineQueueOptions<T>): QueueAdapter<T> {
    if (queues.has(options.name)) throw new Error(`Queue "${options.name}" already defined`);
    const adapter = options.adapter ?? new MemoryQueue<T>(options.name);
    queues.set(options.name, adapter);

    if (options.registerLifecycle !== false) {
        registerResource(`queue:${options.name}`, {
            close: () => adapter.close()
        });
    }

    return adapter;
};

export function getQueue<T = unknown>(name: string): QueueAdapter<T> | undefined {
    return queues.get(name) as QueueAdapter<T> | undefined;
};

export function listQueues(): string[] {
    return Array.from(queues.keys());
};

export interface DefinePubSubOptions {
    name: string;
    adapter?: PubSubAdapter;
    registerLifecycle?: boolean;
}

export function definePubSub(options: DefinePubSubOptions): PubSubAdapter {
    if (pubsubs.has(options.name)) throw new Error(`PubSub "${options.name}" already defined`);
    const adapter = options.adapter ?? new MemoryPubSub();
    pubsubs.set(options.name, adapter);

    if (options.registerLifecycle !== false) {
        registerResource(`pubsub:${options.name}`, {
            close: () => adapter.close()
        });
    }

    return adapter;
};

export function getPubSub(name: string): PubSubAdapter | undefined {
    return pubsubs.get(name);
};