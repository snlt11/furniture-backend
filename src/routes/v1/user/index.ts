import express from "express";
import { changeLanguage, profileUpload, multipleFilesUpload } from "../../../controllers/userController";
import { auth } from "../../../middleware/auth";
import  file from "../../../middleware/file";

const router = express.Router();

router.patch("/profile/upload", auth, file.single("avatar"), profileUpload);
router.patch("/multiple-files", auth, file.array("files"), multipleFilesUpload);
router.post("/change-language", changeLanguage);
router.get("/test-language", (req, res) => {
  res.json({
    message: req.t("welcome"),
    language: req.language,
    languages: req.languages,
  });
});

export default router;
