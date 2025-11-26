/** @type {import("ts-jest/dist/types").InitialOptionsTsJest} */
export default {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "node",
    setupFiles: ["dotenv/config"],
    extensionsToTreatAsEsm: [".ts"],
    transform: {
        "^.+\\.ts$": ["ts-jest", {
            useESM: true,
            tsconfig: "./tsconfig.json"
        }]
    },
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
        "^@/(.*)$": "<rootDir>/src/$1"
    }
};