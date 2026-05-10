import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";
import { builtinModules } from "module";

export default defineConfig({
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, "src/index.ts"),
                cli: resolve(__dirname, "src/cli.ts"),
                "modules/logger/index": resolve(__dirname, "src/modules/logger/index.ts"),
                "modules/rate-limit/index": resolve(__dirname, "src/modules/rate-limit/index.ts"),
                "modules/telemetry/index": resolve(__dirname, "src/modules/telemetry/index.ts"),
                "modules/schemas/index": resolve(__dirname, "src/modules/schemas/index.ts"),
                "modules/cronjobs/index": resolve(__dirname, "src/modules/cronjobs/index.ts"),
                "modules/jwt/index": resolve(__dirname, "src/modules/jwt/index.ts"),
                "modules/utils/index": resolve(__dirname, "src/modules/utils/index.ts"),
                "modules/errors/index": resolve(__dirname, "src/modules/errors/index.ts"),
                "modules/context/index": resolve(__dirname, "src/modules/context/index.ts"),
                "modules/lifecycle/index": resolve(__dirname, "src/modules/lifecycle/index.ts"),
                "modules/security/index": resolve(__dirname, "src/modules/security/index.ts"),
                "modules/cache/index": resolve(__dirname, "src/modules/cache/index.ts"),
                "modules/db/index": resolve(__dirname, "src/modules/db/index.ts"),
                "modules/queue/index": resolve(__dirname, "src/modules/queue/index.ts"),
                "modules/env/index": resolve(__dirname, "src/modules/env/index.ts"),
                "modules/body-parser/index": resolve(__dirname, "src/modules/body-parser/index.ts"),
                "modules/sse/index": resolve(__dirname, "src/modules/sse/index.ts"),
                "modules/ws/index": resolve(__dirname, "src/modules/ws/index.ts"),
                "modules/workers/index": resolve(__dirname, "src/modules/workers/index.ts"),
                "modules/csrf/index": resolve(__dirname, "src/modules/csrf/index.ts"),
                "modules/idempotency/index": resolve(__dirname, "src/modules/idempotency/index.ts"),
                "modules/circuit-breaker/index": resolve(__dirname, "src/modules/circuit-breaker/index.ts"),
                "modules/discovery/index": resolve(__dirname, "src/modules/discovery/index.ts"),
                "modules/flags/index": resolve(__dirname, "src/modules/flags/index.ts"),
                "modules/trpc/index": resolve(__dirname, "src/modules/trpc/index.ts"),
                "modules/grpc/index": resolve(__dirname, "src/modules/grpc/index.ts"),
                "modules/http-client/index": resolve(__dirname, "src/modules/http-client/index.ts"),
                "modules/pagination/index": resolve(__dirname, "src/modules/pagination/index.ts"),
                "modules/secrets/index": resolve(__dirname, "src/modules/secrets/index.ts"),
                "modules/openapi/index": resolve(__dirname, "src/modules/openapi/index.ts")
            }
        },
        outDir: "dist",
        emptyOutDir: true,
        ssr: true,
        rollupOptions: {
            external: [
                ...builtinModules,
                ...builtinModules.map(m => `node:${m}`),
                "express",
                "morgan",
                "serve-favicon",
                "axios",
                "dotenv",
                "jose",
                "node-cron",
                "toolkitify",
                "toolkitify/rate-limit",
                "toolkitify/cache",
                "toolkitify/logger",
                "@sentry/node",
                "zod",
                "swagger-ui-express",
                "graphql",
                "graphql-http/lib/use/express",
                "ruru/server",
                "bullmq",
                "ioredis",
                "ws",
                "@trpc/server",
                "@trpc/server/adapters/express",
                "@grpc/grpc-js"
            ],
            output: [
                {
                    format: "es",
                    entryFileNames: "esm/[name].js",
                    chunkFileNames: "esm/_shared/[name]-[hash].js",
                    exports: "named"
                },
                {
                    format: "cjs",
                    entryFileNames: "cjs/[name].cjs",
                    chunkFileNames: "cjs/_shared/[name]-[hash].cjs",
                    exports: "named"
                }
            ]
        },
        target: "ES2020",
        minify: false
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "src")
        }
    },
    plugins: [
        dts({
            outDir: "dist/types",
            include: ["src/**/*"],
            exclude: ["**/*.test.ts", "**/*.spec.ts"],
            insertTypesEntry: true
        })
    ]
});
