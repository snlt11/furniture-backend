import { Request, Response, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import { unlink } from "node:fs/promises";
import path from "path";
import * as postService from "../services/postService";
import { errorMessage } from "../utils/auth";
import multipleFileQueue from "../jobs/queues/multipleFileQueue";
import { PostArgs } from "../services/postService";

interface CustomRequest extends Request {
  userId?: number;
  user?: any;
}

const removeFiles = async (
  originalFile: string,
  optimizedFile: string | null
) => {
  try {
    await unlink(path.join(process.cwd(), "uploads/posts", originalFile));
    if (optimizedFile) {
      await unlink(
        path.join(process.cwd(), "uploads/posts/optimize", optimizedFile)
      );
    }
  } catch (error) {
    console.log(error);
  }
};

const handleValidationErrors = (
  req: CustomRequest,
  errors: any[],
  next: NextFunction
) => {
  if (errors.length > 0) {
    req.file && removeFiles(req.file.filename, null);
    return next(errorMessage(errors[0].msg, 400, "INVALID_INPUT"));
  }
};

const queueImageOptimization = async (filename: string) => {
  const imagePath = path.join(process.cwd(), "uploads/posts", filename);
  const splitFileName = filename.split(".")[0];

  return multipleFileQueue.add(
    "optimize-image",
    {
      filePath: imagePath,
      fileName: `${splitFileName}.webp`,
      width: 835,
      height: 577,
      quality: 100,
      destination: "uploads/posts/optimize",
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    }
  );
};

const commonValidations = {
  title: body("title").not().isEmpty(),
  content: body("content").not().isEmpty(),
  body: body("body").not().isEmpty(),
  category: body("category").not().isEmpty(),
  type: body("type").not().isEmpty(),
  tags: body("tags")
    .optional({ nullable: true })
    .customSanitizer((value) =>
      value ? value.split(",").filter((tag: string) => tag.trim() !== "") : []
    ),
  id: param("id", "Post ID is required").isInt({ min: 1 }),
};

export const createPost = [
  commonValidations.title,
  commonValidations.content,
  commonValidations.body,
  commonValidations.category,
  commonValidations.type,
  commonValidations.tags,

  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req).array({ onlyFirstError: true });
      handleValidationErrors(req, errors, next);

      if (!req.file || !req.userId) {
        req.file && (await removeFiles(req.file.filename, null));
        return next(
          errorMessage(
            !req.file ? "Image is required" : "User not authenticated",
            !req.file ? 400 : 401,
            !req.file ? "INVALID_INPUT" : "UNAUTHORIZED"
          )
        );
      }

      const { title, content, body, category, type, tags } = req.body;
      const post = await postService.createPost({
        title: title.trim(),
        content: content.trim(),
        body: body.trim(),
        image: req.file.filename,
        authorId: req.userId,
        category: category.trim(),
        type: type.trim(),
        tags: Array.isArray(tags) ? tags.map((tag: string) => tag.trim()) : [],
      });

      await queueImageOptimization(req.file.filename);

      res.status(201).json({
        message: "Post created successfully",
        data: post,
      });
    } catch (error) {
      req.file && (await removeFiles(req.file.filename, null));
      next(error);
    }
  },
];

export const updatePost = [
  commonValidations.id,
  body("title").optional().not().isEmpty(),
  body("content").optional().not().isEmpty(),
  body("body").optional().not().isEmpty(),
  body("category").optional().not().isEmpty(),
  body("type").optional().not().isEmpty(),
  commonValidations.tags,

  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req).array({ onlyFirstError: true });
      handleValidationErrors(req, errors, next);

      const postId = parseInt(req.params.id);
      const existingPost = await postService.getPostById(postId);

      if (!existingPost || req.userId !== existingPost.authorId) {
        req.file && (await removeFiles(req.file.filename, null));
        return next(
          errorMessage(
            !existingPost ? "Post not found" : "Unauthorized",
            !existingPost ? 404 : 403,
            !existingPost ? "NOT_FOUND" : "UNAUTHORIZED"
          )
        );
      }

      const updateData = Object.entries(req.body).reduce<Partial<PostArgs>>(
        (acc, [key, value]) => {
          if (!value || typeof value !== "string") return acc;

          if (key === "tags") {
            const tagArray = Array.isArray(value) ? value : value.split(",");
            return {
              ...acc,
              tags: tagArray.map((tag: string) => tag.trim()).filter(Boolean),
            };
          }

          if (key in acc) {
            return {
              ...acc,
              [key]: value.trim(),
            };
          }

          return acc;
        },
        {}
      );

      if (req.file) {
        updateData.image = req.file.filename;
        if (existingPost.image) {
          await removeFiles(
            existingPost.image,
            `${existingPost.image.split(".")[0]}.webp`
          );
          await queueImageOptimization(req.file.filename);
        }
      }

      const updatedPost = await postService.updatePost(postId, updateData);
      res.json({ message: "Post updated successfully", data: updatedPost });
    } catch (error) {
      req.file && (await removeFiles(req.file.filename, null));
      next(error);
    }
  },
];

export const deletePost = [
  commonValidations.id,
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req).array({ onlyFirstError: true });
      handleValidationErrors(req, errors, next);

      const postId = parseInt(req.params.id);
      const existingPost = await postService.getPostById(postId);

      if (!existingPost || req.userId !== existingPost.authorId) {
        return next(
          errorMessage(
            !existingPost ? "Post not found" : "Unauthorized",
            !existingPost ? 404 : 403,
            !existingPost ? "NOT_FOUND" : "UNAUTHORIZED"
          )
        );
      }

      const deletedPost = await postService.deletePost(existingPost.id);
      await removeFiles(
        existingPost.image,
        `${existingPost.image.split(".")[0]}.webp`
      );

      res.json({ message: "Post deleted successfully", data: deletedPost });
    } catch (error) {
      next(error);
    }
  },
];

export const getAllPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const posts = await postService.getAllPosts();
    res.json({ message: "Posts fetched successfully", data: posts });
  } catch (error) {
    next(error);
  }
};

export const getPostById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return next(errorMessage("Invalid post ID", 400, "INVALID_INPUT"));
    }

    const post = await postService.getPostById(postId);
    if (!post) {
      return next(errorMessage("Post not found", 404, "NOT_FOUND"));
    }

    res.json({ message: "Post fetched successfully", data: post });
  } catch (error) {
    next(error);
  }
};
