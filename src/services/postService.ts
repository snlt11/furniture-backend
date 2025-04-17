import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export const createPost = async (postData: any) => {
  return prisma.post.create({
    data: postData,
  });
};
