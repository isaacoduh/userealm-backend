import { IReactionDocument } from "./../interfaces/reaction.interface";
import { IUserDocument } from "./../../user/interfaces/user.interface";
import { UserCache } from "./../../../utils/redis/user.cache";
import { PostModel } from "../../../features/post/models/post.schema";
import { IPostDocument } from "./../../post/interfaces/post.interface";
import { Helpers } from "./../../../shared/globals/helpers/helpers";
import {
  IQueryReaction,
  IReaction,
  IReactionJob,
} from "../interfaces/reaction.interface";
import { ReactionModel } from "../models/reaction.schema";
import { omit } from "lodash";
import mongoose from "mongoose";
// notification
// notificatio model
// socket io notification
// notification template
import { emailQueue } from "../../../utils/queues/email.queue";

const userCache: UserCache = new UserCache();

class ReactionService {
  public async addReactionDataToDB(reactionData: IReactionJob): Promise<void> {
    const {
      postId,
      userTo,
      userFrom,
      username,
      type,
      previousReaction,
      reactionObject,
    } = reactionData;
    let updatedReactionObject: IReactionDocument =
      reactionObject as IReactionDocument;
    if (previousReaction) {
      updatedReactionObject = omit(reactionObject, ["_id"]);
    }
    const updatedReaction: [IUserDocument, IReactionDocument, IPostDocument] =
      (await Promise.all([
        userCache.getUserFromCache(`${userTo}`),
        ReactionModel.replaceOne(
          { postId, type: previousReaction, username },
          updatedReactionObject,
          { upset: true }
        ),
        PostModel.findOneAndUpdate(
          { _id: postId },
          {
            $inc: {
              [`reactions.${previousReaction}`]: -1,
              [`reactions.${type}`]: 1,
            },
          },
          { new: true }
        ),
      ])) as unknown as [IUserDocument, IReactionDocument, IPostDocument];
  }

  public async removeReactionDataFromDB(
    reactionData: IReactionJob
  ): Promise<void> {
    const { postId, previousReaction, username } = reactionData;
    await Promise.all([
      ReactionModel.deleteOne({ postId, type: previousReaction, username }),
      PostModel.updateOne(
        { _id: postId },
        { $inc: { [`reactions.${previousReaction}`]: -1 } },
        { new: true }
      ),
    ]);
  }

  public async getPostReactions(
    query: IQueryReaction,
    sort: Record<string, 1 | -1>
  ): Promise<[IReactionDocument[], number]> {
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      { $match: query },
      { $sort: sort },
    ]);
    return [reactions, reactions.length];
  }

  public async getSinglePostReactionByUsername(
    postId: string,
    username: string
  ): Promise<[IReactionDocument, number] | []> {
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      {
        $match: {
          postId: new mongoose.Types.ObjectId(postId),
          username: Helpers.firstLetterUppercase(username),
        },
      },
    ]);
    return reactions.length ? [reactions[0], 1] : [];
  }

  public async getReactionsByUsername(
    username: string
  ): Promise<IReactionDocument[]> {
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      { $match: { username: Helpers.firstLetterUppercase(username) } },
    ]);
    return reactions;
  }
}

export const reactionService: ReactionService = new ReactionService();
