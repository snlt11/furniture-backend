import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export const getUserByPhone = async (phone: string) => {
  return prisma.user.findUnique({
    where: { phone },
  });
};

export const getAllUsersInfo = async () => {
  return prisma.user.findMany();
};

export const getUserById = async (id: number) => {
  return prisma.user.findUnique({
    where: { id },
  });
};

export const createUser = async (userData: any) => {
  return prisma.user.create({
    data: userData,
  });
};

export const updateUser = async (id: number, userData: any) => {
  return prisma.user.update({
    where: { id },
    data: userData,
  });
};
