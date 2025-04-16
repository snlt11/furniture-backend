import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getUserById, updateUser } from "../services/userService";
import { errorMessage } from "../utils/auth";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw errorMessage("You are not authenticated", 401, "UNAUTHORIZED");
    }

    if (accessToken) {
      try {
        const decoded = jwt.verify(
          accessToken,
          process.env.ACCESS_TOKEN_SECRET!
        ) as jwt.JwtPayload;
        
        if (!decoded.sub) {
          throw errorMessage("Invalid token payload", 401, "UNAUTHORIZED");
        }
        
        req.userId = typeof decoded.sub === 'string' ? parseInt(decoded.sub, 10) : decoded.sub;
        return next();
      } catch (error) {
        if (!(error instanceof jwt.TokenExpiredError)) {
          throw errorMessage("Invalid access token", 400, "INVALID_TOKEN");
        }
      }
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as {
      id: number;
      phone: string;
    };

    const user = await getUserById(decoded.id);
    if (
      !user ||
      user.phone !== decoded.phone ||
      user.randToken !== refreshToken
    ) {
      throw errorMessage("Invalid refresh token", 401, "UNAUTHORIZED");
    }

    const newAccessToken = jwt.sign(
      { id: user.id },
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id, phone: user.phone },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: "30d" }
    );

    await updateUser(user.id, { randToken: newRefreshToken });

    res
      .cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

    (req as any).userId = user.id;
    next();
  } catch (error) {
    next(error);
  }
};
