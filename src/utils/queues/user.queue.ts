import { BaseQueue } from "./base.queue";
import { IUserJob } from "src/features/user/interfaces/user.interface";
import { userWorker } from "../workers/user.worker";

class UserQueue extends BaseQueue {
  constructor() {
    super("user");
    this.processJob("addUserToDB", 5, userWorker.addUserToDB);
  }

  public addUserJob(name: string, data: IUserJob): void {
    this.addJob(name, data);
  }
}
export const userQueue: UserQueue = new UserQueue();
