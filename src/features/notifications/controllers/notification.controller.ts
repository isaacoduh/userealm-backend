import HTTP_STATUS from "http-status-codes";
import { INotificationDocument } from "@notification/interfaces/notification.interface";
import { notificationService } from "@notification/services/notification.service";
import { Request, Response } from "express";
import { socketIONotificationObject } from "@root/utils/sockets/notification";
import { notificationQueue } from "@root/utils/queues/notification.queue";

export class NotificationController {
  public async getNotifications(req: Request, res: Response): Promise<void> {
    const notifications: INotificationDocument[] =
      await notificationService.getNotifications(req.currentUser!.userId);
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "User notifications", notifications });
  }

  public async updateNotification(req: Request, res: Response): Promise<void> {
    const { notificationId } = req.params;
    socketIONotificationObject.emit("update notification", notificationId);
    notificationQueue.addNotificationJob("updateNotification", {
      key: notificationId,
    });
    res.status(HTTP_STATUS.OK).json({ message: "Notification marked as read" });
  }

  public async deleteNotification(req: Request, res: Response): Promise<void> {
    const { notificationId } = req.params;
    socketIONotificationObject.emit("delete notification", notificationId);
    notificationQueue.addNotificationJob("deleteNotification", {
      key: notificationId,
    });
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "Notification Deleted Successfully" });
  }
}
