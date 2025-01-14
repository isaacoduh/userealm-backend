import HTTP_STATUS from "http-status-codes";
import { joiValidation } from "@global/decorators/joi-validation.decorator";
import { uploads } from "@global/helpers/cloudinary-upload";
import { BadRequestError } from "@global/helpers/error-handler";
import { addImageSchema } from "@image/schemes/images";
import { imageQueue } from "@root/utils/queues/image.queue";
import { UserCache } from "@root/utils/redis/user.cache";
import { socketIOImageObject } from "@root/utils/sockets/image";
import { IUserDocument } from "@user/interfaces/user.interface";
import { UploadApiResponse } from "cloudinary";
import { Request, Response } from "express";
import {
  IBgUploadResponse,
  IFileImageDocument,
} from "@image/interfaces/image.interface";
import { Helpers } from "@global/helpers/helpers";
import { imageService } from "@image/services/image.service";

const userCache: UserCache = new UserCache();

export class ImageController {
  @joiValidation(addImageSchema)
  public async addProfileImage(req: Request, res: Response): Promise<void> {
    const result: UploadApiResponse = (await uploads(
      req.body.image,
      req.currentUser!.userId,
      true,
      true
    )) as UploadApiResponse;
    if (!result?.public_id) {
      throw new BadRequestError("File upload: Error occured. Try again!");
    }
    const url = `https://res.cloudinary.com/dyamr9my3/image/upload/v${result.version}/${result.public_id}`;
    const cachedUser: IUserDocument =
      (await userCache.updateSingleUserItemInCache(
        `${req.currentUser!.userId}`,
        "profilePicture",
        url
      )) as IUserDocument;
    socketIOImageObject.emit("update user", cachedUser);
    imageQueue.addImageJob("addUserProfileImageToDB", {
      key: `${req.currentUser!.userId}`,
      value: url,
      imgId: result.public_id,
      imgVersion: result.version.toString(),
    });
    res.status(HTTP_STATUS.OK).json({ message: "Image added successfully!" });
  }

  @joiValidation(addImageSchema)
  public async backgroundImage(req: Request, res: Response): Promise<void> {
    const { version, publicId }: IBgUploadResponse =
      await ImageController.prototype.backgroundUpload(req.body.image);
    const bgImageId: Promise<IUserDocument> =
      userCache.updateSingleUserItemInCache(
        `${req.currentUser!.userId}`,
        "bgImageId",
        publicId
      ) as Promise<IUserDocument>;
    const bgImageVersion: Promise<IUserDocument> =
      userCache.updateSingleUserItemInCache(
        `${req.currentUser!.userId}`,
        "bgImageVersion",
        version
      ) as Promise<IUserDocument>;
    const response: [IUserDocument, IUserDocument] = (await Promise.all([
      bgImageId,
      bgImageVersion,
    ])) as [IUserDocument, IUserDocument];
    socketIOImageObject.emit("update user", {
      bgImageId: publicId,
      bgImageVersion: version,
      userId: response[0],
    });
    imageQueue.addImageJob("updateBGImageInDB", {
      key: `${req.currentUser!.userId}`,
      imgId: publicId,
      imgVersion: version.toString(),
    });
    res.status(HTTP_STATUS.OK).json({ message: "Image added successfully" });
  }

  public async getImages(req: Request, res: Response): Promise<void> {
    const images: IFileImageDocument[] = await imageService.getImages(
      req.params.userId
    );
    res.status(HTTP_STATUS.OK).json({ message: "User images", images });
  }

  public async deleteImage(req: Request, res: Response): Promise<void> {
    const { imageId } = req.params;
    socketIOImageObject.emit("delete image", imageId);
    imageQueue.addImageJob("removeImageFromDB", {
      imageId,
    });
    res.status(HTTP_STATUS.OK).json({ message: "Image deleted successfully!" });
  }

  //   public async backgroundImage(req: Request, res: Response): Promise<void> {
  //     const image: IFileImageDocument = await imageService.getImageByBackgroundId(
  //       req.params.bgImageId
  //     );
  //     socketIOImageObject.emit("delete image", image?._id);
  //     const bgImageId: Promise<IUserDocument> =
  //       userCache.updateSingleUserItemInCache(
  //         `${req.currentUser!.userId}`,
  //         "bgImageId",
  //         ""
  //       ) as Promise<IUserDocument>;
  //     const bgImageVersion: Promise<IUserDocument> =
  //       userCache.updateSingleUserItemInCache(
  //         `${req.currentUser!.userId}`,
  //         "bgImageVersion",
  //         ""
  //       ) as Promise<IUserDocument>;
  //     (await Promise.all([bgImageId, bgImageVersion])) as [
  //       IUserDocument,
  //       IUserDocument,
  //     ];
  //     imageQueue.addImageJob("removeImageFromDB", {
  //       imageId: image?._id,
  //     });
  //     res.status(HTTP_STATUS.OK).json({ message: "Image Deletd successfully" });
  //   }

  private async backgroundUpload(image: string): Promise<IBgUploadResponse> {
    const isDataURL = Helpers.isDataURL(image);
    let version = "";
    let publicId = "";
    if (isDataURL) {
      const result: UploadApiResponse = (await uploads(
        image
      )) as UploadApiResponse;
      if (!result.public_id) {
        throw new BadRequestError(result.message);
      } else {
        version = result.version.toString();
        publicId = result.public_id;
      }
    } else {
      const value = image.split("/");
      version = value[value.length - 2];
      publicId = value[value.length - 1];
    }
    return { version: version.replace(/v/g, ""), publicId };
  }
}
