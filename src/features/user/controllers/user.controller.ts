import { Helpers } from "./../../../shared/globals/helpers/helpers";
import HTTP_STATUS from "http-status-codes";
import { UserCache } from "./../../../utils/redis/user.cache";
import {
  IAllUsers,
  ISearchUser,
  IUserDocument,
} from "./../interfaces/user.interface";
import { Request, Response } from "express";
import { userService } from "../services/user.service";

const PAGE_SIZE = 15;

interface IUserAll {
  newSkip: number;
  limit: number;
  skip: number;
  userId: string;
}

const userCache: UserCache = new UserCache();

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
