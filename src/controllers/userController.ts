import { Request, Response, NextFunction } from "express";
import { getAllUsersInfo } from "../services/authService";
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await getAllUsersInfo();
    res.json({
      success: true,
      message: "Users retrieved successfully",
      userId: req.userId,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
