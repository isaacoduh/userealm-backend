import {
  IChatJobData,
  IMessageData,
} from "./../../features/chat/interfaces/chat.interface";
import { chatWorker } from "../workers/chat.worker";
import { BaseQueue } from "./base.queue";

class ChatQueue extends BaseQueue {
  constructor() {
    super("chats");
    this.processJob("addChatMessageToDB", 5, chatWorker.addChatMessageToDB);
    this.processJob(
      "markMessageAsDeletedInDB",
      5,
      chatWorker.markMessageAsDeleted
    );
    this.processJob(
      "markMessageAsReadInDB",
      5,
      chatWorker.markMessagesAsReadInDB
    );
    this.processJob(
      "updateMessageReaction",
      5,
      chatWorker.updateMessageReaction
    );
  }

  public addChatJob(name: string, data: IChatJobData | IMessageData): void {
    this.addJob(name, data);
  }
}

export const chatQueue: ChatQueue = new ChatQueue();
