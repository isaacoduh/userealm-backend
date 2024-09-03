import { authMiddleware } from "./../../../shared/globals/helpers/auth-middleware";
import { AuthController } from "../controllers/auth.controller";
import express, { Router } from "express";

class AuthRoutes {
  private router: Router;
  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.post("/signup", AuthController.prototype.create);
    this.router.post("/signin", AuthController.prototype.read);
    this.router.get(
      "/currentUser",
      authMiddleware.verifyUser,
      authMiddleware.checkAuthentication,
      AuthController.prototype.readCurrentUser
    );
    this.router.get("/signout", AuthController.prototype.signout);

    return this.router;
  }
}

export const authRoutes: AuthRoutes = new AuthRoutes();
