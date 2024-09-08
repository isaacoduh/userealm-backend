import HTTP_STATUS from "http-status-codes";
import { postQueue } from "./../../../utils/queues/post.queue";
import { PostCache } from "./../../../utils/redis/post.cache";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { joiValidation } from "../../../shared/globals/decorators/joi-validation.decorator";
import { IPostDocument } from "../interfaces/post.interface";
import {
  postSchema,
  postWithImageSchema,
  postWithVideoSchema,
} from "../schemes/post.schemes";
import { UploadApiResponse } from "cloudinary";
import {
  uploads,
  videoUpload,
} from "../../../shared/globals/helpers/cloudinary-upload";
import { BadRequestError } from "../../../shared/globals/helpers/error-handler";
import { postService } from "../services/post.service";

const postCache: PostCache = new PostCache();
const PAGE_SIZE = 10;
export class PostController {
  @joiValidation(postSchema)
  public async createPost(req: Request, res: Response): Promise<void> {
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings } =
      req.body;
    const postObjectId: ObjectId = new ObjectId();
    const createdPost: IPostDocument = {
      _id: postObjectId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount: 0,
      imgVersion: "",
      imgId: "",
      videoId: "",
      videoVersion: "",
      createdAt: new Date(),
      reactions: { like: 0, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 },
    } as IPostDocument;

    // socket post

    await postCache.savePostToCache({
      key: postObjectId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost,
    });

