import express from "express";
import {
    createCategory,
    getAllCategories,
    updateCategory,
    deleteCategory,
} from "../controllers/category.controller.js";
import { upload } from "../utils/upload.js";

import {
    protect,
    adminOnly,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllCategories);
router.post("/create", protect, adminOnly, upload.single('image'), createCategory);
router.put("/:id", protect, adminOnly, upload.single('image'), updateCategory);
router.delete("/:id", protect, adminOnly, deleteCategory);

export default router;