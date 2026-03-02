import cron from "node-cron";

export interface CronJobOptions {
    cronExpression: string;
    handler: () => any;
    name?: string;
    timezone?: string;
    enabled?: boolean;
}

interface RegisteredCronJob {
    name: string;
    task: cron.ScheduledTask;
}

const registeredJobs: RegisteredCronJob[] = [];

export function defineCronJob(options: CronJobOptions): CronJobOptions {
    const name = options.name || `cronjob-${registeredJobs.length}`;
    
    if (options.enabled !== false && cron.validate(options.cronExpression)) {
        const task = cron.schedule(options.cronExpression, options.handler, {
            timezone: options.timezone
        });
        
        registeredJobs.push({ name, task });
    }

    return options;
};

export function stopAllCronJobs(): void {
    for (const job of registeredJobs) {
        job.task.stop();
    }
    registeredJobs.length = 0;
};

export function getCronJobs(): string[] {
    return registeredJobs.map(j => j.name);
};