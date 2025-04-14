import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import {
  getOtpByPhone,
  createOtpCode,
  getUserByPhone,
  updateOtp,
} from "../services/authService";
import { checkUserExists } from "../utils/auth";
import { generateOtp, generateRememberToken } from "../utils/generateCode";
import bcrypt from "bcrypt";

export const register = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[0-9]+$/)
    .withMessage("Phone must be digits only")
    .isLength({ min: 5, max: 12 })
    .withMessage("Phone must be 5–12 digits"),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req).array({ onlyFirstError: true });
      if (errors.length > 0) {
        const error = new Error(errors[0].msg);
        (error as any).status = 422;
        (error as any).code = "INVALID_INPUT";
        return next(error);
      }

      let phone = req.body.phone;
      if (phone.startsWith("09")) {
        phone = phone.slice(2);
      }

      const user = await getUserByPhone(phone);
      checkUserExists(user);

      const otp = generateOtp();
      const randToken = generateRememberToken();
      const salt = await bcrypt.genSalt(10);
      const hashOtp = await bcrypt.hash(otp.toString(), salt);

      const existingOtp = await getOtpByPhone(phone);
      let result;

      if (!existingOtp) {
        result = await createOtpCode({
          phone,
          randToken,
          otp: hashOtp,
          count: 1,
        });
      } else {
        const lastOtpRequest = new Date(
          existingOtp.updatedAt
        ).toLocaleDateString();
        const today = new Date().toLocaleDateString();
        const isSameDate = lastOtpRequest === today;

        if (!isSameDate) {
          result = await updateOtp(existingOtp.id, {
            otp: hashOtp,
            rememberToken: randToken,
            count: 1,
            error: 0,
          });
        } else {
          if (existingOtp.count >= 3) {
            const error = new Error(
              "OTP is allowed to request 3 times per day"
            );
            (error as any).status = 405;
            (error as any).code = "OVER_LIMIT";
            return next(error);
          }

          result = await updateOtp(existingOtp.id, {
            otp: hashOtp,
            rememberToken: randToken,
            count: existingOtp.count + 1,
          });
        }
      }

      res.status(201).json({
        message: `We are sending OTP to 09${result.phone}`,
        phone: result.phone,
        token: result.rememberToken,
      });
    } catch (error) {
      next(error);
    }
  },
];
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
