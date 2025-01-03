import express, { Router } from "express";
import { authMiddleware } from "./../../../shared/globals/helpers/auth-middleware";
import { FollowerController } from "../controllers/follower.controller";

class FollowerRoutes {
  private router: Router;
  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.get(
      "/user/following",
      authMiddleware.checkAuthentication,
      FollowerController.prototype.getUserFollowing
    );
    this.router.get(
      "/user/followers/:userId",
      authMiddleware.checkAuthentication,
      FollowerController.prototype.getUserFollowers
    );

    this.router.put(
      "/user/follow/:followerId",
      authMiddleware.checkAuthentication,
      FollowerController.prototype.addFollower
    );
    this.router.put(
      "/user/unfollow/:followeeId/:followerId",
      authMiddleware.checkAuthentication,
      FollowerController.prototype.removeFollower
    );
    this.router.put(
      "/user/block/:followerId",
      authMiddleware.checkAuthentication,
      FollowerController.prototype.block
    );
    this.router.put(
      "/user/unblock/:followerId",
      authMiddleware.checkAuthentication,
      FollowerController.prototype.unblock
    );

    return this.router;
  }
}

export const followerRoutes: FollowerRoutes = new FollowerRoutes();
