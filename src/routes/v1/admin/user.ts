import express from "express";
import { getAllUsers } from "../../../controllers/userController";

const router = express.Router();

router.get("/users", getAllUsers);

export default router;
