import HTTP_STATUS from "http-status-codes";
import { commentQueue } from "./../../../utils/queues/comment.queue";
import { CommentCache } from "./../../../utils/redis/comment.cache";
import {
  ICommentDocument,
  ICommentJob,
  ICommentNameList,
} from "./../interfaces/comment.interface";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { joiValidation } from "../../../shared/globals/decorators/joi-validation.decorator";
import { addCommentSchema } from "../schemes/comment";
import { commentService } from "../services/comment.service";
import mongoose from "mongoose";

const commentCache: CommentCache = new CommentCache();

export class CommentController {
  @joiValidation(addCommentSchema)
  public async comment(req: Request, res: Response): Promise<void> {
    const { userTo, postId, profilePicture, comment } = req.body;
    const commentObjectId: ObjectId = new ObjectId();
    const commentData: ICommentDocument = {
      _id: commentObjectId,
      postId,
      username: `${req.currentUser?.username}`,
      avatarColor: `${req.currentUser?.avatarColor}`,
      profilePicture,
      comment,
      createdAt: new Date(),
    } as ICommentDocument;
    await commentCache.savePostCommentToCache(
      postId,
      JSON.stringify(commentData)
    );

    const databaseCommentData: ICommentJob = {
      postId,
      userTo,
      userFrom: req.currentUser!.userId,
      username: req.currentUser!.username,
      comment: commentData,
    };
    commentQueue.addCommentJob("addCommentToDB", databaseCommentData);
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "Comment created successfully!" });
  }

  public async getComments(req: Request, res: Response): Promise<void> {
    const { postId } = req.params;
    const cachedComments: ICommentDocument[] =
      await commentCache.getCommentsFromCache(postId);
    const comments: ICommentDocument[] = cachedComments.length
      ? cachedComments
      : await commentService.getPostComments(
          { postId: new mongoose.Types.ObjectId(postId) },
          { createdAt: -1 }
        );
    res.status(HTTP_STATUS.OK).json({ message: "Post comments!", comments });
  }

  public async getCommentsNamesFromCache(
    req: Request,
    res: Response
  ): Promise<void> {
    const { postId } = req.params;
    const cachedCommentsNames: ICommentNameList[] =
      await commentCache.getCommentsNamesFromCache(postId);
    const commentsNames: ICommentNameList[] = cachedCommentsNames.length
      ? cachedCommentsNames
      : await commentService.getPostCommentNames(
          { postId: new mongoose.Types.ObjectId(postId) },
          { createdAt: -1 }
        );
    res.status(HTTP_STATUS.OK).json({
      message: "Post Comments names",
      comments: commentsNames.length ? commentsNames[0] : [],
    });
  }

  public async getSingleComment(req: Request, res: Response): Promise<void> {
    const { postId, commentId } = req.params;
    const cachedComments: ICommentDocument[] =
      await commentCache.getSingleCommentFromCache(postId, commentId);
    const comments: ICommentDocument[] = cachedComments.length
      ? cachedComments
      : await commentService.getPostComments(
          { _id: new mongoose.Types.ObjectId(commentId) },
          { createdAt: -1 }
        );
    res.status(HTTP_STATUS.OK).json({
      message: "Single Comment",
      comments: comments.length ? comments[0] : [],
    });
  }
}