    postQueue.addPostJob("addPostToDB", {
      key: req.currentUser!.userId,
      value: createdPost,
    });
    res.status(HTTP_STATUS.OK).json({ message: "Post created successfully!" });
  }

  @joiValidation(postWithImageSchema)
  public async createPostWithImage(req: Request, res: Response): Promise<void> {
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings, image } =
      req.body;
    const result: UploadApiResponse = (await uploads(
      image
    )) as UploadApiResponse;
    if (!result?.public_id) {
      throw new BadRequestError(result.message);
    }

    const postObjectId: ObjectId = new ObjectId();
    const createdPost: IPostDocument = {
      _id: postObjectId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount: 0,
      imgVersion: result.version.toString(),
      imgId: result.public_id,
      videoId: "",
      videoVersion: "",
      createdAt: new Date(),
      reactions: { like: 0, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 },
    } as IPostDocument;
    // socket add post
    await postCache.savePostToCache({
      key: postObjectId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost,
    });
    //   imageQueue.addImageJob("addImageToDB", {
    //     key: `${req.currentUser!.userId}`,
    //     imgId: result.public_id,
    //     imgVersion: result.version.toString(),
    //   });
    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "Post created with image successfully!" });
  }

  @joiValidation(postWithVideoSchema)
  public async createPostWithVideo(req: Request, res: Response): Promise<void> {
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings, video } =
      req.body;

    const result: UploadApiResponse = (await videoUpload(
      video
    )) as UploadApiResponse;
    if (!result?.public_id) {
      throw new BadRequestError(result.message);
    }

    const postObjectId: ObjectId = new ObjectId();
    const createdPost: IPostDocument = {
      _id: postObjectId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount: 0,
      imgVersion: "",
      imgId: "",
      videoId: result.public_id,
      videoVersion: result.version.toString(),
      createdAt: new Date(),
      reactions: { like: 0, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 },
    } as IPostDocument;
    //   socketIOPostObject.emit("add post", createdPost);
    await postCache.savePostToCache({
      key: postObjectId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost,
    });
    postQueue.addPostJob("addPostToDB", {
      key: req.currentUser!.userId,
      value: createdPost,
    });
    res
      .status(HTTP_STATUS.CREATED)
      .json({ message: "Post created with video successfully" });
  }

  public async getPosts(req: Request, res: Response): Promise<void> {
    const { page } = req.params;
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    const limit: number = PAGE_SIZE * parseInt(page);
    const newSkip: number = skip === 0 ? skip : skip + 1;
    let posts: IPostDocument[] = [];
    let totalPosts = 0;
    const cachedPosts: IPostDocument[] = await postCache.getPostsFromCache(
      "post",
      newSkip,
      limit
    );
    if (cachedPosts.length) {
      posts = cachedPosts;
      totalPosts = await postCache.getTotalPostsInCache();
    } else {
      posts = await postService.getPosts({}, skip, limit, { createdAt: -1 });
      totalPosts = await postService.postsCount();
    }

    res
      .status(HTTP_STATUS.OK)
      .json({ message: "All Posts", posts, totalPosts });
  }

  public async getPostsWithImages(req: Request, res: Response): Promise<void> {
    const { page } = req.params;
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    const limit: number = PAGE_SIZE * parseInt(page);
    const newSkip: number = skip === 0 ? skip : skip + 1;
    let posts: IPostDocument[] = [];
    const cachedPosts: IPostDocument[] =
      await postCache.getPostsWithImagesFromCache("post", newSkip, limit);
    posts = cachedPosts.length
      ? cachedPosts
      : await postService.getPosts(
          { imgId: "$ne", gifUrl: "$ne" },
          skip,
          limit,
          { createdAt: -1 }
        );
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "All Posts with images", posts });
  }

  public async getPostsWithVideos(req: Request, res: Response): Promise<void> {
    const { page } = req.params;
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    const limit: number = PAGE_SIZE * parseInt(page);
    const newSkip: number = skip === 0 ? skip : skip + 1;
    let posts: IPostDocument[] = [];
    const cachedPosts: IPostDocument[] =
      await postCache.getPostsWithVideosFromCache("post", newSkip, limit);
    posts = cachedPosts.length
      ? cachedPosts
      : await postService.getPosts({ videoId: "$ne" }, skip, limit, {
          createdAt: -1,
        });
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "All posts with videos", posts });
  }

  @joiValidation(postSchema)
  public async updatePost(req: Request, res: Response): Promise<void> {
    const {
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      imgVersion,
      imgId,
      profilePicture,
      videoId,
      videoVersion,
    } = req.body;

    const { postId } = req.params;
    const updatedPost: IPostDocument = {
      post,
      bgColor,
      privacy,
      feelings,
      gifUrl,
      profilePicture,
      imgId,
      imgVersion,
      videoId: "",
      videoVersion: "",
    } as IPostDocument;

    const postUpdated: IPostDocument = await postCache.updatePostInCache(
      postId,
      updatedPost
    );
    // socket
    postQueue.addPostJob("updatePostInDB", { key: postId, value: postUpdated });
    res.status(HTTP_STATUS.OK).json({ message: "Post updated successfully" });
  }

  @joiValidation(postWithImageSchema)
  public async updatePostWithImage(req: Request, res: Response): Promise<void> {
    const { imgId, imgVersion } = req.body;
    if (imgId && imgVersion) {
      PostController.prototype._updatePost(req);
    } else {
      const result: UploadApiResponse =
        await PostController.prototype.addImageToExistingPost(req);
      if (!result.public_id) {
        throw new BadRequestError(result.message);
      }
    }
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "Post with image updated successfully" });
  }

  @joiValidation(postWithVideoSchema)
  public async updatePostWithVideo(req: Request, res: Response): Promise<void> {
    const { videoId, videoVersion } = req.body;
    if (videoId && videoVersion) {
      PostController.prototype._updatePost(req);
    } else {
      const result: UploadApiResponse =
        await PostController.prototype.addImageToExistingPost(req);
      if (!result.public_id) {
        throw new BadRequestError(result.message);
      }
    }
    res
      .status(HTTP_STATUS.OK)
      .json({ message: "Post with video updated successfully" });
  }

  public async deletePost(req: Request, res: Response): Promise<void> {
    // socketIOPostObject.emit("delete post", req.params.postId);
    await postCache.deletePostFromCache(
      req.params.postId,
      `${req.currentUser!.userId}`
    );
    postQueue.addPostJob("deletePostFromDB", {
      keyOne: req.params.postId,
      keyTwo: req.currentUser!.userId,
    });
    res.status(HTTP_STATUS.OK).json({ message: "Post deleted successfully" });
  }

  private async _updatePost(req: Request): Promise<void> {
    const {
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      imgVersion,
      imgId,
      profilePicture,
      videoId,
      videoVersion,
    } = req.body;
    const { postId } = req.params;
    const updatedPost: IPostDocument = {
      post,
      bgColor,
      privacy,
      feelings,
      gifUrl,
      profilePicture,
      imgId: imgId ? imgId : "",
      imgVersion: imgVersion ? imgVersion : "",
      videoId: videoId ? videoId : "",
      videoVersion: videoVersion ? videoVersion : "",
    } as IPostDocument;

    const postUpdated: IPostDocument = await postCache.updatePostInCache(
      postId,
      updatedPost
    );
    // socketIOPostObject.emit("update post", postUpdated, "posts");
    postQueue.addPostJob("updatePostInDB", { key: postId, value: postUpdated });
  }

  private async addImageToExistingPost(
    req: Request
  ): Promise<UploadApiResponse> {
    const {
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      profilePicture,
      image,
      video,
    } = req.body;
    const { postId } = req.params;
    const result: UploadApiResponse = image
      ? ((await uploads(image)) as UploadApiResponse)
      : ((await videoUpload(video)) as UploadApiResponse);
    if (!result?.public_id) {
      return result;
    }
    const updatedPost: IPostDocument = {
      post,
      bgColor,
      privacy,
      feelings,
      gifUrl,
      profilePicture,
      imgId: image ? result.public_id : "",
      imgVersion: image ? result.version.toString() : "",
      videoId: video ? result.public_id : "",
      videoVersion: video ? result.version.toString() : "",
    } as IPostDocument;

    const postUpdated: IPostDocument = await postCache.updatePostInCache(
      postId,
      updatedPost
    );
    // socketIOPostObject.emit("update post", postUpdated, "posts");
    postQueue.addPostJob("updatePostInDB", { key: postId, value: postUpdated });
    // if (image) {
    //   imageQueue.addImageJob("addImageToDB", {
    //     key: `${req.currentUser!.userId}`,
    //     imgId: result.public_id,
    //     imgVersion: result.version.toString(),
    //   });
    // }
    return result;
  }
}
