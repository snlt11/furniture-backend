import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export type PostArgs = {
  title: string;
  content: string;
  body: string;
  image: string;
  authorId: number;
  category: string;
  type: string;
  tags: string[];
};

export const createPost = async (postData: PostArgs) => {
  return prisma.post.create({
    data: {
      title: postData.title,
      content: postData.content,
      body: postData.body,
      image: postData.image,
      author: {
        connect: { id: postData.authorId },
      },
      category: {
        connectOrCreate: {
          where: { name: postData.category },
          create: { name: postData.category },
        },
      },
      type: {
        connectOrCreate: {
          where: { name: postData.type },
          create: { name: postData.type },
        },
      },
      ...(postData.tags.length > 0 && {
        tags: {
          connectOrCreate: postData.tags.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      }),
    },
    include: {
      author: true,
      category: true,
      type: true,
      tags: true,
    },
  });
};

export const getPostById = async (id: number) => {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: true,
      category: true,
      type: true,
      tags: true,
    },
  });

  if (!post) {
    throw new Error("Post not found");
  }

  return post;
};

export const getAllPosts = async () => {
  return prisma.post.findMany({
    include: {
      author: true,
      category: true,
      type: true,
      tags: true,
    },
  });
};

export const deletePost = async (id: number) => {
  return prisma.post.delete({
    where: { id },
  });
};

export const updatePost = async (id: number, postData: Partial<PostArgs>) => {
  return prisma.post.update({
    where: { id },
    data: {
      ...(postData.title && { title: postData.title }),
      ...(postData.content && { content: postData.content }),
      ...(postData.body && { body: postData.body }),
      ...(postData.image && { image: postData.image }),
      ...(postData.category && {
        category: {
          connectOrCreate: {
            where: { name: postData.category },
            create: { name: postData.category },
          },
        },
      }),
      ...(postData.type && {
        type: {
          connectOrCreate: {
            where: { name: postData.type },
            create: { name: postData.type },
          },
        },
      }),
      ...(postData.tags && {
        tags: {
          set: [],
          connectOrCreate: postData.tags.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      }),
    },
    include: {
      author: true,
      category: true,
      type: true,
      tags: true,
    },
  });
};