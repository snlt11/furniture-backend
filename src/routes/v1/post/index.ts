import { Router } from "express";
import {
  createPost,
  deletePost,
  getAllPosts,
  getPostById,
  updatePost,
} from "../../../controllers/postController";
import { auth } from "../../../middleware/auth";
import file from "../../../middleware/file";

const router = Router();

router.post("/create", auth, file.single("image"), createPost);
router.patch("/:id", auth, file.single("image"), updatePost);
router.delete("/:id", auth, deletePost);
router.get("/", getAllPosts);
router.get("/:id", getPostById);

export default router;