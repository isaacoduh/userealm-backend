import { IFollowerData } from "./../interfaces/follower.interface";
import { UserCache } from "./../../../utils/redis/user.cache";
import { IUserDocument } from "./../../user/interfaces/user.interface";
import { Request, Response } from "express";
import HTTP_STATUS from "http-status-codes";
import { FollowerCache } from "../../../utils/redis/follower.cache";
import { blockedUserQueue } from "../../../utils/queues/blocked.queue";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { followerQueue } from "./../../../utils/queues/follower.queue";
import { followerService } from "../services/follower.service";

const followerCache: FollowerCache = new FollowerCache();
const userCache: UserCache = new UserCache();

export class FollowerController {
  public async addFollower(req: Request, res: Response): Promise<void> {
    const { followerId } = req.params;
    // update count in the cache
    const followersCount: Promise<void> =
      followerCache.updateFollowersCountInCache(
        `${followerId}`,
        "followersCount",
        1
      );
    const followeeCount: Promise<void> =
      followerCache.updateFollowersCountInCache(
        `${req.currentUser!.userId}`,
        "followingCount",
        1
      );
    await Promise.all([followersCount, followeeCount]);

    const cachedFollower: Promise<IUserDocument> = userCache.getUserFromCache(
      followerId
    ) as Promise<IUserDocument>;
    const cachedFollowee: Promise<IUserDocument> = userCache.getUserFromCache(
      `${req.currentUser!.userId}`
    ) as Promise<IUserDocument>;
    const response: [IUserDocument, IUserDocument] = await Promise.all([
      cachedFollower,
      cachedFollowee,
    ]);

    const followerObjectId: ObjectId = new ObjectId();
    const addFolloweeData: IFollowerData =
      FollowerController.prototype.userData(response[0]);
    // socket connection

    const addFollowerToCache: Promise<void> = followerCache.saveFollowerToCache(
      `following:${req.currentUser!.userId}`,
      `${followerId}`
    );
    const addFolloweeToCache: Promise<void> = followerCache.saveFollowerToCache(
      `followers:${followerId}`,
      `${req.currentUser!.userId}`
    );
    await Promise.all([addFollowerToCache, addFolloweeToCache]);

    followerQueue.addFollowerJob("addFollowerToDB", {
      keyOne: `${req.currentUser!.userId}`,
      keyTwo: `${followerId}`,
      username: req.currentUser!.username,
      followerDocumentId: followerObjectId,
    });
    res.status(HTTP_STATUS.OK).json({ message: "Following user now!" });
  }

  public async getUserFollowing(req: Request, res: Response): Promise<void> {
    const userObjectId: ObjectId = new mongoose.Types.ObjectId(
      req.currentUser!.userId
    );
    const cachedFollowees: IFollowerData[] =
      await followerCache.getFollowersFromCache(
        `following:${req.currentUser!.userId}`
      );
    const following: IFollowerData[] = cachedFollowees.length
      ? cachedFollowees
      : await followerService.getFolloweeData(userObjectId);
    res.status(HTTP_STATUS.OK).json({ message: "User following", following });
  }

  public async getUserFollowers(req: Request, res: Response): Promise<void> {
    const userObjectId: ObjectId = new mongoose.Types.ObjectId(
      req.params.userId
    );
    const cachedFollowers: IFollowerData[] =
      await followerCache.getFollowersFromCache(
        `followers:${req.params.userId}`
      );
    const followers: IFollowerData[] = cachedFollowers.length
      ? cachedFollowers
      : await followerService.getFollowerData(userObjectId);
    res.status(HTTP_STATUS.OK).json({ message: "User followers", followers });
  }

  public async removeFollower(req: Request, res: Response): Promise<void> {
    const { followeeId, followerId } = req.params;
    const removeFollowerFromCache: Promise<void> =
      followerCache.removeFollowerFromCache(
        `following:${req.currentUser!.userId}`,
        followeeId
      );
    const removeFolloweeFromCache: Promise<void> =
      followerCache.removeFollowerFromCache(
        `followers:${followeeId}`,
        followerId
      );

    const followersCount: Promise<void> =
      followerCache.updateFollowersCountInCache(
        `${followeeId}`,
        "followersCount",
        -1
      );
    const followeeCount: Promise<void> =
      followerCache.updateFollowersCountInCache(
        `${followerId}`,
        "followingCount",
        -1
      );
    await Promise.all([
      removeFollowerFromCache,
      removeFolloweeFromCache,
      followersCount,
      followeeCount,
    ]);

    followerQueue.addFollowerJob("removeFollowerFromDB", {
      keyOne: `${followeeId}`,
      keyTwo: `${followerId}`,
    });
    res.status(HTTP_STATUS.OK).json({ message: "Unfollowed user now!" });
  }

  public async block(req: Request, res: Response): Promise<void> {
    const { followerId } = req.params;
    FollowerController.prototype.updateBlockedUser(
      followerId,
      req.currentUser!.userId,
      "block"
    );
    blockedUserQueue.addBlockedUserJob("addBlockedUserToDB", {
      keyOne: `${req.currentUser!.userId}`,
      keyTwo: `${followerId}`,
      type: "block",
    });
    res.status(HTTP_STATUS.OK).json({ message: "User blocked!" });
  }

  public async unblock(req: Request, res: Response): Promise<void> {
    const { followerId } = req.params;
    FollowerController.prototype.updateBlockedUser(
      followerId,
      req.currentUser!.userId,
      "unblock"
    );
    blockedUserQueue.addBlockedUserJob("removeBlockedUserFromDB", {
      keyOne: `${req.currentUser!.userId}`,
      keyTwo: `${followerId}`,
      type: "unblock",
    });
    res.status(HTTP_STATUS.OK).json({ message: "User unblocked!" });
  }

  private userData(user: IUserDocument): IFollowerData {
    return {
      _id: new mongoose.Types.ObjectId(user._id),
      username: user.username!,
      avatarColor: user.avatarColor!,
      postCount: user.postsCount,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      profileProfile: user.profilePicture,
      uId: user.uId!,
      userProfile: user,
    };
  }

  private async updateBlockedUser(
    followerId: string,
    userId: string,
    type: "block" | "unblock"
  ): Promise<void> {
    const blocked: Promise<void> = followerCache.updateBlockedUserPropInCache(
      `${userId}`,
      "blocked",
      `${followerId}`,
      type
    );
    const blockedBy: Promise<void> = followerCache.updateBlockedUserPropInCache(
      `${followerId}`,
      "blockedBy",
      `${userId}`,
      type
    );
    await Promise.all([blocked, blockedBy]);
  }
}
