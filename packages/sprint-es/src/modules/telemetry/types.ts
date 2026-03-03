export type Provider = "sentry" | "glitchtip" | "discord" | "none";

export type TelemetryProvider = Provider;

export interface TelemetryConfig {
    provider: Provider;
    dsn?: string;
    webhookUrl?: string;
    environment?: string;
    release?: string;
}

export interface SentryConfig {
    provider: "sentry" | "glitchtip";
    dsn: string;
    environment?: string;
    release?: string;
}

export interface DiscordConfig {
    provider: "discord";
    webhookUrl: string;
}
