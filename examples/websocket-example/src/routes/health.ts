import { Router } from "sprint-es";

const router = Router();
router.get("/", (_, res) => res.json({
    name: "websocket-example",
    chat: "ws://localhost:5000/ws/chat"
}));
export default router;
