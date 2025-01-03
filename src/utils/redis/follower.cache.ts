import Logger from "bunyan";
import { Helpers } from "./../../shared/globals/helpers/helpers";
import { ObjectId } from "mongodb";
import { IUserDocument } from "./../../features/user/interfaces/user.interface";
import { IFollowerData } from "./../../features/followers/interfaces/follower.interface";
import { ServerError } from "./../../shared/globals/helpers/error-handler";
import { config } from "./../../config";
import { BaseCache } from "./base.cache";
import { UserCache } from "./user.cache";
import mongoose from "mongoose";
import { remove } from "lodash";
const log: Logger = config.createLogger("followersCache");
const userCache: UserCache = new UserCache();

export class FollowerCache extends BaseCache {
  constructor() {
    super("followersCache");
  }

  public async saveFollowerToCache(key: string, value: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.LPUSH(key, value);
    } catch (error) {
      log.error(error);
      throw new ServerError("Server error. Try again!");
    }
  }

  public async removeFollowerFromCache(
    key: string,
    value: string
  ): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.LREM(key, 1, value);
    } catch (error) {
      log.error(error);
      throw new ServerError("Server error. Try again!");
    }
  }

  public async updateFollowersCountInCache(
    userId: string,
    prop: string,
    value: number
  ): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.HINCRBY(`users:${userId}`, prop, value);
    } catch (error) {
      log.error(error);
      throw new ServerError("Server error. Try again!");
    }
  }

  public async getFollowersFromCache(key: string): Promise<IFollowerData[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.LRANGE(key, 0, -1);
      const list: IFollowerData[] = [];
      for (const item of response) {
        const user: IUserDocument = (await userCache.getUserFromCache(
          item
        )) as IUserDocument;
        const data: IFollowerData = {
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
        list.push(data);
      }
      return list;
    } catch (error) {
      log.error(error);
      throw new ServerError("Server error. Try again!");
    }
  }

  public async updateBlockedUserPropInCache(
    key: string,
    prop: string,
    value: string,
    type: "block" | "unblock"
  ): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string = (await this.client.HGET(
        `users:${key}`,
        prop
      )) as string;
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      let blocked: string[] = Helpers.parseJson(response) as string[];
      if (type === "block") {
        blocked = [...blocked, value];
      } else {
        remove(blocked, (id: string) => id === value);
        blocked = [...blocked];
      }
      multi.HSET(`users:${key}`, `${prop}`, JSON.stringify(blocked));
      await multi.exec();
    } catch (error) {
      log.error(error);
      throw new ServerError("Server error. Try again!");
    }
  }
}
