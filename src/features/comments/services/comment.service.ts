import { IPostDocument } from "./../../post/interfaces/post.interface";
import {
  ICommentDocument,
  ICommentJob,
  ICommentNameList,
  IQueryComment,
} from "./../interfaces/comment.interface";
import { UserCache } from "./../../../utils/redis/user.cache";
import { CommentsModel } from "../models/comment.model";
import { Query } from "mongoose";
import { PostModel } from "../../../features/post/models/post.schema";
import { IUserDocument } from "../../../features/user/interfaces/user.interface";
const userCache: UserCache = new UserCache();

class CommentService {
  public async addCommentToDB(commentData: ICommentJob): Promise<void> {
    const { postId, userTo, userFrom, comment, username } = commentData;
    const comments: Promise<ICommentDocument> = CommentsModel.create(comment);
    const post: Query<IPostDocument, IPostDocument> =
      PostModel.findOneAndUpdate(
        { _id: postId },
        { $inc: { commentsCount: 1 } },
        { new: true }
      ) as Query<IPostDocument, IPostDocument>;
    const user: Promise<IUserDocument> = userCache.getUserFromCache(
      userTo
    ) as Promise<IUserDocument>;
    const response: [ICommentDocument, IPostDocument, IUserDocument] =
      await Promise.all([comments, post, user]);
  }

  public async getPostComments(
    query: IQueryComment,
    sort: Record<string, 1 | -1>
  ): Promise<ICommentDocument[]> {
    const comments: ICommentDocument[] = await CommentsModel.aggregate([
      { $match: query },
      { $sort: sort },
    ]);
    return comments;
  }

  public async getPostCommentNames(
    query: IQueryComment,
    sort: Record<string, 1 | -1>
  ): Promise<ICommentNameList[]> {
    const commentsNameList: ICommentNameList[] = await CommentsModel.aggregate([
      { $match: query },
      { $sort: sort },
      {
        $group: {
          _id: null,
          names: { $addToSet: "$username" },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0 } },
    ]);
    return commentsNameList;
  }
}

export const commentService: CommentService = new CommentService();
