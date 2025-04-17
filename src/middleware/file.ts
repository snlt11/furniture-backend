import { Request, Response, NextFunction } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";

const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/profile/images");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueSuffix);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedImageTypes = [
    "image/png",
    "image/jpg",
    "image/jpeg",
    "image/webp",
  ];
  const allowedFileTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  allowedImageTypes.includes(file.mimetype) ||
  allowedFileTypes.includes(file.mimetype)
    ? cb(null, true)
    : cb(null, false);
};

const file = multer({
  storage: fileStorage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 2 }, // 2MB limit
});

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 2 }, // 2MB limit
});

export default file;
