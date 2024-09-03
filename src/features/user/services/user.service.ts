import {
  IBasicInfo,
  ISearchUser,
  IUserDocument,
  ISocialLinks,
  INotificationSettings,
} from "../interfaces/user.interface";
import { UserModel } from "../models/user.schema";
import mongoose from "mongoose";
import { indexOf } from "lodash";
import { AuthModel } from "../../auth/models/auth.schema";

class UserService {
  public async addUserData(data: IUserDocument): Promise<void> {
    await UserModel.create(data);
  }

  public async updatePassword(
    username: string,
    hashedPassword: string
  ): Promise<void> {
    await AuthModel.updateOne(
      { username },
      { $set: { password: hashedPassword } }
    ).exec();
  }

  public async updateUserInfo(userId: string, info: IBasicInfo): Promise<void> {
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          work: info["work"],
          school: info["school"],
          quote: info["quote"],
          location: info["location"],
        },
      }
    ).exec();
  }

  public async getUserById(userId: string): Promise<IUserDocument> {
    const users: IUserDocument[] = await UserModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "Auth",
          localField: "authId",
          foreignField: "_id",
          as: "authid",
        },
      },
      { $unwind: "$authId" },
      { $project: this.aggregateProject() },
    ]);
    return users[0];
  }

  public async getUserByAuthId(authId: string): Promise<IUserDocument> {
    const users: IUserDocument[] = await UserModel.aggregate([
      { $match: { authId: new mongoose.Types.ObjectId(authId) } },
      {
        $lookup: {
          from: "Auth",
          localField: "authId",
          foreignField: "_id",
          as: "authId",
        },
      },
      { $unwind: "$authId" },
      { $project: this.aggregateProject() },
    ]);

    return users[0];
  }

  private aggregateProject() {
    return {
      _id: 1,
      username: "$authId.username",
      uId: "$authId.uId",
      email: "$authId.email",
      avatarColor: "$authId.avatarColor",
      createdAt: "$authId.createdAt",
      postsCount: 1,
      work: 1,
      school: 1,
      quote: 1,
      location: 1,
      blocked: 1,
      blockedBy: 1,
      followersCount: 1,
      followingCount: 1,
      notifications: 1,
      social: 1,
      bgImageVersion: 1,
      bgImageId: 1,
      profilePicture: 1,
    };
  }
}

export const userService: UserService = new UserService();