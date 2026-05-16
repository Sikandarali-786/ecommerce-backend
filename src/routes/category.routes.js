import express from "express";
import {
    createCategory,
    getAllCategories,
} from "../controllers/category.controller.js";

import {
    protect,
    adminOnly,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", protect, adminOnly, createCategory);
router.get("/", getAllCategories);

export default router;