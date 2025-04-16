import { PrismaClient } from "../../generated/prisma";
import { getUserByPhone, updateUser } from "./userService";
import { createOtpCode, getOtpByPhone, updateOtp } from "./otpService";

const prisma = new PrismaClient();

export { getUserByPhone, updateUser, createOtpCode, getOtpByPhone, updateOtp };
