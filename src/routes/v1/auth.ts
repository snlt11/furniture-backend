import express from "express";
import {
  register,
  verifyOtp,
  confirmPassword,
  login,
  logout,
  changePassword,
  forgotPassword,
} from "../../controllers/authController";
import { auth } from "../../middleware/auth";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/confirm-password", confirmPassword);
router.post("/login", login);
router.get("/logout", logout);
router.post("/change-password", auth, changePassword);
router.post("/forgot-password", auth, forgotPassword);

export default router;
