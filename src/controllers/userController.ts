import { Request, Response, NextFunction } from "express";
import { getUserById, updateUser } from "../services/userService";
import {
  checkUploadFile,
  checkUserIfNotExist,
  errorMessage,
} from "../utils/auth";
import path from "path";
import { unlink } from "fs/promises";
import multipleFileQueue from "../jobs/queues/multipleFileQueue";
import fs from "fs/promises";

export const changeLanguage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lang = req.query.lng as string;
    if (!["en", "mm", "zh"].includes(lang)) {
      throw new Error("Invalid language code");
    }
    res.cookie("i18next", lang, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      path: "/",
    });
    res.json({
      message: req.t("language_changed"),
      language: lang,
      data: req.t("welcome"),
    });
  } catch (error) {
    next(error);
  }
};

export const profileUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const image = req.file;
    const user = await getUserById(req.userId!);
    checkUserIfNotExist(user);
    checkUploadFile(image);

    const fileName = image!.filename;

    if (user?.image) {
      try {
        const filePath = path.join(
          process.cwd(),
          "uploads/profile/images",
          user.image
        );
        await unlink(filePath);
      } catch (error) {
        console.log("Error deleting old image:", error);
      }
    }
    await updateUser(user!.id, { image: fileName });

    res.status(200).json({
      message: "Profile picture uploaded successfully",
      image: fileName,
    });
  } catch (error) {
    next(error);
  }
};

export const multipleFilesUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const files = req.files as Express.Multer.File[];
    const user = await getUserById(req.userId!);

    checkUserIfNotExist(user);
    if (!files || files.length === 0)
      throw errorMessage("No files uploaded", 400, "FILES_REQUIRED");

    const fileNames = files.map((file) => file.filename);

    res.status(200).json({
      message: "Multiple files uploaded successfully",
      images: fileNames,
    });
  } catch (error) {
    next(error);
  }
};

export const multipleFilesUploadWithQueue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const files = req.files as Express.Multer.File[];
    const user = await getUserById(req.userId!);
    checkUserIfNotExist(user);

    if (!files?.length) {
      throw errorMessage("No files uploaded", 400, "FILES_REQUIRED");
    }

    const baseDir = process.cwd();
    const uploadDir = path.join(baseDir, "uploads/multiple");
    const optimizeDir = path.join(uploadDir, "optimize");

    await fs.mkdir(optimizeDir, { recursive: true });

    const processedFiles = files.map((file) => ({
      originalPath: path.join(uploadDir, file.filename),
      webpName: `${file.filename.split(".")[0]}.webp`,
    }));

    const jobs = await Promise.all(
      processedFiles.map(({ originalPath, webpName }) =>
        multipleFileQueue.add(
          "optimize-multiple-images",
          {
            filePath: originalPath,
            fileName: webpName,
            width: 200,
            height: 200,
            quality: 50,
            destination: "uploads/multiple/optimize",
            outputPath: webpName,
          },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 },
          }
        )
      )
    );

    res.status(200).json({
      message: "Multiple files uploaded and queued for optimization",
      images: processedFiles.map((f) => f.webpName),
      jobIds: jobs.map((job) => job.id),
    });
  } catch (error) {
    if (req.files?.length) {
      const uploadDir = path.join(process.cwd(), "uploads/multiple");
      await Promise.all(
        (req.files as Express.Multer.File[]).map((file) =>
          unlink(path.join(uploadDir, file.filename)).catch((err) =>
            console.error("Error deleting file:", err)
          )
        )
      );
    }
    next(error);
  }
};


