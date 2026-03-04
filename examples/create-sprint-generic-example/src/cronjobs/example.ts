import { defineCronJob } from "sprint-es/cronjobs";

export default defineCronJob({
    name: "daily-task",
    cronExpression: "0 21 * * *",
    handler: () => {
        console.log("Hello World from cronjob!");
    }
});