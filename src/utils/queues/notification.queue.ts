import { INotificationJobData } from "@notification/interfaces/notification.interface";
import { notificationWorker } from "../workers/notification.worker";
import { BaseQueue } from "./base.queue";

class NotificationQueue extends BaseQueue {
  constructor() {
    super("notifications");
    this.processJob(
      "updateNotification",
      5,
      notificationWorker.updateNotification
    );
    this.processJob(
      "deleteNotification",
      5,
      notificationWorker.deleteNotification
    );
  }
  public addNotificationJob(name: string, data: INotificationJobData): void {
    this.addJob(name, data);
  }
}

export const notificationQueue: NotificationQueue = new NotificationQueue();
