import { authRoutes } from "./features/auth/routes/auth.routes";
import { authMiddleware } from "./shared/globals/helpers/auth-middleware";
import { Application, Request, Response } from "express";
import { serverAdapter } from "./utils/queues/base.queue";
import { userRoutes } from "./features/user/routes/user.routes";
import { postRoutes } from "./features/post/routes/post.routes";

const BASE_PATH = "/api/v1";

export default (app: Application) => {
  const routes = () => {
    // app.use("/queues", serverAdapter.getRouter());
    // health routes
    // env route
    // instance route
    // fiboRoutes

    app.get("/api/v1/roost", (_req: Request, res: Response) => {
      return res.json({ message: "roost endpoint!" });
    });

    app.use(BASE_PATH, authRoutes.routes());
    app.use(BASE_PATH, authMiddleware.verifyUser, userRoutes.routes());
    app.use(BASE_PATH, authMiddleware.verifyUser, postRoutes.routes());
    // app.use(
    //   BASE_PATH,
    //   authMiddleware.verifyUser,
    //   authRoutes.currentUserRoute()
    // );
  };

  routes();
};
