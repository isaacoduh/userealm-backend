import { reactionService } from "./../services/reaction.service";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import HTTP_STATUS from "http-status-codes";

import { joiValidation } from "../../../shared/globals/decorators/joi-validation.decorator";
import { addReactionSchema } from "../schemes/reactions";
import {
  IReactionDocument,
  IReactionJob,
} from "../interfaces/reaction.interface";
import { ReactionCache } from "../../../utils/redis/reaction.cache";
import { reactionQueue } from "../../../utils/queues/reaction.queue";
import mongoose from "mongoose";

const reactionCache: ReactionCache = new ReactionCache();

export class ReactionController {
  @joiValidation(addReactionSchema)
  public async addReaction(req: Request, res: Response): Promise<void> {
    const {
      userTo,
      postId,
      type,
      previousReaction,
      postReactions,
      profilePicture,
    } = req.body;
    const reactionObject: IReactionDocument = {
      _id: new ObjectId(),
      postId,
      type,
      avatarColor: req.currentUser!.avatarColor,
      username: req.currentUser!.username,
      profilePicture,
    } as IReactionDocument;

    await reactionCache.savePostReactionToCache(
      postId,
      reactionObject,
      postReactions,
      type,
      previousReaction
    );
    const databaseReactionData: IReactionJob = {
      postId,
      userTo,
      userFrom: req.currentUser!.userId,
      username: req.currentUser!.username,
      type,
      previousReaction,
      reactionObject,
    };
    reactionQueue.addReactionJob("addReactionToDB", databaseReactionData);
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "Reaction added successfully!" });
  }

  public async getReactions(req: Request, res: Response): Promise<void> {
    const { postId } = req.params;
    const cachedReactions: [IReactionDocument[], number] =
      await reactionCache.getReactionsFromCache(postId);
    const reactions: [IReactionDocument[], number] = cachedReactions[0].length
      ? cachedReactions
      : await reactionService.getPostReactions(
          { postId: new mongoose.Types.ObjectId(postId) },
          { createdAt: -1 }
        );
    res.status(HTTP_STATUS.OK).json({
      message: "Post Reactions",
      reactions: reactions[0],
      count: reactions[1],
    });
  }

  public async getSingleReactionByUsername(
    req: Request,
    res: Response
  ): Promise<void> {
    const { postId, username } = req.params;
    const cachedReaction: [IReactionDocument, number] | [] =
      await reactionCache.getSingleReactionByUsernameFromCache(
        postId,
        username
      );
    const reactions: [IReactionDocument, number] | [] = cachedReaction.length
      ? cachedReaction
      : await reactionService.getSinglePostReactionByUsername(postId, username);
    res.status(HTTP_STATUS.OK).json({
      message: "Single post reaction by username",
      reactions: reactions.length ? reactions[0] : {},
      count: reactions.length ? reactions[1] : 0,
    });
  }

  public async getReactionsByUsername(
    req: Request,
    res: Response
  ): Promise<void> {
    const { username } = req.params;
    const reactions: IReactionDocument[] =
      await reactionService.getReactionsByUsername(username);
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "All User reactions by username", reactions });
  }

  public async removeReaction(req: Request, res: Response): Promise<void> {
    const { postId, previousReaction, postReactions } = req.params;
    await reactionCache.removePostReactionFromCache(
      postId,
      `${req.currentUser!.username}`,
      JSON.parse(postReactions)
    );
    const databaseReactionData: IReactionJob = {
      postId,
      username: req.currentUser!.username,
      previousReaction,
    };
    reactionQueue.addReactionJob("removeReactionFromDB", databaseReactionData);
    res.status(HTTP_STATUS.OK).json({ message: "Reaction Remove From Post!" });
  }
}
