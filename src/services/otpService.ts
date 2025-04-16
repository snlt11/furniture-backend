import { PrismaClient } from "../../generated/prisma";
import { startOfDay, endOfDay } from "date-fns";

const prisma = new PrismaClient();

export const createOtpCode = async (otpCode: any) => {
  const existing = await prisma.otp.findUnique({
    where: { phone: otpCode.phone },
  });

  const isToday =
    existing?.updatedAt &&
    existing.updatedAt >= startOfDay(new Date()) &&
    existing.updatedAt <= endOfDay(new Date());

  return prisma.otp.upsert({
    where: { phone: otpCode.phone },
    update: {
      otp: otpCode.otp,
      rememberToken: otpCode.randToken,
      count: isToday ? { increment: 1 } : 1,
      updatedAt: new Date(),
    },
    create: {
      phone: otpCode.phone,
      otp: otpCode.otp,
      rememberToken: otpCode.randToken,
      count: 1,
    },
  });
};

export const getOtpByPhone = async (phone: string) => {
  return prisma.otp.findUnique({
    where: { phone },
  });
};

export const updateOtp = async (id: number, otpData: any) => {
  return prisma.otp.update({
    where: { id },
    data: otpData,
  });
};
