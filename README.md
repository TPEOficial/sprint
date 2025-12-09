<div align="center">
  <h1>Sprint for Node.JS</h1>
  <h3>Sprint - Quickly API</h3>
  <img src="https://img.shields.io/badge/TypeScript-purple?style=for-the-badge&logo=typescript&logoColor=white"/> 
  <a href="https://github.com/TPEOficial"> <img alt="GitHub" src="https://img.shields.io/badge/GitHub-purple?style=for-the-badge&logo=github&logoColor=white"/></a>
  <a href="https://ko-fi.com/fjrg2007"> <img alt="Kofi" src="https://img.shields.io/badge/Ko--fi-purple?style=for-the-badge&logo=ko-fi&logoColor=white"></a>
  <br />
  <br />
  <a href="#">Quickstart</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://tpe.li/dsc">Discord</a>
  <hr />
</div>

## Modules

**Sprint** provides different modules depending on the required use.

| Feature                                                                | Status         |
| ---------------------------------------------------------------------- | -------------- |
| File-based dynamic routing system                                      | 🟢 Active      |
| Pre-established security policies                                      | 🟢 Active      |
| Native support for JSON, formatted and ready to use                    | 🟢 Active      |
| CORS, Morgan, and similar modules preinstalled                         | 🟢 Active      |
| Preconfigured health check and 404 error pages                         | 🟢 Active      |

```ts
import Sprint from "sprint-es";

const app = new Sprint();

app.get("/", (req, res) => res.send("Hello World!"));

app.listen();
```

#### File-based dynamic routing system 

In this example, we generate a route called random with subroutes inside it.
```
📦example
 ┣ 📂routes
 ┃ ┗ 📜random.js
 ┗ 📜app.js
```