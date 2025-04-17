import { Request, Response, NextFunction } from "express";

export const createPost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.json({
      message: "Post created successfully",
    });
  } catch (error) {
    next(error);
  }
};
