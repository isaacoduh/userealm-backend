import HTTP_STATUS from "http-status-codes";
import { MessageCache } from "./../../../utils/redis/message.cache";
import { BadRequestError } from "./../../../shared/globals/helpers/error-handler";
import { UserCache } from "./../../../utils/redis/user.cache";
import { IUserDocument } from "./../../user/interfaces/user.interface";
import { Request, Response } from "express";
import { joiValidation } from "../../../shared/globals/decorators/joi-validation.decorator";
import { addChatSchema, markChatSchema } from "../schemas/chat";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { UploadApiResponse } from "cloudinary";
import { uploads } from "../../../shared/globals/helpers/cloudinary-upload";
import { chatQueue } from "../../../utils/queues/chat.queue";
import {
  IMessageData,
  IMessageNotification,
} from "../interfaces/chat.interface";
import { socketIOChatObject } from "../../../utils/sockets/chat";
import { chatService } from "../services/chat.service";

const userCache: UserCache = new UserCache();
const messageCache: MessageCache = new MessageCache();

export class ChatController {
  @joiValidation(addChatSchema)
  public async addMessage(req: Request, res: Response): Promise<void> {
    try {
      const {
        conversationId,
        receiverId,
        receiverUsername,
        receiverAvatarColor,
        receiverProfilePicture,
        body,
        gifUrl,
        isRead,
        selectedImage,
      } = req.body;
      let fileUrl = "";
      const messageObjectId: ObjectId = new ObjectId();
      const conversationObjectId: ObjectId = !conversationId
        ? new ObjectId()
        : new mongoose.Types.ObjectId(conversationId);

      const sender: IUserDocument = (await userCache.getUserFromCache(
        `${req.currentUser!.userId}`
      )) as IUserDocument;
      if (selectedImage.length) {
        const result: UploadApiResponse = (await uploads(
          req.body.image,
          req.currentUser!.userId,
          true,
          true
        )) as UploadApiResponse;
        if (!result?.public_id) {
          throw new BadRequestError(result.message);
        }
        fileUrl = `https://res.cloudinary.com/dyamr9ym3/image/upload/v${result.version}/${result.public_id}`;
      }

      const messageData: IMessageData = {
        _id: `${messageObjectId}`,
        conversationId: new mongoose.Types.ObjectId(conversationObjectId),
        receiverId,
        receiverAvatarColor,
        receiverProfilePicture,
        receiverUsername,
        senderUsername: `${req.currentUser!.username}`,
        senderId: `${req.currentUser!.userId}`,
        senderAvatarColor: `${req.currentUser!.avatarColor}`,
        senderProfilePicture: `${sender.profilePicture}`,
        body,
        isRead,
        gifUrl,
        selectedImage: fileUrl,
        reaction: [],
        createdAt: new Date(),
        deleteForEveryone: false,
        deleteForMe: false,
      };

      ChatController.prototype.emitSocketIOEvent(messageData);
      if (!isRead) {
        ChatController.prototype.messageNotification({
          currentUser: req.currentUser!,
          message: body,
          receiverName: receiverUsername,
          receiverId,
          messageData,
        });
      }

      await messageCache.addChatListToCache(
        `${req.currentUser!.userId}`,
        `${receiverId}`,
        `${conversationId}`
      );
      await messageCache.addChatListToCache(
        `${receiverId}`,
        `${req.currentUser!.userId}`,
        `${conversationObjectId}`
      );
      await messageCache.addChatMessageToCache(
        `${conversationObjectId}`,
        messageData
      );
      chatQueue.addChatJob("addChatMessageToDB", messageData);
      res.status(HTTP_STATUS.OK).json({
        message: "Message added",
        conversationId: conversationObjectId,
      });
    } catch (error) {
      console.log(`error from the controller..... ${error}`);
    }
  }

  public async addChatUsers(req: Request, res: Response): Promise<void> {
    const chatUsers = await messageCache.addChatUsersToCache(req.body);
    socketIOChatObject.emit("add chat users", chatUsers);
    res.status(HTTP_STATUS.OK).json({ message: "Users added!" });
  }

