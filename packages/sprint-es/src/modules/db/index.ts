import { registerResource } from "../lifecycle";

export interface DbConnection {
    init?: () => Promise<void> | void;
    close: () => Promise<void> | void;
    ready?: () => Promise<boolean> | boolean;
}

export interface DefineDbOptions {
    name: string;
    connection: DbConnection;
}

const registry = new Map<string, DbConnection>();

export function defineDb<T extends DbConnection>(options: DefineDbOptions & { connection: T; }): T {
    if (registry.has(options.name)) throw new Error(`DB connection "${options.name}" already defined`);
    registry.set(options.name, options.connection);
    registerResource(`db:${options.name}`, {
        init: options.connection.init,
        close: () => options.connection.close(),
        ready: options.connection.ready
    });
    return options.connection;
};

export function getDb<T = DbConnection>(name: string): T | undefined {
    return registry.get(name) as T | undefined;
};

export function listDbs(): string[] {
    return Array.from(registry.keys());
};