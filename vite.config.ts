import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";
import { builtinModules } from "module";

export default defineConfig({
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, "src/index.ts"),
                "modules/logger/index": resolve(__dirname, "src/modules/logger/index.ts"),
                "modules/rate-limit/index": resolve(__dirname, "src/modules/rate-limit/index.ts")
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
                "toolkitify",
                "toolkitify/rate-limit",
                "toolkitify/cache",
                "toolkitify/logger"
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
