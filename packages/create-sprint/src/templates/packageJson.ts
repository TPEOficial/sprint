import * as crypto from "node:crypto";

export interface JWTKeys {
    publicKey: string;
    privateKey: string;
}

export function generateJWTKeys(): JWTKeys {
    const keys = crypto.generateKeyPairSync("rsa", {
        modulusLength: 4096,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
    }) as unknown as { publicKey: string; privateKey: string; };
    return keys;
};

export function getTypeScriptPackageJson(name: string, telemetry: string, swagger: boolean, graphql: boolean) {
    const deps: Record<string, string> = {
        "sprint-es": "^0.0.168"
    };

    const devDeps: Record<string, string> = {
        "@types/node": "^22.0.0",
        "tsx": "^4.19.0",
        typescript: "^5.6.0",
        tsup: "^8.5.1"
    };

    if (telemetry === "sentry" || telemetry === "glitchtip") deps["@sentry/node"] = "^8.0.0";
    else if (telemetry === "discord") deps["axios"] = "^1.6.0";

    if (swagger) {
        deps["swagger-ui-express"] = "^5.0.0";
        devDeps["@types/swagger-ui-express"] = "^4.1.8";
    }

    if (graphql) {
        deps["graphql"] = "^16.13.0";
        deps["graphql-http"] = "^1.22.4";
        deps["ruru"] = "^2.0.0-rc.6";
        devDeps["@types/swagger-ui-express"] = "^4.1.8";
    }

    return {
        name: name === "." ? "sprint-app" : name,
        version: "0.0.1",
        description: "Sprint API",
        main: "dist/app.js",
        type: "module",
        scripts: {
            build: "sprint build",
            start: "sprint start",
            dev: "sprint dev",
            doctor: "sprint doctor",
            "generate:keys": "sprint generate-keys"
        },
        dependencies: deps,
        devDependencies: devDeps,
        tsup: {
            entry: [
                "src/**/*.ts"
            ],
            outDir: "dist",
            format: [
                "esm"
            ],
            target: "es2020",
            sourcemap: true,
            clean: true,
            dts: true,
            splitting: false,
            skipNodeModulesBundle: true
        }
    };
};

export function getJavaScriptPackageJson(name: string, telemetry: string, swagger: boolean, graphql: boolean) {
    const deps: Record<string, string> = {
        "sprint-es": "^0.0.168"
    };

    if (telemetry === "sentry" || telemetry === "glitchtip") deps["@sentry/node"] = "^8.0.0";
    else if (telemetry === "discord") deps["axios"] = "^1.6.0";
    
    if (swagger) deps["swagger-ui-express"] = "^5.0.0";

    if (graphql) {
        deps["graphql"] = "^16.13.0";
        deps["graphql-http"] = "^1.22.4";
        deps["ruru"] = "^2.0.0-rc.6";
    }

    return {
        name: name === "." ? "sprint-app" : name,
        version: "0.0.1",
        description: "Sprint API",
        main: "src/app.js",
        type: "module",
        scripts: {
            build: "sprint build",
            start: "sprint start",
            dev: "sprint dev",
            doctor: "sprint doctor",
            "generate:keys": "sprint generate-keys"
        },
        dependencies: deps
    };
};