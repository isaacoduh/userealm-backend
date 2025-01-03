import { postService } from "./../../post/services/post.service";
import { PostCache } from "./../../../utils/redis/post.cache";
import { IPostDocument } from "./../../post/interfaces/post.interface";
import { userQueue } from "./../../../utils/queues/user.queue";
import { emailQueue } from "./../../../utils/queues/email.queue";
import { resetPasswordTemplate } from "./../../../shared/services/emails/templates/reset-password/reset-password-template";
import { authService } from "./../../auth/services/auth.service";
import { IAuthDocument } from "./../../auth/interfaces/auth.interface";
import { BadRequestError } from "./../../../shared/globals/helpers/error-handler";
import { Helpers } from "./../../../shared/globals/helpers/helpers";
import HTTP_STATUS from "http-status-codes";
import { UserCache } from "./../../../utils/redis/user.cache";
import {
  IAllUsers,
  IResetPasswordParams,
  ISearchUser,
  IUserDocument,
} from "./../interfaces/user.interface";
import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { joiValidation } from "./../../../shared/globals/decorators/joi-validation.decorator";
import {
  basicInfoSchema,
  changePasswordSchema,
  notificationSettingsSchema,
  socialLinksSchema,
} from "../schemas/info";

import moment from "moment";
import publicIP from "ip";

const PAGE_SIZE = 15;

interface IUserAll {
  newSkip: number;
  limit: number;
  skip: number;
  userId: string;
}

const userCache: UserCache = new UserCache();
const postCache: PostCache = new PostCache();

export class UserController {
  public async all(req: Request, res: Response): Promise<void> {
    const { page } = req.params;
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    const limit: number = PAGE_SIZE * parseInt(page);
    const newSkip: number = skip === 0 ? skip : skip + 1;
    const allUsers = await UserController.prototype.allUsers({
      newSkip,
      limit,
      skip,
      userId: `${req.currentUser!.userId}`,
    });
    const followers: any[] = [];
    res.status(HTTP_STATUS.OK).json({
      message: "Users Retrieved! ",
      users: allUsers.users,
      totalUsers: allUsers.totalUsers,
      followers,
    });
  }

