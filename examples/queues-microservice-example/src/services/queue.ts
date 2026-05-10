import { defineQueue, BullMQQueue } from "sprint-es/queue";
import { Queue, Worker } from "bullmq";
import { connection } from "./redis.js";

export interface EmailJob {
    to: string;
    template: "welcome" | "reset" | "receipt";
    data: Record<string, unknown>;
}

export const emails = defineQueue<EmailJob>({
    name: "emails",
    adapter: new BullMQQueue<EmailJob>({
        queue: new Queue("emails", { connection }),
        workerFactory: (proc) => new Worker("emails", proc, { connection, concurrency: 8 }),
        defaultAttempts: 5
    })
});

emails.process(async (job) => {
    console.log(`[emails] template=${job.data.template} to=${job.data.to} attempt=${job.attemptsMade}`);
    // Simulate transient failure 20% of the time to demo retries.
    if (Math.random() < 0.2) throw new Error("transient SMTP failure");
});
