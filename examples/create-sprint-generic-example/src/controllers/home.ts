import { Handler, SprintRequest, SprintResponse } from "sprint-es";
import { verifyEncrypted, getJwtFromEnv } from "sprint-es/jwt";

export const homeController: Handler = (req: SprintRequest, res: SprintResponse) => {
    res.json({
        message: "Hello World",
        status: "ok"
    });
};

export const jwtValidateController: Handler = (req: SprintRequest, res: SprintResponse) => {
    return res.json(req.custom.user);
};