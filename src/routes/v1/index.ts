import { Router } from "express";
import authRoutes from "./auth";
import adminRoutes from "./admin";
import userRoutes from "./user";
import settingRoutes from "./setting";
import { auth } from "../../middleware/auth";
import { authorise } from "../../middleware/authorise";
import { maintenance } from "../../middleware/maintenance";

const router = Router();

router.use("/", authRoutes);
router.use("/admin", auth, authorise(true, "ADMIN"), adminRoutes);
router.use("/user", maintenance, userRoutes);
router.use("/setting", auth, authorise(true, "ADMIN"), settingRoutes);

export default router;
