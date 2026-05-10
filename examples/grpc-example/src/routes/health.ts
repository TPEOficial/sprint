import { Router } from "sprint-es";

const router = Router();
router.get("/", (_, res) => res.json({
    name: "grpc-example",
    http: `http://localhost:5000`,
    grpc: process.env.GRPC_ADDRESS ?? "0.0.0.0:50051"
}));
export default router;
