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
                "modules/jwt/index": resolve(__dirname, "src/modules/jwt/index.ts")
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
                "cors",
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
                "zod"
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
