import { Request, Response, NextFunction } from "express";
import { getSettingStatus } from "../services/settingService";
import { errorMessage } from "../utils/auth";

const WHITELISTED_IPS = ["127.0.0.1"];

export const maintenance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ip = (req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress) as string;

    if (WHITELISTED_IPS.includes(ip)) {
      console.log(`Allowed IP: ${ip}`);
      return next();
    }

    console.log(`Non-whitelisted IP: ${ip}`);
    const setting = await getSettingStatus("maintenance");

    if (setting?.value === "true") {
      throw errorMessage(
        "Server is under maintenance. Please try again later.",
        503,
        "MAINTENANCE"
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
