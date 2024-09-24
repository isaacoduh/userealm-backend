import { authMiddleware } from "./../../../shared/globals/helpers/auth-middleware";
import express, { Router } from "express";
import { CommentController } from "../controllers/comment.controller";

class CommentRoutes {
  private router: Router;
  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.get(
      "/posts/comments/:postId",
      authMiddleware.checkAuthentication,
      CommentController.prototype.getComments
    );
    this.router.get(
      "/posts/commentsnames/:postId",
      authMiddleware.checkAuthentication,
      CommentController.prototype.getCommentsNamesFromCache
    );
    this.router.get(
      "/post/single/comment/:postId/:commentId",
      authMiddleware.checkAuthentication,
      CommentController.prototype.getSingleComment
    );

    this.router.post(
      "/post/comment",
      authMiddleware.checkAuthentication,
      CommentController.prototype.comment
    );
    return this.router;
  }
}

export const commentRoutes: CommentRoutes = new CommentRoutes();
