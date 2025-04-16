import { Router } from "express";
import authRoutes from "./auth";
import adminRoutes from "./admin";
import userRoutes from "./user";
import { auth } from "../../middleware/auth";
import { authorise } from "../../middleware/authorise";

const router = Router();

router.use("/", authRoutes);
router.use("/admin", auth, authorise(true, "ADMIN"), adminRoutes);
router.use("/user", userRoutes);

export default router;
