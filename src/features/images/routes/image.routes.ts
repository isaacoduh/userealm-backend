import { authMiddleware } from "@global/helpers/auth-middleware";
import { ImageController } from "@image/controllers/image.controller";
import express, { Router } from "express";

class ImageRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.get(
      "/images/:userId",
      authMiddleware.checkAuthentication,
      ImageController.prototype.getImages
    );
    this.router.post(
      "/iamges/profile",
      authMiddleware.checkAuthentication,
      ImageController.prototype.addProfileImage
    );
    this.router.post(
      "/images/background",
      authMiddleware.checkAuthentication,
      ImageController.prototype.backgroundImage
    );
    this.router.delete(
      "/images/:imageId",
      authMiddleware.checkAuthentication,
      ImageController.prototype.deleteImage
    );
    this.router.delete(
      "/images/background/:bgImageId",
      authMiddleware.checkAuthentication,
      ImageController.prototype.backgroundImage
    );

    return this.router;
  }
}

export const imageRoutes: ImageRoutes = new ImageRoutes();
