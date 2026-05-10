import { Worker } from "worker_threads";
import path from "path";
import { registerResource } from "../lifecycle";

export interface WorkerPoolOptions {
    /** Path to worker file (must export message handler). Absolute or relative to cwd. */
    file: string;
    /** Pool size. Default: max(1, cpus - 1) */
    size?: number;
    /** Max tasks queued before backpressure. Default: 1000 */
    maxQueue?: number;
    /** Worker init data passed to workerData. */
    workerData?: any;
    /** Register on lifecycle. Default: true */
    registerLifecycle?: boolean;
    /** Pool name. Default: file basename. */
    name?: string;
}

interface PendingTask {
    resolve: (v: any) => void;
    reject: (e: Error) => void;
    payload: any;
}

interface PoolWorker {
    worker: Worker;
    busy: boolean;
    current: PendingTask | null;
}

export class WorkerPool {
    private workers: PoolWorker[] = [];
    private queue: PendingTask[] = [];
    private maxQueue: number;
    private closed = false;

    constructor(options: WorkerPoolOptions) {
        const cpus = require("os").cpus().length;
        const size = options.size ?? Math.max(1, cpus - 1);
        this.maxQueue = options.maxQueue ?? 1000;
        const file = path.isAbsolute(options.file) ? options.file : path.resolve(process.cwd(), options.file);

        for (let i = 0; i < size; i++) {
            const worker = new Worker(file, { workerData: options.workerData });
            const pw: PoolWorker = { worker, busy: false, current: null };
            worker.on("message", (msg: any) => {
                const task = pw.current;
                pw.current = null;
                pw.busy = false;
                if (task) {
                    if (msg && msg.__error) task.reject(new Error(msg.__error));
                    else task.resolve(msg);
                }
                this.dispatch();
            });
            worker.on("error", (err) => {
                if (pw.current) pw.current.reject(err);
                pw.current = null;
                pw.busy = false;
                this.dispatch();
            });
            this.workers.push(pw);
        }

        if (options.registerLifecycle !== false) {
            registerResource(`worker-pool:${options.name ?? path.basename(options.file)}`, {
                close: () => this.close()
            });
        }
    };

    private dispatch(): void {
        if (this.closed) return;
        for (const pw of this.workers) {
            if (pw.busy || this.queue.length === 0) continue;
            const task = this.queue.shift()!;
            pw.busy = true;
            pw.current = task;
            pw.worker.postMessage(task.payload);
        }
    };

    run<T = any>(payload: any): Promise<T> {
        if (this.closed) return Promise.reject(new Error("WorkerPool is closed"));
        if (this.queue.length >= this.maxQueue) return Promise.reject(new Error("WorkerPool queue full"));
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ resolve, reject, payload });
            this.dispatch();
        });
    };

    async close(): Promise<void> {
        this.closed = true;
        for (const t of this.queue) t.reject(new Error("WorkerPool closed"));
        this.queue = [];
        await Promise.all(this.workers.map(pw => pw.worker.terminate()));
    };

    get size(): number { return this.workers.length; };
    get queued(): number { return this.queue.length; };
    get active(): number { return this.workers.filter(w => w.busy).length; };
};

export function defineWorkerPool(options: WorkerPoolOptions): WorkerPool {
    return new WorkerPool(options);
};