  public async removeChatUsers(req: Request, res: Response): Promise<void> {
    const chatUsers = await messageCache.removeChatUsersFromCache(req.body);
    socketIOChatObject.emit("add chat users", chatUsers);
    res.status(HTTP_STATUS.OK).json({ message: "Users removed!" });
  }

  public async messageReaction(req: Request, res: Response): Promise<void> {
    const { conversationId, messageId, reaction, type } = req.body;
    const updatedMessage: IMessageData =
      await messageCache.updateMessageReaction(
        `${conversationId}`,
        `${messageId}`,
        `${reaction}`,
        `${req.currentUser!.username}`,
        type
      );
    socketIOChatObject.emit("message reaction", updatedMessage);
    chatQueue.addChatJob("updateMessageReaction", {
      messageId: new mongoose.Types.ObjectId(messageId),
      senderName: req.currentUser!.username,
      reaction,
      type,
    });
    res.status(HTTP_STATUS.OK).json({ message: "Message reaction added!" });
  }

  public async markMessageAsDeleted(
    req: Request,
    res: Response
  ): Promise<void> {
    const { senderId, receiverId, messageId, type } = req.params;
    const updatedMessage: IMessageData =
      await messageCache.markMessagesAsDeleted(
        `${senderId}`,
        `${receiverId}`,
        `${messageId}`,
        type
      );
    socketIOChatObject.emit("message read", updatedMessage);
    socketIOChatObject.emit("chat list", updatedMessage);
    chatQueue.addChatJob("markMessageAsDeletedInDB", {
      messageId: new mongoose.Types.ObjectId(messageId),
      type,
    });
    res.status(HTTP_STATUS.OK).json({ message: "Message marked as deleted!" });
  }

  public async getConversationList(req: Request, res: Response): Promise<void> {
    let list: IMessageData[] = [];
    const cachedList: IMessageData[] =
      await messageCache.getUserConversationList(`${req.currentUser!.userId}`);
    if (cachedList.length) {
      list = cachedList;
    } else {
      list = await chatService.getUserConversationList(
        new mongoose.Types.ObjectId(req.currentUser!.userId)
      );
    }
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "User conversation list", list });
  }

  public async getMessages(req: Request, res: Response): Promise<void> {
    const { receiverId } = req.params;
    let messages: IMessageData[] = [];
    const cachedMessages: IMessageData[] =
      await messageCache.getChatMessageFromCache(
        `${req.currentUser!.userId}`,
        `${receiverId}`
      );
    if (cachedMessages.length) {
      messages = cachedMessages;
    } else {
      messages = await chatService.getMessages(
        new mongoose.Types.ObjectId(req.currentUser!.userId),
        new mongoose.Types.ObjectId(receiverId),
        { createdAt: 1 }
      );
    }
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "User chat messages", messages });
  }

  @joiValidation(markChatSchema)
  public async updateMessage(req: Request, res: Response): Promise<void> {
    const { senderId, receiverId } = req.body;
    const updatedMessage: IMessageData = await messageCache.updateChatMessages(
      `${senderId}`,
      `${receiverId}`
    );
    socketIOChatObject.emit("message read", updatedMessage);
    socketIOChatObject.emit("chat list", updatedMessage);
    chatQueue.addChatJob("markMessageAsReadInDB", {
      senderId: new mongoose.Types.ObjectId(senderId),
      receiverId: new mongoose.Types.ObjectId(receiverId),
    });
    res.status(HTTP_STATUS.OK).json({ message: "Message marked as read" });
  }

  private emitSocketIOEvent(data: IMessageData): void {
    socketIOChatObject.emit("message received", data);
    socketIOChatObject.emit("chat list", data);
  }

  private async messageNotification({
    currentUser,
    message,
    receiverName,
    receiverId,
  }: IMessageNotification): Promise<void> {
    const cachedUser: IUserDocument = (await userCache.getUserFromCache(
      `${receiverId}`
    )) as IUserDocument;
    if (cachedUser.notifications.messages) {
      // template parameters
    }
  }
}
