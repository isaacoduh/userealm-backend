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
import { AuthModel } from "src/features/auth/models/auth.schema";

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
}

export const userService: UserService = new UserService();
