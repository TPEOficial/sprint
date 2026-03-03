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

export function getTypeScriptPackageJson(name: string, telemetry: string, swagger: boolean) {
    const deps: Record<string, string> = {
        "sprint-es": "^0.0.81"
    };

    const devDeps: Record<string, string> = {
        "@types/node": "^22.0.0",
        "tsx": "^4.19.0",
        typescript: "^5.6.0"
    };

    if (telemetry === "sentry" || telemetry === "glitchtip") deps["@sentry/node"] = "^8.0.0";
    else if (telemetry === "discord") deps["axios"] = "^1.6.0";

    if (swagger) deps["swagger-ui-express"] = "^5.0.0";
    if (swagger) devDeps["@types/swagger-ui-express"] = "^4.1.8";

    return {
        name: name === "." ? "sprint-app" : name,
        version: "0.0.1",
        description: "Sprint API",
        main: "dist/index.js",
        scripts: {
            build: "sprint-es build",
            start: "sprint-es start",
            dev: "sprint-es dev",
            doctor: "sprint-es doctor",
            "generate:keys": "sprint-es generate-keys"
        },
        dependencies: deps,
        devDependencies: devDeps
    };
};

export function getJavaScriptPackageJson(name: string, telemetry: string, swagger: boolean) {
    const deps: Record<string, string> = {
        "sprint-es": "^0.0.81"
    };

    if (telemetry === "sentry" || telemetry === "glitchtip") deps["@sentry/node"] = "^8.0.0";
    else if (telemetry === "discord") deps["axios"] = "^1.6.0";
    
    if (swagger) deps["swagger-ui-express"] = "^5.0.0";

    return {
        name: name === "." ? "sprint-app" : name,
        version: "0.0.1",
        description: "Sprint API",
        main: "src/index.js",
        type: "module",
        scripts: {
            build: "sprint-es build",
            start: "sprint-es start",
            dev: "sprint-es dev",
            doctor: "sprint-es doctor",
            "generate:keys": "sprint-es generate-keys"
        },
        dependencies: deps
    };
};