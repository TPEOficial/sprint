import { Router as ExpressRouter } from "express";

// Modules.
export { Sprint } from "./sprint";
export { defineMiddleware } from "./middleware";
export { __filename, __dirname } from "./utils";

// Types
export type { Handler, MiddlewareConfig, SprintOptions, LoadedMiddleware } from "./types";

// Router helper
export const Router = () => ExpressRouter();

// Default export
import { Sprint } from "./sprint";
export default Sprint;