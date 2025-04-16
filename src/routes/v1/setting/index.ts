import { Router } from "express";
import { setMaintenance } from "../../../controllers/systemController";
import { auth } from "../../../middleware/auth";
import { authorise } from "../../../middleware/authorise";

const router = Router();

router.post("/maintenance", auth, setMaintenance);

export default router;
