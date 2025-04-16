import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import {
  getOtpByPhone,
  createOtpCode,
  getUserByPhone,
  updateOtp,
  createUser,
  updateUser,
  getUserById,
} from "../services/authService";
import jwt from "jsonwebtoken";
import { checkUserExists, isHasOtp, errorMessage } from "../utils/auth";
import { generateOtp, generateRememberToken } from "../utils/generateCode";
import bcrypt from "bcrypt";
import moment from "moment";

export const register = [
  body("phone")
    .trim()
    .notEmpty()
    .matches(/^[0-9]+$/)
    .withMessage("Phone number is required")
    .isLength({ min: 5, max: 12 })
    .withMessage("Phone must be 5–12 digits"),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req).array({ onlyFirstError: true });
      if (errors.length > 0) {
        throw errorMessage(errors[0].msg, 422, "INVALID_INPUT");
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
            throw errorMessage(
              "OTP is allowed to request 3 times per day",
              405,
              "OVER_LIMIT"
            );
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
        throw errorMessage(errors[0].msg, 422, "INVALID_INPUT");
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
        throw errorMessage("OTP is already verified", 400, "ALREADY_VERIFIED");
      }

      const lastOtpVerify = new Date(otpRow!.updatedAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const isSameDate = lastOtpVerify === today;

      if (isSameDate && otpRow!.error >= 5) {
        throw errorMessage("Too many failed attempts", 403, "OVER_LIMIT");
      }

      if (otpRow?.rememberToken !== token) {
        await updateOtp(otpRow!.id, { error: 5 });
        throw errorMessage("Invalid token", 400, "INVALID_TOKEN");
      }

      const otpCreatedTime = new Date(otpRow!.updatedAt).getTime();
      const currentTime = new Date().getTime();
      const diffMinutes = (currentTime - otpCreatedTime) / (1000 * 60);

      if (diffMinutes > 2) {
        throw errorMessage("OTP is expired", 403, "OTP_EXPIRED");
      }

      const isMatchOtp = await bcrypt.compare(otp, otpRow!.otp);
      if (!isMatchOtp) {
        const otpData = !isSameDate
          ? { error: 1 }
          : { error: otpRow!.error + 1 };

        await updateOtp(otpRow!.id, otpData);
        throw errorMessage("OTP is incorrect", 401, "INVALID_OTP");
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

export const confirmPassword = [
  body("phone")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 12 })
    .withMessage("Invalid phone number"),
  body("password")
    .trim()
    .notEmpty()
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/)
    .withMessage(
      "Password must be at least 8 characters with letters and numbers"
    ),
  body("token").trim().notEmpty().escape().withMessage("Invalid token"),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req).array({ onlyFirstError: true });
      if (errors.length > 0) {
        throw errorMessage(errors[0].msg, 422, "INVALID_INPUT");
      }

      let { phone, password, token } = req.body;
      phone = phone.startsWith("09") ? phone.slice(2) : phone;

      const [user, otpRow] = await Promise.all([
        getUserByPhone(phone),
        getOtpByPhone(phone),
      ]);
      checkUserExists(user);
      isHasOtp(otpRow);

      if (otpRow!.error >= 5)
        throw errorMessage("Too many failed attempts", 403, "OVER_LIMIT");

      if (otpRow?.verifyToken !== token) {
        await updateOtp(otpRow!.id, { error: 5 });
        throw errorMessage("Invalid token", 400, "INVALID_TOKEN");
      }
      if (moment().diff(otpRow!.updatedAt, "minutes") > 8)
        throw errorMessage("Your request has expired", 403, "OTP_EXPIRED");

      const randToken = generateRememberToken();
      const hashPassword = await bcrypt.hash(
        password,
        await bcrypt.genSalt(10)
      );
      const newUser = await createUser({
        phone,
        password: hashPassword,
        randToken,
      });

      const tokenPayload = { sub: newUser.id, phone: newUser.phone };
      const accessToken = jwt.sign(
        { ...tokenPayload, type: "access" },
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { ...tokenPayload, type: "refresh" },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: "7d" }
      );

      await updateUser(newUser.id, { rememberToken: randToken });

      res
        .cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          path: "/",
          maxAge: 15 * 60 * 1000, // 15 minutes
        })
        .cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          path: "/",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        })
        .status(201)
        .json({
          message: "Successfully created an account.",
        });
    } catch (error) {
      next(error);
    }
  },
];

