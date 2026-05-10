export interface JobOptions {
    /** Unique idempotency key. Duplicate enqueue with same key is ignored. */
    idempotencyKey?: string;
    /** Delay before processing (ms). */
    delay?: number;
    /** Max retry attempts on failure. Default: 3 */
    attempts?: number;
    /** Backoff strategy. Default: { type: "exponential", delay: 1000 } */
    backoff?: { type: "fixed" | "exponential"; delay: number; maxDelay?: number; };
    /** Job priority. Lower runs first. Default: 0 */
    priority?: number;
    /** Remove successful jobs after N seconds. Default: 0 (immediate) */
    removeOnComplete?: boolean | number;
    /** Remove failed jobs after N seconds. Default: false (keep) */
    removeOnFail?: boolean | number;
}

export interface Job<T = unknown> {
    id: string;
    name: string;
    data: T;
    attemptsMade: number;
    options: JobOptions;
    createdAt: number;
    processOn: number;
}

export type JobHandler<T = unknown, R = unknown> = (job: Job<T>) => Promise<R> | R;

export interface QueueAdapter<T = unknown> {
    name: string;
    add(jobName: string, data: T, options?: JobOptions): Promise<Job<T>>;
    process(handler: JobHandler<T>, concurrency?: number): void | Promise<void>;
    getDeadLetter(): Promise<Job<T>[]>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    close(): Promise<void>;
}

export interface PubSubAdapter {
    publish(channel: string, message: unknown): Promise<void>;
    subscribe(channel: string, handler: (message: any) => void | Promise<void>): Promise<() => Promise<void>>;
    close(): Promise<void>;
}