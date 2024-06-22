import mongoose from "mongoose";
import Logger from "bunyan";
import { config } from "./config";
import { redisConnection } from "./utils/redis/redis.connection";

const log: Logger = config.createLogger("setupDatabase");

export default () => {
  const connect = () => {
    mongoose
      .connect(`${config.DATABASE_URL}`)
      .then(() => {
        log.info(`Database connected successfully!`);
        redisConnection.connect();
      })
      .catch((error) => {
        log.error("Error connecting to database", error);
        return process.exit(1);
      });
  };
  connect();

  mongoose.connection.on("disconnected", connect);
};