export const login = [
  body("phone")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 5, max: 12 })
    .withMessage("Invalid phone number"),
  body("password")
    .trim()
    .notEmpty()
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/)
    .withMessage(
      "Password must be at least 8 characters with letters and numbers"
    ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req).array({ onlyFirstError: true });
      if (errors.length > 0) {
        throw errorMessage(errors[0].msg, 422, "INVALID_INPUT");
      }

      let { phone, password } = req.body;
      phone = phone.startsWith("09") ? phone.slice(2) : phone;

      const user = await getUserByPhone(phone);
      if (!user) throw errorMessage("User not found", 404, "USER_NOT_FOUND");
      if (user.status === "FREEZE")
        throw errorMessage("User is freeze", 403, "USER_FREEZE");

      const isMatchPassword = await bcrypt.compare(password, user.password);
      if (!isMatchPassword) {
        const lastRequest = new Date(user.updatedAt).toLocaleDateString();
        const isSameDate = lastRequest === new Date().toLocaleDateString();

        if (!isSameDate) {
          await updateUser(user.id, { errorLoginCount: 1 });
        } else {
          if (user.errorLoginCount >= 3) {
            await updateUser(user.id, {
              status: "FREEZE",
              errorLoginCount: user.errorLoginCount + 1,
            });
            throw errorMessage("Too many failed attempts", 403, "OVER_LIMIT");
          }
          await updateUser(user.id, {
            errorLoginCount: user.errorLoginCount + 1,
          });
        }
        throw errorMessage(req.t("wrong_password"), 401, "INVALID_PASSWORD");
      }

      const randToken = generateRememberToken();
      await updateUser(user.id, {
        randToken,
        errorLoginCount: 0,
      });

      const tokenPayload = { sub: user.id, phone: user.phone };
      const accessToken = jwt.sign(
        { ...tokenPayload, type: "access" },
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { ...tokenPayload, type: "refresh" },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: "7d" }
      );

      res
        .cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          path: "/",
          maxAge: 15 * 60 * 1000, // 15 minutes
        })
        .cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          path: "/",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        })
        .status(200)
        .json({
          message: "Successfully logged in",
          user: {
            id: user.id,
            phone: user.phone,
          },
        });
    } catch (error) {
      next(error);
    }
  },
];

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw errorMessage("You are not authenticated", 401, "UNAUTHORIZED");
    }

    let decoded;
    try {
      const result = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET!
      ) as jwt.JwtPayload;

      if (!result || typeof result === "string") {
        throw errorMessage("Invalid token format", 401, "UNAUTHORIZED");
      }

      if (!result.sub || !result.phone || result.type !== "refresh") {
        throw errorMessage("Invalid token payload", 401, "UNAUTHORIZED");
      }

      decoded = {
        sub:
          typeof result.sub === "string"
            ? parseInt(result.sub, 10)
            : result.sub,
        phone: result.phone,
      };
    } catch (err) {
      throw errorMessage("Invalid or expired token", 401, "UNAUTHORIZED");
    }

    const user = await getUserById(decoded.sub);
    if (!user || user.phone !== decoded.phone) {
      throw errorMessage("Invalid token", 401, "UNAUTHORIZED");
    }

    await updateUser(user.id, {
      randToken: generateRememberToken(),
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? ("none" as const)
          : ("strict" as const),
      path: "/",
    };

    res
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .status(200)
      .json({
        success: true,
        message: "Successfully logged out. See you soon.",
      });
  } catch (error) {
    next(error);
  }
};

export const changePassword = [
  body("oldPassword")
    .trim()
    .notEmpty()
    .withMessage("Old password is required")
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/)
    .withMessage(
      "Password must be at least 8 characters with letters and numbers"
    ),

  body("newPassword")
    .trim()
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/)
    .withMessage(
      "Password must be at least 8 characters with letters and numbers"
    )
    .custom(
      (value, { req }) =>
        value !== req.body.oldPassword ||
        Promise.reject("New password must be different from old password")
    ),

  body("confirmPassword")
    .trim()
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom(
      (value, { req }) =>
        value === req.body.newPassword ||
        Promise.reject("Passwords do not match")
    ),

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req).array({ onlyFirstError: true });
      if (errors.length > 0) {
        throw errorMessage(errors[0].msg, 422, "INVALID_INPUT");
      }

      const accessToken = req.cookies?.accessToken;
      if (!accessToken) {
        throw errorMessage("Please login to continue", 401, "UNAUTHORIZED");
      }

      const decoded = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET!
      ) as jwt.JwtPayload;
      if (!decoded?.sub || decoded.type !== "access") {
        throw errorMessage("Invalid token", 401, "UNAUTHORIZED");
      }

      const { oldPassword, newPassword } = req.body;
      const userId =
        typeof decoded.sub === "string"
          ? parseInt(decoded.sub, 10)
          : decoded.sub;
      const user = await getUserById(userId);

      if (!user) {
        throw errorMessage("User not found", 404, "USER_NOT_FOUND");
      }

      const isMatchPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isMatchPassword) {
        throw errorMessage(
          "Wrong password. Please try again",
          401,
          "INVALID_PASSWORD"
        );
      }

      const hashPassword = await bcrypt.hash(
        newPassword,
        await bcrypt.genSalt(10)
      );
      await updateUser(user.id, { password: hashPassword });

      res.status(200).json({
        success: true,
        message: "Password successfully changed",
      });
    } catch (error) {
      next(error);
    }
  },
];
