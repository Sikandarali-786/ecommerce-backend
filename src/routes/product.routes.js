import express from "express";
import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getSingleProduct,
    updateProduct,
} from "../controllers/product.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";
import { upload } from "../utils/upload.js";

const router = express.Router();

// Admin routes (with image upload — up to 5 images)
router.post("/create", protect, adminOnly, upload.array("images", 5), createProduct);
router.put("/:id", protect, adminOnly, upload.array("images", 5), updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

// Public routes
router.get("/", getAllProducts);
router.get("/:id", getSingleProduct);

export default router;
