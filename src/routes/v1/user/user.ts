import express from "express";
import { changeLanguage } from "../../../controllers/userController";

const router = express.Router();

router.post("/change-language", changeLanguage);
router.get("/test-language", (req, res) => {
  res.json({
    message: req.t("welcome"),
    language: req.language,
    languages: req.languages,
  });
});

export default router;
