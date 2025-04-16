import { Request, Response, NextFunction } from "express";

export const changeLanguage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lang = req.query.lng as string;
    if (!["en", "mm"].includes(lang)) {
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
      message: "Language changed successfully",
      language: lang,
      data: req.t("welcome"),
    });
  } catch (error) {
    next(error);
  }
};
