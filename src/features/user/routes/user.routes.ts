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
    this.router.get(
      "/user/profile",
      authMiddleware.checkAuthentication,
      UserController.prototype.profile
    );
    this.router.get(
      "/user/profile/:userId",
      authMiddleware.checkAuthentication,
      UserController.prototype.profileByUserId
    );
    this.router.get(
      "/user/profile/user/suggestions",
      authMiddleware.checkAuthentication,
      UserController.prototype.randomUserSuggestions
    );
    this.router.get(
      "/user/profile/search/:query",
      authMiddleware.checkAuthentication,
      UserController.prototype.searchUser
    );

    return this.router;
  }
}

export const userRoutes: UserRoutes = new UserRoutes();