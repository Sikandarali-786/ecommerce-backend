import express from "express";
import {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
} from "../controllers/wishlist.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All wishlist routes require authentication
router.use(protect);

router.get("/", getWishlist);
router.post("/add", addToWishlist);
router.delete("/remove/:productId", removeFromWishlist);
router.delete("/clear", clearWishlist);

export default router;
