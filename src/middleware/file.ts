import { Request, Response, NextFunction } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs/promises";

const UPLOAD_PATHS = {
  PROFILE: "uploads/profile",
  MULTIPLE: "uploads/multiple",
  MULTIPLE_OPTIMIZE: "uploads/multiple/optimize",
  POSTS: "uploads/posts",
  POSTS_OPTIMIZE: "uploads/posts/optimize",
} as const;

const ALLOWED_MIMETYPES = {
  IMAGES: ["image/png", "image/jpg", "image/jpeg", "image/webp"] as const,
  DOCUMENTS: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ] as const,
} as const;

const FILE_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB

const ensureDirectoryExists = async (directory: string) => {
  try {
    await fs.access(directory);
  } catch {
    await fs.mkdir(directory, { recursive: true });
  }
};

const initializeUploadDirectories = async () => {
  await Promise.all(
    Object.values(UPLOAD_PATHS).map((dir) =>
      ensureDirectoryExists(path.join(process.cwd(), dir))
    )
  );
};

initializeUploadDirectories();

const getUploadPath = (reqPath: string): string => {
  if (reqPath.includes("profile")) return UPLOAD_PATHS.PROFILE;
  if (reqPath.includes("multiple-files")) return UPLOAD_PATHS.MULTIPLE;
  return UPLOAD_PATHS.POSTS;
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = getUploadPath(req.path);
    const fullPath = path.join(process.cwd(), uploadPath);
    await ensureDirectoryExists(fullPath);
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  type AllowedMimeType =
    | (typeof ALLOWED_MIMETYPES.IMAGES)[number]
    | (typeof ALLOWED_MIMETYPES.DOCUMENTS)[number];

  const isAllowedType = [
    ...ALLOWED_MIMETYPES.IMAGES,
    ...ALLOWED_MIMETYPES.DOCUMENTS,
  ].includes(file.mimetype as AllowedMimeType);

  cb(null, isAllowedType);
};

const file = multer({
  storage,
  fileFilter,
  limits: { fileSize: FILE_SIZE_LIMIT },
});

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: FILE_SIZE_LIMIT },
});

export default file;
