import {
  IFollowerJobData,
  IBlockedUserJobData,
} from "./../../features/followers/interfaces/follower.interface";
import {
  IChatJobData,
  IMessageData,
} from "./../../features/chat/interfaces/chat.interface";
import { IReactionJob } from "./../../features/reactions/interfaces/reaction.interface";
import { ICommentJob } from "./../../features/comments/interfaces/comment.interface";
import { IPostJobData } from "./../../features/post/interfaces/post.interface";
import Queue, { Job } from "bull";
import Logger from "bunyan";
import {
  ExpressAdapter,
  createBullBoard,
  BullAdapter,
} from "@bull-board/express";
import { config } from "../../config";
import { IAuthJob } from "../../features/auth/interfaces/auth.interface";
import {
  IUserJob,
  IEmailJob,
} from "../../features/user/interfaces/user.interface";

// type IBaseJobData =
// | IAuthJob
// | IEmailJob
// | IPostJobData
// | IReactionJob
// | ICommentJob
// | IFollowerJobData
// | IBlockedUserJobData
// | INotificationJobData
// | IFileImageJobData
// | IChatJobData
// | IMessageData
// | IUserJob;
type IBaseJobData =
  | IAuthJob
  | IEmailJob
  | IUserJob
  | IPostJobData
  | ICommentJob
  | IReactionJob
  | IChatJobData
  | IFollowerJobData
  | IBlockedUserJobData
  | IMessageData;

let bullAdapters: BullAdapter[] = [];
export let serverAdapter: ExpressAdapter;

export abstract class BaseQueue {
  queue: Queue.Queue;
  log: Logger;

  constructor(queueName: string) {
    this.queue = new Queue(queueName, `${config.REDIS_HOST}`);
    bullAdapters.push(new BullAdapter(this.queue));
    bullAdapters = [...new Set(bullAdapters)];
    serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/queues");

    createBullBoard({ queues: bullAdapters, serverAdapter });
    this.log = config.createLogger(`${queueName}Queue`);
    this.queue.on("completed", (job: Job) => {
      job.remove();
    });
    this.queue.on("global:completed", (jobId: string) => {
      this.log.info(`Job ${jobId} completed`);
    });
    this.queue.on("global:stalled", (jobId: string) => {
      this.log.info(`Job ${jobId} is stalled`);
    });
  }

  protected addJob(name: string, data: IBaseJobData): void {
    this.queue.add(name, data, {
      attempts: 3,
      backoff: { type: "fixed", delay: 5000 },
    });
  }

  protected processJob(
    name: string,
    concurrency: number,
    callback: Queue.ProcessCallbackFunction<void>
  ): void {
    this.queue.process(name, concurrency, callback);
  }
}
