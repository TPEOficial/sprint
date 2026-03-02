export type { TelemetryProvider, TelemetryConfig, SentryConfig, DiscordConfig } from "./types";

export { initTelemetry, captureError, captureMessage, setUser } from "./telemetry";

export const providers = {
    SENTRY: "sentry",
    GLITCHTIP: "glitchtip",
    DISCORD: "discord",
    NONE: "none",
} as const;

export type Provider = typeof providers[keyof typeof providers];
