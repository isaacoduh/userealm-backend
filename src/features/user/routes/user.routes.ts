import { authMiddleware } from "./../../../shared/globals/helpers/auth-middleware";
import express, { Router } from "express";
import { UserController } from "../controllers/user.controller";

class UserRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.get(
      "/user/all/:page",
      authMiddleware.checkAuthentication,
      UserController.prototype.all
    );

    return this.router;
  }
}

export const userRoutes: UserRoutes = new UserRoutes();
