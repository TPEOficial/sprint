import { Router as ExpressRouter } from "express";

// Modules.
export { Sprint, isDevelopment, isProduction } from "./sprint";
export { defineMiddleware } from "./middleware";
export { __filename, __dirname } from "./utils";

// Types
export type { Handler, AsyncRequestHandler, MiddlewareConfig, SprintOptions, LoadedMiddleware, AuthorizationSource, SprintRequest } from "./types";

// Router helper
export const Router = () => ExpressRouter();

// Default import
import { Sprint } from "./sprint";
export default Sprint;