import HTTP_STATUS from "http-status-codes";
import { UserCache } from "./../../../utils/redis/user.cache";
import { IAllUsers, IUserDocument } from "./../interfaces/user.interface";
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
    res
      .status(HTTP_STATUS.OK)
      .json({
        message: "Users Retrieved! ",
        users: allUsers.users,
        totalUsers: allUsers.totalUsers,
        followers,
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
