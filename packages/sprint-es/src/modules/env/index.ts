import type { ZodSchema } from "zod";

export interface DefineEnvOptions<T> {
    schema: ZodSchema<T>;
    /** Source object. Default: process.env */
    source?: Record<string, string | undefined>;
    /** Exit on validation failure. Default: true */
    exitOnFail?: boolean;
    /** Logger. Default: console */
    logger?: { error: (...args: any[]) => void; };
}

export function defineEnv<T>(options: DefineEnvOptions<T>): T {
    const source = options.source ?? process.env;
    const exitOnFail = options.exitOnFail ?? true;
    const log = options.logger ?? console;

    const result = options.schema.safeParse(source);
    if (!result.success) {
        log.error("[Sprint] Environment validation failed:");
        for (const issue of result.error.issues) {
            log.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        }
        if (exitOnFail) process.exit(1);
        throw new Error("Environment validation failed");
    }

    return result.data;
};