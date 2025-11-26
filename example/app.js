import Sprint from "../dist/esm/index.js";

const app = new Sprint();

app.get("/", (req, res) => res.send("Hello World!"));

app.listen();