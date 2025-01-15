import { authMiddleware } from "@global/helpers/auth-middleware";
import { NotificationController } from "@notification/controllers/notification.controller";
import express, { Router } from "express";

class NotificationRoutes {
  private router: Router;
  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.get(
      "/notifications",
      authMiddleware.checkAuthentication,
      NotificationController.prototype.getNotifications
    );
    this.router.put(
      "/notification/:notificaitonId",
      authMiddleware.checkAuthentication,
      NotificationController.prototype.updateNotification
    );
    this.router.delete(
      "/notification/:notificationId",
      authMiddleware.checkAuthentication,
      NotificationController.prototype.deleteNotification
    );

    return this.router;
  }
}

export const notificationRoutes: NotificationRoutes = new NotificationRoutes();
