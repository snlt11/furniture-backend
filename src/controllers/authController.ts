import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { empty } from "../../generated/prisma/runtime/library";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(201).json({ message: "Register" });
};

export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({ message: "verify otp" });
};

export const confirmPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({ message: "confirm password" });
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(200).json({ message: "login" });
};
