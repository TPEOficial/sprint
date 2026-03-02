import type { TelemetryConfig } from "./types";

let currentConfig: TelemetryConfig | null = null;
let sentryInitialized = false;

export function initTelemetry(config: TelemetryConfig): void {
    currentConfig = config;

    if (config.provider === "sentry" || config.provider === "glitchtip") {
        if (config.dsn) {
            import("@sentry/node").then((Sentry) => {
                Sentry.init({
                    dsn: config.dsn,
                    environment: config.environment || process.env.NODE_ENV || "development",
                    release: config.release,
                    integrations: [
                        Sentry.httpIntegration(),
                    ],
                });
                sentryInitialized = true;
            }).catch((err) => {
                console.error("Failed to initialize Sentry:", err);
            });
        }
    }
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
    if (!currentConfig || currentConfig.provider === "none") {
        console.error("[Telemetry] Error (disabled):", error.message);
        return;
    }

    if (currentConfig.provider === "sentry" || currentConfig.provider === "glitchtip") {
        if (sentryInitialized) {
            import("@sentry/node").then((Sentry) => {
                Sentry.captureException(error, {
                    extra: context,
                });
            }).catch(() => {});
        }
    } else if (currentConfig.provider === "discord") {
        if (currentConfig.webhookUrl) {
            sendDiscordWebhook(error, currentConfig.webhookUrl, context);
        }
    }
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: Record<string, unknown>): void {
    if (!currentConfig || currentConfig.provider === "none") {
        return;
    }

    if (currentConfig.provider === "sentry" || currentConfig.provider === "glitchtip") {
        if (sentryInitialized) {
            import("@sentry/node").then((Sentry) => {
                Sentry.captureMessage(message, level, {
                    extra: context,
                });
            }).catch(() => {});
        }
    }
}

export function setUser(user: { id: string; email?: string; username?: string }): void {
    if (!currentConfig || currentConfig.provider === "none") {
        return;
    }

    if (currentConfig.provider === "sentry" || currentConfig.provider === "glitchtip") {
        if (sentryInitialized) {
            import("@sentry/node").then((Sentry) => {
                Sentry.setUser(user);
            }).catch(() => {});
        }
    }
}

async function sendDiscordWebhook(error: Error, webhookUrl: string, context?: Record<string, unknown>): Promise<void> {
    try {
        const axios = (await import("axios")).default;
        
        const embed = {
            title: "🚨 Error in Sprint API",
            description: error.message,
            color: 16711680,
            fields: [
                {
                    name: "Environment",
                    value: currentConfig?.environment || "unknown",
                    inline: true,
                },
                {
                    name: "Stack",
                    value: error.stack?.split("\n").slice(0, 5).join("\n") || "No stack trace",
                },
            ],
            timestamp: new Date().toISOString(),
        };

        if (context && Object.keys(context).length > 0) {
            embed.fields.push({
                name: "Context",
                value: JSON.stringify(context).substring(0, 500),
            });
        }

        await axios.post(webhookUrl, {
            embeds: [embed],
        });
    } catch (err) {
        console.error("Failed to send Discord webhook:", err);
    }
}

export function getConfig(): TelemetryConfig | null {
    return currentConfig;
}
