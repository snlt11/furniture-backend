import { Request, Response, NextFunction } from "express";
import { getUserById, updateUser } from "../services/userService";
import {
  checkUploadFile,
  checkUserIfNotExist,
  errorMessage,
} from "../utils/auth";
import path from "path";
import { unlink } from "fs/promises";

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
