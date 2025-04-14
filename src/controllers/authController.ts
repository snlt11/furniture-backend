import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import {
  getOtpByPhone,
  createOtpCode,
  getUserByPhone,
  updateOtp,
} from "../services/authService";
import { checkUserExists, isHasOtp } from "../utils/auth";
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
      // console.log("Otp code is ", otp);
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
            verifyToken: null,
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
            verifyToken: null,
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

export const verifyOtp = [
  body("phone", "Invalid phone number")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 12 }),
  body("otp", "Invalid OTP")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 6, max: 6 }),
  body("token", "Invalid token").trim().notEmpty().escape(),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req).array({ onlyFirstError: true });
      if (errors.length > 0) {
        const error = new Error(errors[0].msg);
        (error as any).status = 422;
        (error as any).code = "INVALID_INPUT";
        return next(error);
      }

      let { phone, otp, token } = req.body;
      if (phone.startsWith("09")) {
        phone = phone.slice(2);
      }

      const user = await getUserByPhone(phone);
      checkUserExists(user);

      const otpRow = await getOtpByPhone(phone);
      isHasOtp(otpRow);

      if (otpRow?.verifyToken) {
        const error = new Error("OTP is already verified");
        (error as any).status = 400;
        (error as any).code = "ALREADY_VERIFIED";
        return next(error);
      }

      const lastOtpVerify = new Date(otpRow!.updatedAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const isSameDate = lastOtpVerify === today;

      if (isSameDate && otpRow!.error >= 5) {
        const error = new Error("Too many failed attempts");
        (error as any).status = 403;
        (error as any).code = "OVER_LIMIT";
        return next(error);
      }

      if (otpRow?.rememberToken !== token) {
        await updateOtp(otpRow!.id, { error: 5 });
        const error = new Error("Invalid token");
        (error as any).status = 400;
        (error as any).code = "INVALID_TOKEN";
        return next(error);
      }

      const otpCreatedTime = new Date(otpRow!.updatedAt).getTime();
      const currentTime = new Date().getTime();
      const diffMinutes = (currentTime - otpCreatedTime) / (1000 * 60);

      if (diffMinutes > 2) {
        const error = new Error("OTP is expired");
        (error as any).status = 403;
        (error as any).code = "OTP_EXPIRED";
        return next(error);
      }

      const isMatchOtp = await bcrypt.compare(otp, otpRow!.otp);
      if (!isMatchOtp) {
        const otpData = !isSameDate
          ? { error: 1 }
          : { error: otpRow!.error + 1 };

        await updateOtp(otpRow!.id, otpData);

        const error = new Error("OTP is incorrect");
        (error as any).status = 401;
        (error as any).code = "INVALID_OTP";
        return next(error);
      }

      const verifyToken = generateRememberToken();
      const result = await updateOtp(otpRow!.id, {
        verifyToken,
        error: 0,
        count: 1,
      });

      res.status(200).json({
        message: "OTP is successfully verified.",
        phone: result.phone,
        token: result.verifyToken,
      });
    } catch (error) {
      next(error);
    }
  },
];

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
