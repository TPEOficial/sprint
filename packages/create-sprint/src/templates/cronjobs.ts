export function getExampleCronJob(language: string) {
    if (language === "typescript") {
        return `import { defineCronJob } from "sprint-es/cronjobs";

export default defineCronJob({
    name: "daily-task",
    cronExpression: "0 21 * * *",
    handler: () => {
        console.log("Hello World from cronjob!");
    }
});
`;
    }
    return `import { defineCronJob } from "sprint-es/cronjobs";

export default defineCronJob({
    name: "daily-task",
    cronExpression: "0 21 * * *",
    handler: () => {
        console.log("Hello World from cronjob!");
    }
});
`;
};