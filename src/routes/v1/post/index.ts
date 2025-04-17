import { Router } from "express";
import { createPost } from "../../../controllers/postController";

const router = Router();

router.get("/create", createPost);

export default router;