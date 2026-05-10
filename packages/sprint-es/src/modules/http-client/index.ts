import { CircuitBreaker, CircuitBreakerOptions } from "../circuit-breaker";
import { getContext } from "../context";

export interface HttpClientOptions {
    /** Base URL prefix. */
    baseUrl?: string;
    /** Default headers. */
    headers?: Record<string, string>;
    /** Per-request timeout (ms). Default: 10_000 */
    timeoutMs?: number;
    /** Max retries on transient failure. Default: 0 */
    retries?: number;
    /** Backoff between retries. Default: { type: "exponential", delay: 200, maxDelay: 5000 } */
    backoff?: { type: "fixed" | "exponential"; delay: number; maxDelay?: number };
    /** Circuit breaker config. Pass false to disable. Default: disabled. */
    circuit?: CircuitBreakerOptions | false;
    /** Forward traceparent/X-Request-ID from current context. Default: true */
    propagateTrace?: boolean;
    /** Treat these statuses as failures (retried + counted by circuit). Default: 5xx and 408/429. */
    isRetryable?: (status: number) => boolean;
    /** Custom fetch (for testing). Default: globalThis.fetch */
    fetch?: typeof fetch;
}

export interface HttpRequestOptions extends Omit<RequestInit, "body" | "headers"> {
    headers?: Record<string, string>;
    /** JSON body — auto-serialized + sets Content-Type. */
    json?: unknown;
    /** Raw body (string | Buffer | ReadableStream). */
    body?: any;
    /** Override timeout for this request (ms). */
    timeoutMs?: number;
    /** Override retries. */
    retries?: number;
}

export interface HttpResponse<T = unknown> {
    status: number;
    statusText: string;
    headers: Headers;
    ok: boolean;
    /** Lazy JSON parse. */
    json(): Promise<T>;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
    /** Raw underlying Response. */
    raw: Response;
}

export class HttpError extends Error {
    public readonly status: number;
    public readonly statusText: string;
    public readonly response: HttpResponse;
    constructor(response: HttpResponse) {
        super(`HTTP ${response.status} ${response.statusText}`);
        this.name = "HttpError";
        this.status = response.status;
        this.statusText = response.statusText;
        this.response = response;
    }
}

function computeBackoff(attempt: number, opts: { type: "fixed" | "exponential"; delay: number; maxDelay?: number }): number {
    if (opts.type === "fixed") return opts.delay;
    const exp = opts.delay * Math.pow(2, attempt - 1);
    return opts.maxDelay ? Math.min(exp, opts.maxDelay) : exp;
};

export interface HttpClient {
    request<T = unknown>(method: string, path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    get<T = unknown>(path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    post<T = unknown>(path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    put<T = unknown>(path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    patch<T = unknown>(path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    delete<T = unknown>(path: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    /** Returns the inner CircuitBreaker if enabled. */
    readonly circuit: CircuitBreaker<any[], any> | null;
}

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
    const baseUrl = options.baseUrl ?? "";
    const defaultHeaders = options.headers ?? {};
    const timeoutMs = options.timeoutMs ?? 10_000;
    const retries = options.retries ?? 0;
    const backoff = options.backoff ?? { type: "exponential", delay: 200, maxDelay: 5_000 };
    const propagateTrace = options.propagateTrace !== false;
    const isRetryable = options.isRetryable ?? ((s: number) => s >= 500 || s === 408 || s === 429);
    const fetchImpl = options.fetch ?? (globalThis as any).fetch;
    if (!fetchImpl) throw new Error("createHttpClient: global fetch not available. Pass options.fetch or use Node 18+.");

    const buildUrl = (path: string): string => {
        if (/^https?:\/\//i.test(path)) return path;
        if (!baseUrl) return path;
        return baseUrl.replace(/\/$/, "") + (path.startsWith("/") ? path : "/" + path);
    };

    const doFetch = async <T>(method: string, path: string, opts: HttpRequestOptions): Promise<HttpResponse<T>> => {
        const url = buildUrl(path);
        const headers: Record<string, string> = { ...defaultHeaders, ...(opts.headers ?? {}) };
        if (propagateTrace) {
            const ctx = getContext();
            if (ctx) {
                if (ctx.traceparent && !headers["traceparent"]) headers["traceparent"] = ctx.traceparent;
                if (ctx.tracestate && !headers["tracestate"]) headers["tracestate"] = ctx.tracestate;
                if (ctx.requestId && !headers["x-request-id"]) headers["x-request-id"] = ctx.requestId;
            }
        }

        let body: any = opts.body;
        if (opts.json !== undefined) {
            body = JSON.stringify(opts.json);
            if (!headers["content-type"] && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
        }

        const reqTimeout = opts.timeoutMs ?? timeoutMs;
        const reqRetries = opts.retries ?? retries;

        let attempt = 0;
        let lastError: unknown;
        while (attempt <= reqRetries) {
            attempt++;
            const controller = new AbortController();
            const timer = reqTimeout > 0 ? setTimeout(() => controller.abort(), reqTimeout) : null;
            timer?.unref?.();
            try {
                const init: RequestInit = {
                    ...opts,
                    method,
                    headers,
                    body,
                    signal: opts.signal ?? controller.signal
                };
                const raw = await fetchImpl(url, init);
                if (timer) clearTimeout(timer);

                const response: HttpResponse<T> = {
                    status: raw.status,
                    statusText: raw.statusText,
                    headers: raw.headers,
                    ok: raw.ok,
                    json: () => raw.json() as Promise<T>,
                    text: () => raw.text(),
                    arrayBuffer: () => raw.arrayBuffer(),
                    raw
                };

                if (!response.ok && isRetryable(response.status) && attempt <= reqRetries) {
                    await new Promise(r => setTimeout(r, computeBackoff(attempt, backoff)));
                    continue;
                }

                if (!response.ok) throw new HttpError(response);
                return response;
            } catch (err) {
                if (timer) clearTimeout(timer);
                lastError = err;
                if (attempt > reqRetries) throw err;
                if (err instanceof HttpError && !isRetryable(err.status)) throw err;
                await new Promise(r => setTimeout(r, computeBackoff(attempt, backoff)));
            }
        }
        throw lastError ?? new Error("HTTP request failed");
    };

    let circuit: CircuitBreaker<any[], any> | null = null;
    if (options.circuit !== false && options.circuit !== undefined) {
        circuit = new CircuitBreaker(
            (method: string, path: string, opts: HttpRequestOptions) => doFetch(method, path, opts),
            { name: "http-client", ...options.circuit }
        );
    }

    const request = <T = unknown>(method: string, path: string, opts: HttpRequestOptions = {}): Promise<HttpResponse<T>> => {
        return circuit ? circuit.fire(method, path, opts) : doFetch<T>(method, path, opts);
    };

    return {
        request,
        get: (path, opts) => request("GET", path, opts),
        post: (path, opts) => request("POST", path, opts),
        put: (path, opts) => request("PUT", path, opts),
        patch: (path, opts) => request("PATCH", path, opts),
        delete: (path, opts) => request("DELETE", path, opts),
        get circuit() { return circuit; }
    };
};