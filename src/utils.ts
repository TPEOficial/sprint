import path from "path";

export const isDev = process.argv.includes("--dev");
export const isVerbose = process.argv.includes("--verbose");

let __filename: string;
let __dirname: string;

try {
    // @ts-ignore
    __filename = __filename || new URL(import.meta.url).pathname;
    // @ts-ignore
    __dirname = __dirname || path.dirname(__filename);
} catch {
    __dirname = path.resolve();
    __filename = path.join(__dirname, "index.js");
}

export { __filename, __dirname };

/**
 * Matches a route path against a pattern.
 * Supports: exact match, "*" (single segment), "**" (all nested)
 */
export function matchPattern(pattern: string, routePath: string): boolean {
    const normalizedPattern = pattern.replace(/\/$/, "") || "/";
    const normalizedRoute = routePath.replace(/\/$/, "") || "/";

    if (normalizedPattern === normalizedRoute) return true;

    const regexPattern = normalizedPattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "{{DOUBLE}}")
        .replace(/\*/g, "[^/]+")
        .replace(/{{DOUBLE}}/g, ".*");

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(normalizedRoute);
};

/**
 * Check if a route matches any of the given patterns
 */
export function matchesPatterns(patterns: string[], routePath: string): boolean {
    return patterns.some(pattern => matchPattern(pattern, routePath));
};

/**
 * Strips route group folders (folders wrapped in parentheses) from a path.
 * Route groups are used for organization only and don't affect the URL.
 * Example: "(auth)/login" -> "/login"
 * Example: "(group)/(subgroup)/api/users" -> "/api/users"
 */
export function stripRouteGroups(routePath: string): string {
    return routePath
        .split("/")
        .filter(segment => !(/^\(.+\)$/.test(segment)))
        .join("/") || "/";
};