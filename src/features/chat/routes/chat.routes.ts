import { ChatController } from "./../controllers/chat.controller";
import { authMiddleware } from "./../../../shared/globals/helpers/auth-middleware";
import express, { Router } from "express";

class ChatRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.get(
      "/chat/message/conversation-list",
      authMiddleware.checkAuthentication,
      ChatController.prototype.getConversationList
    );
    this.router.get(
      "/chat/message/user/:receiverId",
      authMiddleware.checkAuthentication,
      ChatController.prototype.getMessages
    );
    this.router.post(
      "/chat/message",
      authMiddleware.checkAuthentication,
      ChatController.prototype.addMessage
    );
    this.router.post(
      "/chat/message/add-chat-users",
      authMiddleware.checkAuthentication,
      ChatController.prototype.addChatUsers
    );
    this.router.post(
      "/chat/message/remove-chat-users",
      authMiddleware.checkAuthentication,
      ChatController.prototype.removeChatUsers
    );
    this.router.put(
      "/chat/message/mark-as-read",
      authMiddleware.checkAuthentication,
      ChatController.prototype.updateMessage
    );
    this.router.put(
      "/chat/message/reaction",
      authMiddleware.checkAuthentication,
      ChatController.prototype.messageReaction
    );
    this.router.delete(
      "/chat/message/mark-as-deleted/:messageId/:senderId/:receiverId/:type",
      authMiddleware.checkAuthentication,
      ChatController.prototype.markMessageAsDeleted
    );
    return this.router;
  }
}

export const chatRoutes: ChatRoutes = new ChatRoutes();
