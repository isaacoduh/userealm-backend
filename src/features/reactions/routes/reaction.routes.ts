import { authMiddleware } from "./../../../shared/globals/helpers/auth-middleware";
import express, { Router } from "express";
import { ReactionController } from "../controllers/reaction.controller";

class ReactionRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.get(
      "/post/reactions/:postId",
      authMiddleware.checkAuthentication,
      ReactionController.prototype.getReactions
    );
    this.router.get(
      "/post/single/reaction/username/:username/:postId",
      authMiddleware.checkAuthentication,
      ReactionController.prototype.getSingleReactionByUsername
    );
    this.router.get(
      "/post/reactions/username/:username",
      authMiddleware.checkAuthentication,
      ReactionController.prototype.getReactionsByUsername
    );
    this.router.post(
      "/post/reaction",
      authMiddleware.checkAuthentication,
      ReactionController.prototype.addReaction
    );
    this.router.delete(
      "/post/reaction/:postId/:previousReaction/:postReactions",
      authMiddleware.checkAuthentication,
      ReactionController.prototype.removeReaction
    );
    return this.router;
  }
}

export const reactionRoutes: ReactionRoutes = new ReactionRoutes();
