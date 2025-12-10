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
| Advanced middleware system                                             | 🟢 Active      |
| Pre-established security policies                                      | 🟢 Active      |
| Native support for JSON, formatted and ready to use                    | 🟢 Active      |
| CORS, Morgan, and similar modules preinstalled                         | 🟢 Active      |
| Preconfigured health check and 404 error pages                         | 🟢 Active      |
| Anti-directory listing rate limiting system                            | 🟢 Active      |

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
 ┣ 📂middlewares
 ┃ ┗ 📜auth.js
 ┣ 📂routes
 ┃ ┗ 📜random.js
 ┗ 📜app.js
```

#### Define route

We define a `Router` as we would in **ExpressJS** and export it to a file with the desired route name within the `routes` folder. **Sprint** will recognize it automatically.

```ts
import { Router } from "sprint-es";

const router = Router();

router.get("/", (req, res) => res.send("Hello World 2!"));

export default router;
```

#### Visual grouping of routes

You can create folders with names in parentheses to group your routes more easily without affecting the path in the API URL.

```
📦routes
 ┣ 📂(auth)
 ┃ ┣ 📂(protected)
 ┃ ┃ ┣ 📂settings
 ┃ ┃ ┃ ┗ 📜index.js
 ┃ ┃ ┗ 📜profile.js
 ┃ ┗ 📜login.js
```

#### Define middleware

We export a `defineMiddleware` function in a file with the name of your choice in the `middlewares` folder. **Sprint** will recognize it automatically.

```ts
import { defineMiddleware } from "sprint-es";

export default defineMiddleware({
    name: "admin",
    priority: 20, // Runs after auth.
    include: "/admin/**",
    handler: (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: "Not authenticated" });

        if (req.user.role !== "admin") {
            console.log(`[Sprint Example: Admin] Access denied for user: ${req.user.name} (role: ${req.user.role})`);
            return res.status(403).json({
                error: "Forbidden",
                message: "Admin access required"
            });
        }

        console.log(`[Sprint Example: Admin] Admin access granted for: ${req.user.name}`);
        next();
    }
});
```