import { z } from "zod";

export type ZodSchema = z.ZodType<any>;

export interface ZodMiddlewareOptions {
    body?: ZodSchema;
    queryParams?: ZodSchema;
    params?: ZodSchema;
}
