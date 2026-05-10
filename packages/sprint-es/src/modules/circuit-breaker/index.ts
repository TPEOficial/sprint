import { EventEmitter } from "events";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
    /** Failures before opening. Default: 5 */
    failureThreshold?: number;
    /** Successes in half-open before closing. Default: 2 */
    successThreshold?: number;
    /** Time the circuit stays open before transitioning to half-open (ms). Default: 30_000 */
    resetTimeoutMs?: number;
    /** Per-call timeout (ms). 0 disables. Default: 0 */
    callTimeoutMs?: number;
    /** Optional fallback when open. */
    fallback?: (...args: any[]) => any;
    /** Optional error filter — returning true counts as a failure. Default: any thrown error. */
    isFailure?: (err: unknown) => boolean;
    /** Name for logs and events. */
    name?: string;
}

export interface CircuitBreakerStats {
    state: CircuitState;
    failures: number;
    successes: number;
    consecutiveSuccesses: number;
    lastFailureAt: number | null;
    openedAt: number | null;
}

export class CircuitOpenError extends Error {
    public readonly code = "CIRCUIT_OPEN";
    constructor(name: string) {
        super(`Circuit "${name}" is open`);
        this.name = "CircuitOpenError";
    }
}

export class CircuitBreaker<TArgs extends any[], TResult> extends EventEmitter {
    public readonly name: string;
    private state: CircuitState = "closed";
    private failures = 0;
    private successes = 0;
    private consecutiveSuccesses = 0;
    private lastFailureAt: number | null = null;
    private openedAt: number | null = null;
    private opts: Required<Omit<CircuitBreakerOptions, "fallback" | "isFailure" | "name">> & Pick<CircuitBreakerOptions, "fallback" | "isFailure">;

    constructor(private fn: (...args: TArgs) => Promise<TResult> | TResult, options: CircuitBreakerOptions = {}) {
        super();
        this.name = options.name ?? "circuit";
        this.opts = {
            failureThreshold: options.failureThreshold ?? 5,
            successThreshold: options.successThreshold ?? 2,
            resetTimeoutMs: options.resetTimeoutMs ?? 30_000,
            callTimeoutMs: options.callTimeoutMs ?? 0,
            fallback: options.fallback,
            isFailure: options.isFailure
        };
    };

    private maybeHalfOpen(): void {
        if (this.state !== "open") return;
        if (this.openedAt === null) return;
        if (Date.now() - this.openedAt >= this.opts.resetTimeoutMs) {
            this.state = "half-open";
            this.consecutiveSuccesses = 0;
            this.emit("halfOpen", this.snapshot());
        }
    };

    private trip(): void {
        const wasOpen = this.state === "open";
        this.state = "open";
        this.openedAt = Date.now();
        if (!wasOpen) this.emit("open", this.snapshot());
    };

    private close(): void {
        const wasClosed = this.state === "closed";
        this.state = "closed";
        this.failures = 0;
        this.openedAt = null;
        this.consecutiveSuccesses = 0;
        if (!wasClosed) this.emit("close", this.snapshot());
    };

    private recordSuccess(): void {
        this.successes++;
        this.consecutiveSuccesses++;
        if (this.state === "half-open" && this.consecutiveSuccesses >= this.opts.successThreshold) this.close();
        else if (this.state === "closed") this.failures = 0;
    };

    private recordFailure(err: unknown): void {
        if (this.opts.isFailure && !this.opts.isFailure(err)) return;
        this.failures++;
        this.lastFailureAt = Date.now();
        this.consecutiveSuccesses = 0;
        this.emit("failure", err, this.snapshot());

        if (this.state === "half-open") this.trip();
        else if (this.state === "closed" && this.failures >= this.opts.failureThreshold) this.trip();
    };

    async fire(...args: TArgs): Promise<TResult> {
        this.maybeHalfOpen();
        if (this.state === "open") {
            this.emit("rejected", this.snapshot());
            if (this.opts.fallback) return this.opts.fallback(...args);
            throw new CircuitOpenError(this.name);
        };

        const exec = async () => {
            const result = await this.fn(...args);
            this.recordSuccess();
            return result;
        };

        try {
            if (this.opts.callTimeoutMs > 0) {
                return await Promise.race([
                    exec(),
                    new Promise<TResult>((_, reject) => setTimeout(() => reject(new Error(`Circuit "${this.name}" call timeout`)), this.opts.callTimeoutMs))
                ]);
            }
            return await exec();
        } catch (err) {
            this.recordFailure(err);
            if (this.opts.fallback) return this.opts.fallback(...args);
            throw err;
        }
    };

    snapshot(): CircuitBreakerStats {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            consecutiveSuccesses: this.consecutiveSuccesses,
            lastFailureAt: this.lastFailureAt,
            openedAt: this.openedAt
        };
    };

    getState(): CircuitState { return this.state; };
    forceOpen(): void { this.trip(); };
    forceClose(): void { this.close(); };
};

export function createCircuitBreaker<TArgs extends any[], TResult>(
    fn: (...args: TArgs) => Promise<TResult> | TResult,
    options?: CircuitBreakerOptions
): CircuitBreaker<TArgs, TResult> {
    return new CircuitBreaker(fn, options);
};