import { defineQueue } from "sprint-es/queue";
import { defineCache, MemoryCache } from "sprint-es/cache";

export const cache = defineCache({
    name: "main",
    adapter: new MemoryCache({ maxEntries: 10_000, defaultTtlMs: 60_000 })
});

export const emails = defineQueue<{ to: string; template: string }>({
    name: "emails"
});

emails.process(async (job) => {
    console.log(`[emails] sending ${job.data.template} to ${job.data.to} (attempt ${job.attemptsMade})`);
    if (Math.random() < 0.2) throw new Error("transient SMTP failure");
});
