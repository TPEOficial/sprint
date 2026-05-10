const { parentPort } = require("worker_threads");
parentPort.on("message", (msg) => {
    if (msg && msg.fail) parentPort.postMessage({ __error: "intentional failure" });
    else if (msg && msg.compute === "square") parentPort.postMessage({ result: msg.n * msg.n });
    else parentPort.postMessage({ echo: msg });
});
