import { Router } from "sprint-es";

const router = Router();
router.get("/", (_, res) => res.json({ name: "graphql-example", graphql: "/graphql", playground: "/graphiql" }));
export default router;
