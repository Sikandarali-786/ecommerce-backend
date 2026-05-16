import express from "express";
import { createProduct, deleteProduct, getAllProducts, getSingleProduct, updateProduct } from "../controllers/product.controller.js";
import {protect, adminOnly} from "../middleware/auth.middleware.js"

const router = express.Router();
// create admin only 
router.post("/create", protect, adminOnly, createProduct)

// public routes 
router.get("/", getAllProducts);
router.get("/:id", getSingleProduct);

router.put("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

export default router;