  public async profile(req: Request, res: Response): Promise<void> {
    const cachedUser: IUserDocument = (await userCache.getUserFromCache(
      `${req.currentUser!.userId}`
    )) as IUserDocument;
    const existingUser: IUserDocument = cachedUser
      ? cachedUser
      : await userService.getUserById(`${req.currentUser!.userId}`);
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "User Profile Retrieved!", user: existingUser });
  }

  public async profileByUserId(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const cachedUser: IUserDocument = (await userCache.getUserFromCache(
      userId
    )) as IUserDocument;
    const existingUser: IUserDocument = cachedUser
      ? cachedUser
      : await userService.getUserById(userId);
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "User Retrieved by Profile ID", user: existingUser });
  }

  public async profileAndPosts(req: Request, res: Response): Promise<void> {
    const { userId, username, uId } = req.params;
    const userName: string = Helpers.firstLetterUppercase(username);
    const cachedUser: IUserDocument = (await userCache.getUserFromCache(
      userId
    )) as IUserDocument;
    const cachedUserPosts: IPostDocument[] =
      await postCache.getUserPostsFromCache("post", parseInt(uId, 10));

    const existingUser: IUserDocument = cachedUser
      ? cachedUser
      : await userService.getUserById(userId);
    const userPosts: IPostDocument[] = cachedUserPosts.length
      ? cachedUserPosts
      : await postService.getPosts({ username: userName }, 0, 100, {
          createdAt: -1,
        });
    res
      .status(HTTP_STATUS.OK)
      .json({
        message: "User profile and post retrieved!",
        user: existingUser,
        posts: userPosts,
      });
  }

  public async randomUserSuggestions(
    req: Request,
    res: Response
  ): Promise<void> {
    let randomUsers: IUserDocument[] = [];
    const cachedUsers: IUserDocument[] =
      await userCache.getRandomUsersFromCache(
        `${req.currentUser!.userId}`,
        req.currentUser!.username
      );
    if (cachedUsers.length) {
      randomUsers = [...cachedUsers];
    } else {
      const users: IUserDocument[] = await userService.getRandomUsers(
        req.currentUser!.userId
      );
      randomUsers = [...users];
    }

    res
      .status(HTTP_STATUS.OK)
      .json({ message: "User suggesstions..", users: randomUsers });
  }

  public async searchUser(req: Request, res: Response): Promise<void> {
    const regex = new RegExp(Helpers.escapeRegex(req.params.query), "i");
    const users: ISearchUser[] = await userService.searchUsers(regex);
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "Search Results", search: users });
  }

  @joiValidation(changePasswordSchema)
  public async passwordUpdate(req: Request, res: Response) {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      throw new BadRequestError("Password do not match");
    }
    const existingUser: IAuthDocument = await authService.getAuthUserByUsername(
      req.currentUser!.username
    );
    const passwordsMatch: boolean = await existingUser.comparePassword(
      currentPassword
    );
    if (!passwordsMatch) {
      throw new BadRequestError("Invalid credentials");
    }

    const hashedPassword: string = await existingUser.hashPassword(newPassword);
    userService.updatePassword(`${req.currentUser!.username}`, hashedPassword);

    const templateParams: IResetPasswordParams = {
      username: existingUser.username!,
      email: existingUser.email!,
      ipaddress: publicIP.address(),
      date: moment().format("DD/MM/YYYY HH:mm"),
    };
    // reset password template
    const template: string =
      resetPasswordTemplate.passwordResetConfirmationTemplate(templateParams);
    emailQueue.addEmailJob("changePassword", {
      template,
      receiverEmail: existingUser.email!,
      subject: "Password update confirmation",
    });
    // email job
    res.status(HTTP_STATUS.OK).json({
      message:
        "Password updated successfully. You will be redirected to login again!",
    });
  }

  @joiValidation(basicInfoSchema)
  public async updateBasicInfo(req: Request, res: Response): Promise<void> {
    for (const [key, value] of Object.entries(req.body)) {
      await userCache.updateSingleUserItemInCache(
        `${req.currentUser!.userId}`,
        key,
        `${value}`
      );
    }

    userQueue.addUserJob("updateBasicInfoInDB", {
      key: `${req.currentUser!.userId}`,
      value: req.body,
    });
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "Updated Basic Info Successfully" });
  }

  @joiValidation(socialLinksSchema)
  public async updateSocialLinks(req: Request, res: Response): Promise<void> {
    await userCache.updateSingleUserItemInCache(
      `${req.currentUser!.userId}`,
      "social",
      req.body
    );
    userQueue.addUserJob("updateSocialLinksInDB", {
      key: `${req.currentUser!.userId}`,
      value: req.body,
    });
    res.status(HTTP_STATUS.OK).json({ message: "Update Successfully" });
  }

  @joiValidation(notificationSettingsSchema)
  public async updateNotificationSettings(
    req: Request,
    res: Response
  ): Promise<void> {
    await userCache.updateSingleUserItemInCache(
      `${req.currentUser!.userId}`,
      "notifications",
      req.body
    );
    userQueue.addUserJob("updateNotificationSettings", {
      key: `${req.currentUser!.userId}`,
      value: req.body,
    });

    res.status(HTTP_STATUS.OK).json({
      message: "Notification settings updated successfully",
      settings: req.body,
    });
  }

  private async allUsers({
    newSkip,
    limit,
    skip,
    userId,
  }: IUserAll): Promise<IAllUsers> {
    let users;
    let type = "";
    const cachedUsers: IUserDocument[] = (await userCache.getUsersFromCache(
      newSkip,
      limit,
      userId
    )) as IUserDocument[];
    if (cachedUsers.length) {
      type = "redis";
      users = cachedUsers;
    } else {
      type = "mongodb";
      users = await userService.getAllUsers(userId, skip, limit);
    }

    const totalUsers: number = await UserController.prototype.usersCount(type);
    return { users, totalUsers };
  }

  private async usersCount(type: string): Promise<number> {
    const totalUsers: number =
      type === "redis"
        ? await userCache.getTotalUsersInCache()
        : await userService.getTotalUsersInDB();
    return totalUsers;
  }
}
