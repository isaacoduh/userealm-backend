import mongoose, { Document } from "mongoose";
import { ObjectId } from "mongodb";

export interface IUserDocument extends Document {
  _id: string | ObjectId;
  authId: string | ObjectId;
}
