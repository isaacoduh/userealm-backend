import { authMiddleware } from "./../../../shared/globals/helpers/auth-middleware";
import express, { Router } from "express";
import { PostController } from "../controllers/post.controller";

class PostRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.get(
      "/post/all/:page",
      authMiddleware.checkAuthentication,
      PostController.prototype.getPosts
    );
    this.router.get(
      "/post/images/:page",
      authMiddleware.checkAuthentication,
      PostController.prototype.getPostsWithImages
    );
    this.router.get(
      "/posts/videos/:page",
      authMiddleware.checkAuthentication,
      PostController.prototype.getPostsWithVideos
    );

    this.router.post(
      "/post",
      authMiddleware.checkAuthentication,
      PostController.prototype.createPost
    );
    this.router.post(
      "/post/image/post",
      authMiddleware.checkAuthentication,
      PostController.prototype.createPostWithImage
    );
    this.router.post(
      "/post/video/post",
      authMiddleware.checkAuthentication,
      PostController.prototype.createPostWithVideo
    );

    this.router.put(
      "/post/:postId",
      authMiddleware.checkAuthentication,
      PostController.prototype.updatePost
    );
    this.router.put(
      "/post/image/:postId",
      authMiddleware.checkAuthentication,
      PostController.prototype.updatePostWithImage
    );
    this.router.put(
      "/post/video/:postId",
      authMiddleware.checkAuthentication,
      PostController.prototype.updatePostWithVideo
    );

    this.router.delete(
      "/post/:postId",
      authMiddleware.checkAuthentication,
      PostController.prototype.deletePost
    );

    return this.router;
  }
}

export const postRoutes: PostRoutes = new PostRoutes();
